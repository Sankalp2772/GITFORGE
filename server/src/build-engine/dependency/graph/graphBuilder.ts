import path from 'path';
import {
  SourceDependencyGraph,
  SourceGraphNode,
  SourceDependencyEdge,
  ScannedFileMetadata,
} from '../../types';
import { DependencyAnalyzerRegistry } from '../analyzers';
import { RepoSnapshotService } from '../../scanner/repoSnapshotService';
import { HashService } from '../../hashing/hashService';

export class SourceDependencyGraphBuilder {
  /**
   * Build complete source dependency graph for a commit snapshot
   * Remember direction: A -> B means A depends on B.
   */
  public static async buildGraph(
    repoPath: string,
    commitSha: string,
    files: string[]
  ): Promise<{ graph: SourceDependencyGraph; metadataMap: Record<string, ScannedFileMetadata> }> {
    const nodes: SourceGraphNode[] = [];
    const edges: SourceDependencyEdge[] = [];
    const unresolved: { file: string; specifier: string; type: any }[] = [];
    const metadataMap: Record<string, ScannedFileMetadata> = {};

    // 1. Read files and extract hashes & metadata
    for (const file of files) {
      const buffer = await RepoSnapshotService.readFileAtCommit(repoPath, commitSha, file);
      const sha256 = HashService.calculateSha256(buffer);
      const language = RepoSnapshotService.detectLanguage(file);
      const isConfig = RepoSnapshotService.isConfigFile(file);
      const contentStr = buffer.toString('utf-8');
      const isEntry = RepoSnapshotService.isEntryPoint(file, contentStr);

      const meta: ScannedFileMetadata = {
        path: file,
        language,
        size: buffer.length,
        sha256,
        isConfiguration: isConfig,
        isSource: !isConfig && language !== 'unknown',
        isEntryPoint: isEntry,
      };

      metadataMap[file] = meta;

      nodes.push({
        id: file,
        path: file,
        language,
        size: buffer.length,
        sha256,
        isEntryPoint: isEntry,
      });

      // 2. Extract dependencies if source file
      if (meta.isSource) {
        const deps = DependencyAnalyzerRegistry.analyzeFile(file, language, contentStr, files);
        for (const dep of deps) {
          if (dep.isResolved && dep.resolvedPath) {
            edges.push({
              source: file,
              target: dep.resolvedPath,
              type: dep.type,
              resolved: true,
              rawSpecifier: dep.rawSpecifier,
            });
          } else {
            unresolved.push({
              file,
              specifier: dep.rawSpecifier,
              type: dep.type,
            });
          }
        }
      }
    }

    // 3. Find isolated files (files with no incoming or outgoing edges)
    const connectedNodes = new Set<string>();
    for (const edge of edges) {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    }

    const isolatedFiles = files.filter((f) => !connectedNodes.has(f));

    return {
      graph: {
        nodes,
        edges,
        unresolvedDependencies: unresolved,
        isolatedFiles,
      },
      metadataMap,
    };
  }
}
