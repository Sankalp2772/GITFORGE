export type SupportedLanguage =
  | 'c'
  | 'cpp'
  | 'java'
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'react'
  | 'html'
  | 'css'
  | 'unknown';

export type DependencyType =
  | 'INCLUDE'
  | 'IMPORT'
  | 'MODULE'
  | 'HEADER'
  | 'CONFIGURATION'
  | 'ASSET'
  | 'BUILD_INPUT';

export interface ScannedFileMetadata {
  path: string;
  language: SupportedLanguage;
  size: number;
  sha256: string;
  isConfiguration: boolean;
  isSource: boolean;
  isEntryPoint: boolean;
}

export interface SourceDependencyEdge {
  source: string; // File that depends on target (A -> B means A depends on B)
  target: string; // The prerequisite dependency
  type: DependencyType;
  resolved: boolean;
  rawSpecifier: string;
}

export interface SourceGraphNode {
  id: string; // relative path
  path: string;
  language: SupportedLanguage;
  size: number;
  sha256: string;
  isEntryPoint: boolean;
}

export interface SourceDependencyGraph {
  nodes: SourceGraphNode[];
  edges: SourceDependencyEdge[];
  unresolvedDependencies: { file: string; specifier: string; type: DependencyType }[];
  isolatedFiles: string[];
}

export interface FileChangeRecord {
  path: string;
  status: 'ADDED' | 'MODIFIED' | 'DELETED' | 'UNCHANGED';
  oldHash?: string;
  newHash?: string;
  oldSize?: number;
  newSize?: number;
}

export interface AffectedAnalysisResult {
  modifiedFiles: string[];
  addedFiles: string[];
  deletedFiles: string[];
  unchangedFiles: string[];
  directlyAffectedFiles: string[];
  transitivelyAffectedFiles: string[];
  allAffectedFiles: string[];
  dependencyChains: { file: string; chain: string[] }[];
  unresolvedImpact: boolean;
}

export interface BuildTargetConfig {
  name: string;
  type: 'object' | 'executable' | 'library' | 'bundle' | 'test';
  inputs: string[];
  outputs: string[];
  command: string;
  args: string[];
  dependencies: string[];
  environment?: Record<string, string>;
}

export interface BuildManifest {
  version: number;
  runTarget?: string;
  targets: BuildTargetConfig[];
}

export interface BuildActionNode {
  id: string; // target name
  name: string;
  type: string;
  command: string;
  args: string[];
  inputs: string[];
  outputs: string[];
  dependencies: string[]; // dependent target IDs
  isAffected: boolean;
  cacheHit: boolean;
  cacheKey?: string;
}

export interface BuildPlan {
  id: string;
  repositoryId: string;
  commitSha: string;
  actions: BuildActionNode[];
  executionOrder: string[]; // topologically sorted
  independentBatches: string[][];
  hasCycle: boolean;
  cycleNodes?: string[];
  affectedTargetCount: number;
  totalTargetCount: number;
  createdAt: string;
}

export interface BuildTaskResult {
  targetId: string;
  status: 'SUCCESS' | 'FAILED' | 'CACHED' | 'CANCELLED';
  workerId: number;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  startTime: string;
  endTime: string;
  cacheKey?: string;
}

export interface BuildJobState {
  id: string;
  repositoryId: string;
  commitSha: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  concurrencyLimit: number;
  tasks: Record<string, BuildTaskResult>;
  totalTasks: number;
  completedTasks: number;
  startTime: string;
  endTime?: string;
  totalDurationMs?: number;
}

export interface RunSessionState {
  id: string;
  buildJobId: string;
  repositoryId: string;
  serviceId?: string;
  serviceName?: string;
  executablePath: string;
  status: 'RUNNING' | 'STOPPED' | 'FAILED';
  pid?: number;
  port?: number;
  url?: string;
  logs: string[];
  exitCode?: number;
  startTime: string;
  endTime?: string;
}
