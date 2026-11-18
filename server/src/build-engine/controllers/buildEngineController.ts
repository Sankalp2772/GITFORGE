import { Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { AuthRequest } from '../../middleware/auth';
import { RepoSnapshotService } from '../scanner/repoSnapshotService';
import { SourceDependencyGraphBuilder } from '../dependency/graph/graphBuilder';
import { ChangeDetectionService } from '../detection/changeDetectionService';
import { AffectedAnalysisService } from '../impact/affectedAnalysisService';
import { ManifestParser } from '../manifest/manifestParser';
import { BuildPlannerService } from '../planner/buildPlannerService';
import { ParallelBuildScheduler } from '../scheduler/parallelBuildScheduler';
import { LocalRunManager } from '../runner/localRunManager';
import { BuildCacheService } from '../cache/buildCacheService';
import { ScannedFileMetadata, BuildManifest } from '../types';
import { AdapterRegistry } from '../adapters/adapterRegistry';

// In-memory runtime stores for scans, baselines, and plans
const scanStore: Record<
  string,
  {
    scanId: string;
    repositoryId: string;
    commitSha: string;
    branch: string;
    files: string[];
    metadataMap: Record<string, ScannedFileMetadata>;
    graph: any;
    timestamp: string;
  }
> = {};

const planStore: Record<string, any> = {};
const buildHistory: any[] = [];

export class BuildEngineController {
  /**
   * List connected GitForge repositories for the Build Engine
   */
  public static async getRepositories(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user?.id;
      const repos = await prisma.repository.findMany({
        where: currentUserId
          ? {
              OR: [
                { ownerId: currentUserId },
                { members: { some: { userId: currentUserId } } },
              ],
            }
          : { visibility: 'PUBLIC' },
        include: {
          owner: { select: { id: true, username: true, avatar: true } },
          branches: true,
        },
        orderBy: { updatedAt: 'desc' },
      });

      const enriched = repos.map((r) => {
        const repoScans = Object.values(scanStore).filter((s) => s.repositoryId === r.id);
        const latestScan = repoScans[repoScans.length - 1];
        return {
          ...r,
          scanCount: repoScans.length,
          lastScannedCommit: latestScan?.commitSha,
          lastScanTime: latestScan?.timestamp,
        };
      });

      res.json({ repositories: enriched });
    } catch (err) {
      next(err);
    }
  }

  /**
   * SCAN REPOSITORY: Reads entire snapshot at exact commit and extracts metadata & dependency graph
   */
  public static async scanRepository(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const repoId = req.params.id as string;
      const { branch, commitSha } = req.body;

      const repo = await prisma.repository.findUnique({
        where: { id: repoId },
        include: { owner: true },
      });

      if (!repo) {
        res.status(404).json({ error: 'Repository not found' });
        return;
      }

      const targetBranch = branch || repo.defaultBranch || 'main';
      const rawTargetCommit = commitSha || targetBranch;
      const targetCommit = await RepoSnapshotService.resolveCommitSha(repo.storagePath, rawTargetCommit);

      // 1. List files at commit
      const files = await RepoSnapshotService.listFilesAtCommit(repo.storagePath, targetCommit);

      // 2. Build graph & calculate SHA-256 baseline
      const { graph, metadataMap } = await SourceDependencyGraphBuilder.buildGraph(
        repo.storagePath,
        targetCommit,
        files
      );

      const scanId = `scan_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const scanRecord = {
        scanId,
        repositoryId: repo.id,
        commitSha: targetCommit,
        branch: targetBranch,
        files,
        metadataMap,
        graph,
        timestamp: new Date().toISOString(),
      };

      scanStore[scanId] = scanRecord;

      res.status(201).json({
        message: 'Repository scanned successfully',
        scan: {
          scanId,
          repositoryId: repo.id,
          commitSha: targetCommit,
          branch: targetBranch,
          fileCount: files.length,
          isolatedFilesCount: graph.isolatedFiles.length,
          unresolvedCount: graph.unresolvedDependencies.length,
          timestamp: scanRecord.timestamp,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get scan details & dependency graph
   */
  public static async getScanGraph(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const scanId = req.params.scanId as string;
      const scan = scanStore[scanId];

      if (!scan) {
        res.status(404).json({ error: 'Scan record not found' });
        return;
      }

      res.json({
        scanId,
        commitSha: scan.commitSha,
        graph: scan.graph,
        metadataMap: scan.metadataMap,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get the most recent scan for a repository (or auto-scan if none exists)
   */
  public static async getLatestScanForRepo(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const repoId = req.params.id as string;
      const { branch } = req.query;

      const repo = await prisma.repository.findUnique({ where: { id: repoId } });
      if (!repo) {
        res.status(404).json({ error: 'Repository not found' });
        return;
      }

      const targetBranch = (branch as string) || repo.defaultBranch || 'main';
      const currentCommit = await RepoSnapshotService.resolveCommitSha(repo.storagePath, targetBranch);

      // Find newest matching scan in memory
      const matchingScans = Object.values(scanStore)
        .filter((s) => s.repositoryId === repoId && (s.branch === targetBranch || s.commitSha === targetBranch || s.commitSha === currentCommit))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // If a scan already exists for an older baseline, prefer that baseline so change detection has a baseline to diff against
      if (matchingScans.length > 0) {
        // If the newest scan is for an older commit, it's the perfect baseline
        // If the newest scan is already for the current commit, pick the previous scan if available
        const olderBaseline = matchingScans.find((s) => s.commitSha !== currentCommit);
        const baseline = olderBaseline || matchingScans[0];

        res.json({
          scanId: baseline.scanId,
          commitSha: baseline.commitSha,
          graph: baseline.graph,
          metadataMap: baseline.metadataMap,
        });
        return;
      }

      // No prior scan exists: automatically perform an initial snapshot scan of parent commit if available, else current commit
      let baselineRef = currentCommit;
      try {
        const parentCommit = await RepoSnapshotService.resolveCommitSha(repo.storagePath, `${currentCommit}^`);
        if (parentCommit && parentCommit !== `${currentCommit}^`) {
          baselineRef = parentCommit;
        }
      } catch {}

      const files = await RepoSnapshotService.listFilesAtCommit(repo.storagePath, baselineRef);
      const { graph, metadataMap } = await SourceDependencyGraphBuilder.buildGraph(
        repo.storagePath,
        baselineRef,
        files
      );

      const scanId = `scan_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const scanRecord = {
        scanId,
        repositoryId: repo.id,
        commitSha: baselineRef,
        branch: targetBranch,
        files,
        metadataMap,
        graph,
        timestamp: new Date().toISOString(),
      };
      scanStore[scanId] = scanRecord;

      res.json({
        scanId,
        commitSha: scanRecord.commitSha,
        graph: scanRecord.graph,
        metadataMap: scanRecord.metadataMap,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DETECT CHANGES: Compares previous scan baseline to new commit
   */
  public static async detectChanges(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const repoId = req.params.id as string;
      const { baseScanId, targetCommitSha, branch } = req.body;

      const repo = await prisma.repository.findUnique({ where: { id: repoId } });
      if (!repo) {
        res.status(404).json({ error: 'Repository not found' });
        return;
      }

      let baseScan = scanStore[baseScanId];
      
      const rawTargetRef = targetCommitSha || branch || repo.defaultBranch || 'main';
      const targetRef = await RepoSnapshotService.resolveCommitSha(repo.storagePath, rawTargetRef);

      // If no valid baseScan provided OR baseScan has the exact same commit SHA as targetRef,
      // dynamically construct a baseline snapshot of the parent commit (targetRef^) so diffing works automatically
      if (!baseScan || baseScan.commitSha === targetRef) {
        try {
          const parentCommit = await RepoSnapshotService.resolveCommitSha(repo.storagePath, `${targetRef}^`);
          if (parentCommit && parentCommit !== `${targetRef}^`) {
            const parentFiles = await RepoSnapshotService.listFilesAtCommit(repo.storagePath, parentCommit);
            const { metadataMap: parentMeta, graph: parentGraph } = await SourceDependencyGraphBuilder.buildGraph(
              repo.storagePath,
              parentCommit,
              parentFiles
            );
            const autoScanId = `scan_auto_${parentCommit.substring(0, 7)}_${Date.now()}`;
            baseScan = {
              scanId: autoScanId,
              repositoryId: repo.id,
              commitSha: parentCommit,
              branch: branch || repo.defaultBranch || 'main',
              files: parentFiles,
              metadataMap: parentMeta,
              graph: parentGraph,
              timestamp: new Date().toISOString(),
            };
            scanStore[autoScanId] = baseScan;
          }
        } catch (e) {
          console.warn('[detectChanges] Could not resolve parent commit for auto-baseline:', e);
        }
      }

      if (!baseScan) {
        res.status(400).json({ error: 'Valid baseScanId is required to detect changes' });
        return;
      }
      const newFiles = await RepoSnapshotService.listFilesAtCommit(repo.storagePath, targetRef);
      const { metadataMap: newMetadata, graph: newGraph } = await SourceDependencyGraphBuilder.buildGraph(
        repo.storagePath,
        targetRef,
        newFiles
      );

      const changeResult = ChangeDetectionService.detectChanges(baseScan.metadataMap, newMetadata);
      const affectedResult = AffectedAnalysisService.calculateAffectedFiles(
        newGraph,
        changeResult.modified,
        changeResult.added,
        changeResult.deleted,
        changeResult.unchanged
      );

      const changeId = `change_${Date.now()}`;

      res.json({
        changeId,
        repositoryId: repo.id,
        baseCommit: baseScan.commitSha,
        targetCommit: targetRef,
        changes: changeResult.changes,
        summary: {
          modified: changeResult.modified.length,
          added: changeResult.added.length,
          deleted: changeResult.deleted.length,
          unchanged: changeResult.unchanged.length,
        },
        affected: affectedResult,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PROJECT DETECTION & ENVIRONMENT VALIDATION:
   * Evidence-based detection of project type, build system, required tools & services
   */
  public static async detectProject(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const repoId = req.params.id as string;
      const { commitSha } = req.query;

      const repo = await prisma.repository.findUnique({ where: { id: repoId } });
      if (!repo) {
        res.status(404).json({ error: 'Repository not found' });
        return;
      }

      const targetRef = (commitSha as string) || repo.defaultBranch;
      const files = await RepoSnapshotService.listFilesAtCommit(repo.storagePath, targetRef);

      const readFileHelper = async (relPath: string): Promise<string | null> => {
        try {
          const buf = await RepoSnapshotService.readFileAtCommit(repo.storagePath, targetRef, relPath);
          return buf.toString('utf-8');
        } catch {
          return null;
        }
      };

      const detectedMatch = await AdapterRegistry.detectProject(files, readFileHelper);
      if (!detectedMatch) {
        res.json({
          detected: false,
          message: 'Could not automatically identify project type with high confidence. Please select type manually.',
          availableAdapters: AdapterRegistry.getAllAdapters().map(a => ({ kind: a.kind, name: a.name })),
        });
        return;
      }

      const { adapter, detection } = detectedMatch;
      const environment = await adapter.validateEnvironment(detection);
      const dependencies = await adapter.checkDependencies(repo.storagePath, detection);
      const runConfigurations = await adapter.getRunConfigurations(repo.storagePath, detection);

      res.json({
        detected: true,
        project: detection,
        environment,
        dependencies,
        runConfigurations,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * BUILD PLANNER: Parse manifest, calculate DAG & execution order
   */
  public static async createPlan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const repoId = req.params.id as string;
      const { commitSha, changedFiles, affectedFiles } = req.body;

      const repo = await prisma.repository.findUnique({ where: { id: repoId } });
      if (!repo) {
        res.status(404).json({ error: 'Repository not found' });
        return;
      }

      const rawTargetRef = commitSha || repo.defaultBranch || 'main';
      const targetRef = await RepoSnapshotService.resolveCommitSha(repo.storagePath, rawTargetRef);

      // 1. Check if user provided an explicit build.manifest.json in repo
      let manifest: BuildManifest | undefined;
      let manifestStr = '';
      try {
        const buf = await RepoSnapshotService.readFileAtCommit(repo.storagePath, targetRef, 'build.manifest.json');
        manifestStr = buf.toString('utf-8');
        const parsed = ManifestParser.parseAndValidate(manifestStr);
        if (parsed.errors.length === 0) {
          manifest = parsed.manifest;
        }
      } catch {
        // No handwritten manifest, fallback to project detection adapter
      }

      let plan;
      if (manifest && manifest.targets.length > 0) {
        plan = BuildPlannerService.createBuildPlan(
          repo.id,
          targetRef,
          manifest,
          changedFiles || [],
          affectedFiles || []
        );
        planStore[plan.id] = { plan, manifest, repoPath: repo.storagePath };
      } else {
        // 2. Use Adapter-based DAG generation
        const files = await RepoSnapshotService.listFilesAtCommit(repo.storagePath, targetRef);
        const readFileHelper = async (relPath: string): Promise<string | null> => {
          try {
            const buf = await RepoSnapshotService.readFileAtCommit(repo.storagePath, targetRef, relPath);
            return buf.toString('utf-8');
          } catch {
            return null;
          }
        };

        const detectedMatch = await AdapterRegistry.detectProject(files, readFileHelper);
        if (!detectedMatch) {
          res.status(400).json({
            error: 'Cannot generate build plan: no build.manifest.json found and project type could not be detected.',
          });
          return;
        }

        const { adapter, detection } = detectedMatch;
        plan = await adapter.generateBuildPlan({
          repositoryId: repo.id,
          repoPath: repo.storagePath,
          commitSha: targetRef,
          changedFiles: changedFiles || [],
          affectedFiles: affectedFiles || [],
          detection,
          files,
        } as any);

        planStore[plan.id] = {
          plan,
          manifest: { version: 1, targets: plan.actions as any, runTarget: detection.entryPoint },
          repoPath: repo.storagePath,
          adapterKind: adapter.kind,
        };
      }

      res.status(201).json({ plan });
    } catch (err) {
      next(err);
    }
  }

  /**
   * BUILD EXECUTION: Executes build plan in bounded parallel workers
   */
  public static async executePlan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const planId = req.params.id as string;
      const { concurrencyLimit } = req.body;

      const planEntry = planStore[planId];
      if (!planEntry) {
        res.status(404).json({ error: 'Build plan not found' });
        return;
      }

      const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Execute build plan in parallel
      const jobResult = await ParallelBuildScheduler.executePlan(
        jobId,
        planEntry.repoPath,
        planEntry.plan.commitSha,
        planEntry.plan.actions,
        planEntry.plan.executionOrder,
        concurrencyLimit || 8
      );

      buildHistory.unshift({
        ...jobResult,
        planId,
        runTarget: planEntry.manifest.runTarget,
      });

      res.json({ message: 'Build finished', job: jobResult });
    } catch (err) {
      next(err);
    }
  }

  /**
  * DETECT SERVICES: Scan workspace for runnable components (backend, frontend, binary)
  */
  public static async getServices(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const jobId = req.params.jobId as string;
      const services = LocalRunManager.detectServices(jobId);
      const activeSessions = LocalRunManager.getSessionsForJob(jobId);
      res.json({ services, activeSessions });
    } catch (err) {
      next(err);
    }
  }

  /**
   * RUN APPLICATION: Execute application binary locally
   */
  public static async runApplication(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const jobId = req.params.jobId as string;
      const { executablePath, args, serviceId, port } = req.body;

      const session = await LocalRunManager.runApplication(
        jobId,
        jobId,
        executablePath,
        args || [],
        serviceId,
        port ? parseInt(port, 10) : undefined
      );

      res.status(201).json({ session });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to launch application' });
    }
  }

  /**
   * INSTALL DEPENDENCIES: Execute npm/dependency install inside isolated workspace on demand
   */
  public static async installDependencies(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const jobId = req.params.jobId as string;
      const { subDir } = req.body;

      const result = await LocalRunManager.installDependencies(jobId, subDir || '');
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Dependency installation failed' });
    }
  }

  /**
   * Send stdin input to a running application session
   */
  public static async sendSessionInput(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.sessionId as string;
      const { input } = req.body;

      if (typeof input !== 'string') {
        res.status(400).json({ error: 'Input must be a string' });
        return;
      }

      const success = LocalRunManager.sendInput(sessionId, input);
      if (success) {
        res.json({ success: true, message: 'Input delivered' });
      } else {
        res.status(400).json({ error: 'Cannot send input: process is not running' });
      }
    } catch (err) {
      next(err);
    }
  }

  /**
   * Stop running application
   */
  public static async stopApplication(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.sessionId as string;
      const stopped = LocalRunManager.stopSession(sessionId);
      if (stopped) {
        res.json({ message: 'Application process stopped' });
      } else {
        res.status(404).json({ error: 'Session not found or already stopped' });
      }
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get build engine cache metrics
   */
  public static async getCacheMetrics(_req: AuthRequest, res: Response): Promise<void> {
    const metrics = BuildCacheService.getMetrics();
    res.json(metrics);
  }

  /**
   * Clear build cache
   */
  public static async clearCache(_req: AuthRequest, res: Response): Promise<void> {
    BuildCacheService.clear();
    res.json({ message: 'Build cache cleared successfully' });
  }

  /**
   * Get status & logs of a running application session
   */
  public static async getRunSession(req: AuthRequest, res: Response): Promise<void> {
    const sessionId = req.params.sessionId as string;
    const session = LocalRunManager.getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json({ session });
  }

  /**
   * Get overall build history
   */
  public static async getBuildHistory(_req: AuthRequest, res: Response): Promise<void> {
    res.json({ history: buildHistory, builds: buildHistory });
  }
}
