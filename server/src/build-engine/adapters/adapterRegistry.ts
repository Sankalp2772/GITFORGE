import { BuildAdapter, ProjectDetectionResult, ProjectKind } from './types';
import { CppBuildAdapter } from './cppAdapter';

/**
 * GitForge Build Adapter Registry
 * Configured for C/C++ Only Build System release.
 * Python, Java, Node.js, React, PHP, .NET, Go and Rust adapters are preserved in source
 * but disabled from active project detection and execution per specification.
 */
export class AdapterRegistry {
  private static adapters: BuildAdapter[] = [
    new CppBuildAdapter(), // C/C++ native builds (CMake & G++ Direct DAG)
  ];

  /**
   * Get all registered active adapters
   */
  public static getAllAdapters(): BuildAdapter[] {
    return this.adapters;
  }

  /**
   * Get adapter by specific project kind
   */
  public static getAdapterByKind(kind: ProjectKind): BuildAdapter | undefined {
    return this.adapters.find(a => a.kind === kind);
  }

  /**
   * Evidence-based project detection for C/C++ projects
   */
  public static async detectProject(
    files: string[],
    readFile: (p: string) => Promise<string | null>
  ): Promise<{ adapter: BuildAdapter; detection: ProjectDetectionResult } | null> {
    const candidates: { adapter: BuildAdapter; detection: ProjectDetectionResult }[] = [];

    for (const adapter of this.adapters) {
      try {
        const detection = await adapter.detect(files, readFile);
        if (detection && detection.confidence > 0.4) {
          candidates.push({ adapter, detection });
        }
      } catch (err) {
        console.warn(`Adapter ${adapter.name} detection failed:`, err);
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    // Sort by confidence descending
    candidates.sort((a, b) => b.detection.confidence - a.detection.confidence);

    return candidates[0];
  }
}
