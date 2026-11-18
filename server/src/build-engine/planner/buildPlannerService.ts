import { BuildManifest, BuildActionNode, BuildPlan } from '../types';

export class BuildPlannerService {
  /**
   * Detect cycles and calculate topological sort using Kahn's algorithm
   */
  public static topologicalSort(targets: { name: string; dependencies: string[] }[]): {
    sortedOrder: string[];
    hasCycle: boolean;
    cycleNodes?: string[];
  } {
    const inDegree: Record<string, number> = {};
    const adjList: Record<string, string[]> = {};

    for (const t of targets) {
      inDegree[t.name] = 0;
      adjList[t.name] = [];
    }

    // Edge: dep -> t (dep must execute BEFORE t)
    for (const t of targets) {
      for (const dep of t.dependencies) {
        if (adjList[dep]) {
          adjList[dep].push(t.name);
          inDegree[t.name] = (inDegree[t.name] || 0) + 1;
        }
      }
    }

    const queue: string[] = [];
    for (const name of Object.keys(inDegree)) {
      if (inDegree[name] === 0) {
        queue.push(name);
      }
    }

    const sortedOrder: string[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      sortedOrder.push(u);

      for (const v of adjList[u] || []) {
        inDegree[v]--;
        if (inDegree[v] === 0) {
          queue.push(v);
        }
      }
    }

    const hasCycle = sortedOrder.length !== targets.length;
    let cycleNodes: string[] | undefined;
    if (hasCycle) {
      cycleNodes = Object.keys(inDegree).filter((k) => inDegree[k] > 0);
    }

    return { sortedOrder, hasCycle, cycleNodes };
  }

  /**
   * Group sorted actions into independent parallel batches
   */
  public static calculateParallelBatches(
    sortedOrder: string[],
    dependenciesMap: Record<string, string[]>
  ): string[][] {
    const batches: string[][] = [];
    const completed = new Set<string>();
    const remaining = [...sortedOrder];

    while (remaining.length > 0) {
      const currentBatch: string[] = [];
      const nextRemaining: string[] = [];

      for (const target of remaining) {
        const deps = dependenciesMap[target] || [];
        const allDepsSatisfied = deps.every((d) => completed.has(d));

        if (allDepsSatisfied) {
          currentBatch.push(target);
        } else {
          nextRemaining.push(target);
        }
      }

      if (currentBatch.length === 0) {
        // Break in case of an unforeseen dependency deadlock
        batches.push(nextRemaining);
        break;
      }

      for (const b of currentBatch) {
        completed.add(b);
      }
      batches.push(currentBatch);
      remaining.length = 0;
      remaining.push(...nextRemaining);
    }

    return batches;
  }

  /**
   * Build complete execution plan mapping affected files to targets
   */
  public static createBuildPlan(
    repositoryId: string,
    commitSha: string,
    manifest: BuildManifest,
    changedFiles: string[],
    affectedFiles: string[]
  ): BuildPlan {
    const allTriggerFiles = new Set([...changedFiles, ...affectedFiles]);

    const { sortedOrder, hasCycle, cycleNodes } = this.topologicalSort(manifest.targets);

    const depMap: Record<string, string[]> = {};
    for (const t of manifest.targets) {
      depMap[t.name] = t.dependencies;
    }

    // Step 1: Identify targets whose direct inputs changed
    const directlyAffectedTargets = new Set<string>();
    for (const t of manifest.targets) {
      const touchesInput = t.inputs.some((inp) => allTriggerFiles.has(inp));
      if (touchesInput) {
        directlyAffectedTargets.add(t.name);
      }
    }

    // Step 2: Propagate impact downstream (if target A compiles and changes, targets that depend on A must also rebuild)
    const allAffectedTargets = new Set<string>(directlyAffectedTargets);
    // Walk in topological order to propagate affected status
    for (const targetName of sortedOrder) {
      const deps = depMap[targetName] || [];
      if (deps.some((d) => allAffectedTargets.has(d))) {
        allAffectedTargets.add(targetName);
      }
    }

    // If no changes provided (initial full build), everything is affected
    const isFullInitial = changedFiles.length === 0 && affectedFiles.length === 0;

    const actions: BuildActionNode[] = manifest.targets.map((t) => ({
      id: t.name,
      name: t.name,
      type: t.type,
      command: t.command,
      args: t.args,
      inputs: t.inputs,
      outputs: t.outputs,
      dependencies: t.dependencies,
      isAffected: isFullInitial ? true : allAffectedTargets.has(t.name),
      cacheHit: false,
    }));

    const independentBatches = this.calculateParallelBatches(sortedOrder, depMap);

    return {
      id: `plan_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      repositoryId,
      commitSha,
      actions,
      executionOrder: sortedOrder,
      independentBatches,
      hasCycle,
      cycleNodes,
      affectedTargetCount: isFullInitial ? actions.length : allAffectedTargets.size,
      totalTargetCount: actions.length,
      createdAt: new Date().toISOString(),
    };
  }
}
