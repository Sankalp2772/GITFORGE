import { execSync, spawn } from 'child_process';
import net from 'net';
import path from 'path';
import fs from 'fs';
import {
  BuildAdapter,
  ProjectKind,
  ProjectDetectionResult,
  EnvironmentValidationResult,
  ToolInstalledStatus,
  ServiceInstalledStatus,
  DependencyCheckResult,
  RunConfiguration,
  AdapterBuildContext,
} from './types';
import { BuildActionNode, BuildPlan, BuildManifest } from '../types';
import { BuildPlannerService } from '../planner/buildPlannerService';

export abstract class BaseBuildAdapter implements BuildAdapter {
  abstract kind: ProjectKind;
  abstract name: string;

  abstract detect(
    files: string[],
    readFile: (path: string) => Promise<string | null>
  ): Promise<ProjectDetectionResult | null>;

  abstract checkDependencies(
    wsDir: string,
    detected: ProjectDetectionResult
  ): Promise<DependencyCheckResult>;

  abstract generateBuildPlan(context: AdapterBuildContext): Promise<BuildPlan>;

  abstract getRunConfigurations(
    wsDir: string,
    detected: ProjectDetectionResult
  ): Promise<RunConfiguration[]>;

  /**
   * Safe TCP check for external services (MySQL, Postgres, Redis, etc.)
   * Does NOT send credentials or log secrets.
   */
  public async probeTcpPort(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let resolved = false;

      socket.setTimeout(timeoutMs);

      socket.on('connect', () => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve(true);
        }
      });

      socket.on('timeout', () => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve(false);
        }
      });

      socket.on('error', () => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve(false);
        }
      });

      socket.connect(port, host);
    });
  }

  /**
   * Check whether a CLI tool is installed and its version
   */
  public checkHostTool(toolName: string, command: string, versionFlag = '--version'): ToolInstalledStatus {
    try {
      let foundPath = '';
      if (path.isAbsolute(command) && fs.existsSync(command)) {
        foundPath = command;
      } else {
        const isWin = process.platform === 'win32';
        const findCmd = isWin ? `where ${command}` : `which ${command}`;
        foundPath = execSync(findCmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 })
          .split('\n')[0]
          .trim();
      }

      // 2. Read version
      let version = '';
      try {
        const vRaw = execSync(`"${foundPath}" ${versionFlag}`, {
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 2500,
        });
        version = vRaw.trim().split('\n')[0];
      } catch (ve: any) {
        // Some tools (like java) output version on stderr
        version = (ve.stderr || ve.stdout || '').toString().trim().split('\n')[0] || 'installed';
      }

      return {
        name: toolName,
        installed: true,
        version: version || 'installed',
        path: foundPath,
        satisfiesMinVersion: true,
      };
    } catch {
      return {
        name: toolName,
        installed: false,
      };
    }
  }

  /**
   * Common environment validator checking tools & services
   */
  public async validateEnvironment(detected: ProjectDetectionResult): Promise<EnvironmentValidationResult> {
    const tools: ToolInstalledStatus[] = [];
    const missingRequired: string[] = [];
    const instructions: string[] = [];

    for (const req of detected.requiredTools) {
      const status = this.checkHostTool(req.name, req.command);
      tools.push(status);
      if (req.required && !status.installed) {
        missingRequired.push(req.name);
        instructions.push(`Install ${req.name} (${req.command}) to build/run ${detected.name}. Purpose: ${req.purpose}`);
      }
    }

    const services: ServiceInstalledStatus[] = [];
    for (const s of detected.requiredServices) {
      const host = s.host || 'localhost';
      const port = s.port || (s.type === 'mysql' ? 3306 : s.type === 'postgres' ? 5432 : 6379);
      const isUp = await this.probeTcpPort(host, port);
      services.push({
        name: s.name,
        available: isUp,
        host,
        port,
        error: isUp ? undefined : `Cannot connect to ${s.name} at ${host}:${port}`,
      });
      if (s.required && !isUp) {
        missingRequired.push(`${s.name} service (: ${port})`);
        instructions.push(`Ensure ${s.name} is started and listening on ${host}:${port}`);
      }
    }

    const valid = missingRequired.length === 0;
    return {
      valid,
      tools,
      services,
      missingRequired,
      warnings: valid ? [] : [`Missing ${missingRequired.length} required dependency or service`],
      instructions,
    };
  }

  /**
   * Standard planner wrapping manifest conversion into DAG with topological order
   */
  protected createPlanFromManifest(
    repositoryId: string,
    commitSha: string,
    manifest: BuildManifest,
    changedFiles: string[],
    affectedFiles: string[]
  ): BuildPlan {
    return BuildPlannerService.createBuildPlan(
      repositoryId,
      commitSha,
      manifest,
      changedFiles,
      affectedFiles
    );
  }
}
