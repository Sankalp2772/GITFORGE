import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { BuildActionNode, BuildJobState, BuildTaskResult } from '../types';
import { BuildCacheService } from '../cache/buildCacheService';
import { HashService } from '../hashing/hashService';
import { RepoSnapshotService } from '../scanner/repoSnapshotService';
import { config } from '../../config';

export class ParallelBuildScheduler {
  private static workspaceRoot = path.resolve(config.gitStorageRoot, '..', 'build-workspaces');
  private static activeJobs: Record<string, { jobState: BuildJobState; cancelRequested: boolean }> = {};

  /**
   * Export immutable snapshot of the Git commit into an isolated build workspace
   */
  public static async prepareWorkspace(
    repoPath: string,
    commitSha: string,
    jobId: string
  ): Promise<string> {
    const wsDir = path.join(this.workspaceRoot, jobId);
    if (!fs.existsSync(wsDir)) {
      fs.mkdirSync(wsDir, { recursive: true });
    }

    const files = await RepoSnapshotService.listFilesAtCommit(repoPath, commitSha);
    for (const f of files) {
      const content = await RepoSnapshotService.readFileAtCommit(repoPath, commitSha, f);
      const dest = path.join(wsDir, f);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, content);
    }

    return wsDir;
  }

  /**
   * Execute build plan with bounded parallel workers (1 to 8 workers)
   */
  public static async executePlan(
    jobId: string,
    repoPath: string,
    commitSha: string,
    actions: BuildActionNode[],
    executionOrder: string[],
    concurrencyLimit: number = 8
  ): Promise<BuildJobState> {
    const limit = Math.max(1, Math.min(8, concurrencyLimit));

    const jobState: BuildJobState = {
      id: jobId,
      repositoryId: repoPath,
      commitSha,
      status: 'RUNNING',
      concurrencyLimit: limit,
      tasks: {},
      totalTasks: actions.filter((a) => a.isAffected).length,
      completedTasks: 0,
      startTime: new Date().toISOString(),
    };

    const jobRef = { jobState, cancelRequested: false };
    this.activeJobs[jobId] = jobRef;

    const actionMap: Record<string, BuildActionNode> = {};
    for (const a of actions) {
      actionMap[a.id] = a;
    }

    const workspaceDir = await this.prepareWorkspace(repoPath, commitSha, jobId);

    // Dependencies tracking
    const inDegree: Record<string, number> = {};
    const dependents: Record<string, string[]> = {};
    const completedTasks = new Set<string>();
    const failedTasks = new Set<string>();

    for (const a of actions) {
      inDegree[a.id] = a.dependencies.length;
      for (const d of a.dependencies) {
        if (!dependents[d]) dependents[d] = [];
        dependents[d].push(a.id);
      }
    }

    // Available worker tokens (1 to 8)
    const availableWorkers = Array.from({ length: limit }, (_, i) => i + 1);
    const readyQueue: string[] = [];

    // Push initial ready tasks
    for (const id of executionOrder) {
      if (inDegree[id] === 0) {
        readyQueue.push(id);
      }
    }

    return new Promise((resolve) => {
      let activeRunningCount = 0;

      const checkFinished = () => {
        if (activeRunningCount === 0 && readyQueue.length === 0) {
          jobState.status = failedTasks.size > 0 ? 'FAILED' : 'SUCCESS';
          jobState.endTime = new Date().toISOString();
          jobState.totalDurationMs =
            new Date(jobState.endTime).getTime() - new Date(jobState.startTime).getTime();
          resolve(jobState);
        }
      };

      const dispatchNext = () => {
        if (jobRef.cancelRequested) {
          jobState.status = 'CANCELLED';
          checkFinished();
          return;
        }

        while (readyQueue.length > 0 && availableWorkers.length > 0) {
          const targetId = readyQueue.shift()!;
          const action = actionMap[targetId];

          if (!action) continue;

          // If prerequisite dependencies failed, block and fail this task
          const hasFailedPrereq = action.dependencies.some((d) => failedTasks.has(d));
          if (hasFailedPrereq) {
            failedTasks.add(targetId);
            jobState.tasks[targetId] = {
              targetId,
              status: 'FAILED',
              workerId: 0,
              command: action.command,
              stdout: '',
              stderr: 'Blocked: One or more prerequisite dependencies failed.',
              exitCode: 1,
              durationMs: 0,
              startTime: new Date().toISOString(),
              endTime: new Date().toISOString(),
            };
            // Propagate to dependents
            for (const next of dependents[targetId] || []) {
              inDegree[next]--;
              if (inDegree[next] === 0) readyQueue.push(next);
            }
            continue;
          }

          // If action is NOT affected, restore from cache or execute fast configuration
          if (!action.isAffected) {
            // If action produces artifacts required by dependents, ensure they are present or run the prerequisite
            const missingOutputs = action.outputs.some((o) => !fs.existsSync(path.join(workspaceDir, o)));
            if (missingOutputs) {
              // Action outputs are needed in this workspace (e.g., cmake_configure generated build files)
              const workerId = availableWorkers.shift()!;
              activeRunningCount++;

              this.executeSingleTask(action, workspaceDir, workerId)
                .then((result) => {
                  jobState.tasks[targetId] = result;
                  jobState.completedTasks++;

                  if (result.status === 'SUCCESS' || result.status === 'CACHED') {
                    completedTasks.add(targetId);
                  } else {
                    failedTasks.add(targetId);
                  }

                  availableWorkers.push(workerId);
                  activeRunningCount--;

                  for (const next of dependents[targetId] || []) {
                    inDegree[next]--;
                    if (inDegree[next] === 0) readyQueue.push(next);
                  }

                  dispatchNext();
                  checkFinished();
                })
                .catch((err) => {
                  failedTasks.add(targetId);
                  availableWorkers.push(workerId);
                  activeRunningCount--;
                  dispatchNext();
                  checkFinished();
                });
              continue;
            }

            completedTasks.add(targetId);
            for (const next of dependents[targetId] || []) {
              inDegree[next]--;
              if (inDegree[next] === 0) readyQueue.push(next);
            }
            continue;
          }

          // Assign worker
          const workerId = availableWorkers.shift()!;
          activeRunningCount++;

          this.executeSingleTask(action, workspaceDir, workerId)
            .then((result) => {
              jobState.tasks[targetId] = result;
              jobState.completedTasks++;

              if (result.status === 'SUCCESS' || result.status === 'CACHED') {
                completedTasks.add(targetId);
              } else {
                failedTasks.add(targetId);
              }

              // Release worker
              availableWorkers.push(workerId);
              activeRunningCount--;

              // Enqueue next ready tasks
              for (const next of dependents[targetId] || []) {
                inDegree[next]--;
                if (inDegree[next] === 0) {
                  readyQueue.push(next);
                }
              }

              dispatchNext();
              checkFinished();
            })
            .catch((err) => {
              failedTasks.add(targetId);
              jobState.tasks[targetId] = {
                targetId,
                status: 'FAILED',
                workerId,
                command: action.command,
                stdout: '',
                stderr: err.message,
                exitCode: 1,
                durationMs: 0,
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString(),
              };

              availableWorkers.push(workerId);
              activeRunningCount--;
              dispatchNext();
              checkFinished();
            });
        }

        checkFinished();
      };

      dispatchNext();
    });
  }

  /**
   * Execute single build target action
   */
  private static async executeSingleTask(
    action: BuildActionNode,
    workspaceDir: string,
    workerId: number
  ): Promise<BuildTaskResult> {
    const startTime = new Date().toISOString();
    const startMs = Date.now();

    // 1. Calculate Cache Key
    const inputHashes: Record<string, string> = {};
    for (const inp of action.inputs) {
      const full = path.join(workspaceDir, inp);
      if (fs.existsSync(full)) {
        inputHashes[inp] = HashService.calculateSha256(fs.readFileSync(full));
      }
    }

    const cacheKey = HashService.calculateActionCacheKey({
      command: action.command,
      args: action.args,
      inputHashes,
      dependencyOutputHashes: {},
    });

    // 2. Check Cache Hit (Do not restore cached CMake build directory across different isolated job workspaces,
    // because CMakeCache.txt hardcodes the absolute directory path of the workspace where it was created)
    const isCMakeConfigure = action.id === 'cmake_configure' || action.command.includes('cmake');
    if (!isCMakeConfigure && BuildCacheService.has(cacheKey)) {
      const restored = BuildCacheService.restore(cacheKey, workspaceDir);
      if (restored) {
        return {
          targetId: action.id,
          status: 'CACHED',
          workerId,
          command: `${action.command} ${action.args.join(' ')}`,
          stdout: `[Build Engine Cache] Reused cached output for target "${action.id}"`,
          stderr: '',
          exitCode: 0,
          durationMs: Date.now() - startMs,
          startTime,
          endTime: new Date().toISOString(),
          cacheKey,
        };
      }
    }

    // 3. Ensure destination directories exist
    for (const out of action.outputs) {
      const fullOut = path.join(workspaceDir, out);
      fs.mkdirSync(path.dirname(fullOut), { recursive: true });
    }

    // Resolve command executable path gracefully across systems
    let cmd = action.command;
    if (process.platform === 'win32') {
      const toolsDir = path.resolve(config.gitStorageRoot, '..', '..', 'tools');
      const localCmake = path.join(toolsDir, 'cmake', 'bin', 'cmake.exe');
      const localNinja = path.join(toolsDir, 'cmake', 'bin', 'ninja.exe');
      const localGpp = 'C:\\MinGW\\bin\\g++.exe';

      if (!fs.existsSync(cmd)) {
        if (/g\+\+(\.exe)?$/i.test(cmd) && fs.existsSync(localGpp)) {
          cmd = localGpp;
        } else if (/cmake(\.exe)?$/i.test(cmd) && fs.existsSync(localCmake)) {
          cmd = localCmake;
        } else if (/ninja(\.exe)?$/i.test(cmd) && fs.existsSync(localNinja)) {
          cmd = localNinja;
        }
      }
    }

    // Clean stale CMake cache from other machines only before configuring
    if (action.id === 'cmake_configure') {
      const staleCache = path.join(workspaceDir, 'build', 'CMakeCache.txt');
      if (fs.existsSync(staleCache)) {
        try {
          fs.rmSync(path.join(workspaceDir, 'build'), { recursive: true, force: true });
        } catch (e) {}
      }
    }

    // 4. Execute compiler process with argument arrays (safe child process)
    return new Promise((resolve) => {
      const child = spawn(cmd, action.args, {
        cwd: workspaceDir,
        windowsHide: true,
        env: process.env,
      });

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      child.stdout.on('data', (d) => stdoutChunks.push(Buffer.from(d)));
      child.stderr.on('data', (d) => stderrChunks.push(Buffer.from(d)));

      child.on('close', (code) => {
        const stdout = Buffer.concat(stdoutChunks).toString('utf-8');
        const stderr = Buffer.concat(stderrChunks).toString('utf-8');
        const durationMs = Date.now() - startMs;
        const endTime = new Date().toISOString();

        if (code === 0) {
          // Put in cache
          BuildCacheService.put(cacheKey, workspaceDir, action.outputs);
          resolve({
            targetId: action.id,
            status: 'SUCCESS',
            workerId,
            command: `${action.command} ${action.args.join(' ')}`,
            stdout,
            stderr,
            exitCode: 0,
            durationMs,
            startTime,
            endTime,
            cacheKey,
          });
        } else {
          resolve({
            targetId: action.id,
            status: 'FAILED',
            workerId,
            command: `${action.command} ${action.args.join(' ')}`,
            stdout,
            stderr: stderr || `Process failed with exit code ${code}`,
            exitCode: code || 1,
            durationMs,
            startTime,
            endTime,
          });
        }
      });

      child.on('error', (err) => {
        resolve({
          targetId: action.id,
          status: 'FAILED',
          workerId,
          command: `${action.command} ${action.args.join(' ')}`,
          stdout: '',
          stderr: `Failed to spawn process: ${err.message}`,
          exitCode: 1,
          durationMs: Date.now() - startMs,
          startTime,
          endTime: new Date().toISOString(),
        });
      });
    });
  }

  public static cancelJob(jobId: string): boolean {
    if (this.activeJobs[jobId]) {
      this.activeJobs[jobId].cancelRequested = true;
      return true;
    }
    return false;
  }

  public static getJob(jobId: string): BuildJobState | undefined {
    return this.activeJobs[jobId]?.jobState;
  }
}
