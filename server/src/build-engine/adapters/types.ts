import { BuildActionNode, BuildPlan, BuildManifest } from '../types';

export type ProjectKind =
  | 'cpp'
  | 'python'
  | 'java'
  | 'nodejs'
  | 'react_vite'
  | 'typescript'
  | 'php'
  | 'dotnet'
  | 'go'
  | 'rust'
  | 'static_web'
  | 'fullstack'
  | 'unknown';

export interface ToolRequirement {
  name: string;
  command: string;
  minVersion?: string;
  required: boolean;
  purpose: string;
}

export interface ExternalServiceRequirement {
  name: string;
  type: 'mysql' | 'postgres' | 'redis' | 'mongodb' | 'other';
  host?: string;
  port?: number;
  database?: string;
  required: boolean;
  detectedFrom?: string;
}

export interface ProjectDetectionResult {
  kind: ProjectKind;
  name: string;
  confidence: number; // 0 to 1
  description: string;
  primaryLanguage: string;
  frameworks: string[];
  buildSystem: string;
  rootPath: string; // relative to repo root, e.g. "" or "backend"
  manifestFile?: string; // e.g. "package.json", "CMakeLists.txt", "pom.xml"
  components?: ProjectDetectionResult[]; // For full-stack: frontend, backend, db
  availableScripts?: Record<string, string>; // e.g. npm scripts
  entryPoint?: string; // e.g. "server.js", "main.py", "src/main.cpp"
  evidence: string[]; // reasons why this project was detected
  requiredTools: ToolRequirement[];
  requiredServices: ExternalServiceRequirement[];
}

export interface ToolInstalledStatus {
  name: string;
  installed: boolean;
  version?: string;
  path?: string;
  satisfiesMinVersion?: boolean;
}

export interface ServiceInstalledStatus {
  name: string;
  available: boolean;
  host: string;
  port: number;
  error?: string;
}

export interface EnvironmentValidationResult {
  valid: boolean;
  tools: ToolInstalledStatus[];
  services: ServiceInstalledStatus[];
  missingRequired: string[];
  warnings: string[];
  instructions: string[];
}

export interface DependencyCheckResult {
  installed: boolean;
  lockFileFound: boolean;
  missingPackages?: string[];
  suggestedInstallCommand?: {
    command: string;
    args: string[];
  };
}

export interface RunConfiguration {
  id: string;
  name: string;
  type: 'backend' | 'frontend' | 'binary' | 'script' | 'web';
  command: string;
  args: string[];
  cwd?: string;
  defaultPort?: number;
  env?: Record<string, string>;
  description: string;
  dependsOn?: string[]; // e.g. ["database", "backend"] for startup ordering
}

export interface AdapterBuildContext {
  repositoryId: string;
  repoPath: string;
  commitSha: string;
  changedFiles: string[];
  affectedFiles: string[];
  detection: ProjectDetectionResult;
  existingManifest?: BuildManifest;
}

export interface BuildAdapter {
  kind: ProjectKind;
  name: string;

  /**
   * Evidence-based detection
   */
  detect(
    files: string[],
    readFile: (path: string) => Promise<string | null>
  ): Promise<ProjectDetectionResult | null>;

  /**
   * Validate required host tools & external services
   */
  validateEnvironment(detected: ProjectDetectionResult): Promise<EnvironmentValidationResult>;

  /**
   * Check if project dependencies (npm, pip, maven, etc.) are installed
   */
  checkDependencies(wsDir: string, detected: ProjectDetectionResult): Promise<DependencyCheckResult>;

  /**
   * Generate Build Plan (DAG, topological sort, parallel batches, cache keys)
   */
  generateBuildPlan(context: AdapterBuildContext): Promise<BuildPlan>;

  /**
   * Get runnable configurations for the Run Manager
   */
  getRunConfigurations(wsDir: string, detected: ProjectDetectionResult): Promise<RunConfiguration[]>;
}
