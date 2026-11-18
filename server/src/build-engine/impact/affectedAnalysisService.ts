import path from 'path';
import { SourceDependencyGraph, AffectedAnalysisResult } from '../types';

export class AffectedAnalysisService {
  /**
   * Helper to normalize repository-relative file paths
   * Converts Windows backslashes to forward slashes and trims leading/trailing slashes
   */
  public static normalizePath(p: string): string {
    return p.replace(/\\/g, '/').replace(/^\/+/, '').trim();
  }

  /**
   * Traverse reverse dependencies using BFS
   * Strict Convention:
   *   Edge: source -> target means "source depends on target"
   *   (e.g. main.cpp -> calculator.hpp, calculator.cpp -> calculator.hpp)
   * When target (calculator.hpp) changes, source (main.cpp, calculator.cpp) becomes affected!
   */
  public static calculateAffectedFiles(
    graph: SourceDependencyGraph,
    modifiedFiles: string[],
    addedFiles: string[],
    deletedFiles: string[],
    unchangedFiles: string[]
  ): AffectedAnalysisResult {
    // 1. Normalize all input lists
    const normModified = modifiedFiles.map(this.normalizePath);
    const normAdded = addedFiles.map(this.normalizePath);
    const normDeleted = deletedFiles.map(this.normalizePath);
    const normUnchanged = unchangedFiles.map(this.normalizePath);

    // 2. Build normalized reverse dependency lookup: Target (dependency) -> Sources that depend on Target
    const reverseDeps: Record<string, Set<string>> = {};

    for (const node of graph.nodes) {
      const nId = this.normalizePath(node.id);
      if (!reverseDeps[nId]) {
        reverseDeps[nId] = new Set<string>();
      }
    }

    for (const edge of graph.edges) {
      const src = this.normalizePath(edge.source);
      const tgt = this.normalizePath(edge.target);

      if (!reverseDeps[tgt]) {
        reverseDeps[tgt] = new Set<string>();
      }
      reverseDeps[tgt].add(src);
    }

    // Changed files are the initial trigger set
    const rootChanges = new Set<string>([...normModified, ...normDeleted, ...normAdded]);

    const directlyAffected = new Set<string>();
    const transitivelyAffected = new Set<string>();
    const visitedAll = new Set<string>(rootChanges);
    const dependencyChains: { file: string; chain: string[] }[] = [];

    // 3. Find direct dependents (1-hop away from changed files)
    const bfsQueue: { current: string; chain: string[] }[] = [];

    for (const changedFile of rootChanges) {
      const dependents = reverseDeps[changedFile] ? Array.from(reverseDeps[changedFile]) : [];
      for (const dep of dependents) {
        if (!visitedAll.has(dep)) {
          visitedAll.add(dep);
          directlyAffected.add(dep);
          const chain = [changedFile, dep];
          dependencyChains.push({ file: dep, chain });
          bfsQueue.push({ current: dep, chain });
        }
      }
    }

    // 4. Find transitive dependents (2+ hops away) via BFS
    while (bfsQueue.length > 0) {
      const { current, chain } = bfsQueue.shift()!;
      const dependents = reverseDeps[current] ? Array.from(reverseDeps[current]) : [];

      for (const next of dependents) {
        if (!visitedAll.has(next)) {
          visitedAll.add(next);
          transitivelyAffected.add(next);
          const fullChain = [...chain, next];
          dependencyChains.push({ file: next, chain: fullChain });
          bfsQueue.push({ current: next, chain: fullChain });
        }
      }
    }

    const hasUnresolved = graph.unresolvedDependencies.some((u) => {
      const normU = this.normalizePath(u.file);
      return rootChanges.has(normU) || visitedAll.has(normU);
    });

    const allAffected = new Set<string>([...directlyAffected, ...transitivelyAffected]);

    return {
      modifiedFiles: normModified,
      addedFiles: normAdded,
      deletedFiles: normDeleted,
      unchangedFiles: normUnchanged.filter((f) => !rootChanges.has(f) && !allAffected.has(f)),
      directlyAffectedFiles: Array.from(directlyAffected),
      transitivelyAffectedFiles: Array.from(transitivelyAffected),
      allAffectedFiles: Array.from(allAffected),
      dependencyChains,
      unresolvedImpact: hasUnresolved,
    };
  }
}
