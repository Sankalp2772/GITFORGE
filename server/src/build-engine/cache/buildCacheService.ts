import fs from 'fs';
import path from 'path';
import { config } from '../../config';

export class BuildCacheService {
  private static cacheRoot = path.resolve(config.gitStorageRoot, '..', 'build-cache');

  public static init(): void {
    if (!fs.existsSync(this.cacheRoot)) {
      fs.mkdirSync(this.cacheRoot, { recursive: true });
    }
  }

  /**
   * Check if an artifact is cached by key
   */
  public static has(cacheKey: string): boolean {
    const keyDir = path.join(this.cacheRoot, cacheKey);
    const metaFile = path.join(keyDir, 'metadata.json');
    return fs.existsSync(metaFile);
  }

  /**
   * Store built output files in cache
   */
  public static put(cacheKey: string, workspaceDir: string, outputs: string[]): void {
    const keyDir = path.join(this.cacheRoot, cacheKey);
    if (!fs.existsSync(keyDir)) {
      fs.mkdirSync(keyDir, { recursive: true });
    }

    const savedFiles: string[] = [];
    for (const relOut of outputs) {
      const srcPath = path.join(workspaceDir, relOut);
      if (fs.existsSync(srcPath)) {
        const destPath = path.join(keyDir, relOut);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(srcPath, destPath);
        savedFiles.push(relOut);
      }
    }

    const meta = {
      cacheKey,
      savedFiles,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(path.join(keyDir, 'metadata.json'), JSON.stringify(meta, null, 2), 'utf-8');
  }

  /**
   * Restore cached outputs into build workspace
   */
  public static restore(cacheKey: string, workspaceDir: string): boolean {
    const keyDir = path.join(this.cacheRoot, cacheKey);
    const metaFile = path.join(keyDir, 'metadata.json');

    if (!fs.existsSync(metaFile)) return false;

    try {
      const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
      for (const relOut of meta.savedFiles) {
        const srcPath = path.join(keyDir, relOut);
        const destPath = path.join(workspaceDir, relOut);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(srcPath, destPath);
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get cache metrics
   */
  public static getMetrics(): { entryCount: number; totalSizeBytes: number } {
    this.init();
    let entryCount = 0;
    let totalSizeBytes = 0;

    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          walk(full);
        } else {
          totalSizeBytes += fs.statSync(full).size;
        }
      }
    };

    const keys = fs.readdirSync(this.cacheRoot);
    entryCount = keys.length;
    walk(this.cacheRoot);

    return { entryCount, totalSizeBytes };
  }

  /**
   * Clear all entries from the build cache
   */
  public static clear(): void {
    this.init();
    const entries = fs.readdirSync(this.cacheRoot);
    for (const entry of entries) {
      const full = path.join(this.cacheRoot, entry);
      fs.rmSync(full, { recursive: true, force: true });
    }
  }
}
