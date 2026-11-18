import { FileChangeRecord, ScannedFileMetadata } from '../types';

export class ChangeDetectionService {
  /**
   * Compare two file baselines using SHA-256 hashes
   */
  public static detectChanges(
    oldBaseline: Record<string, ScannedFileMetadata>,
    newBaseline: Record<string, ScannedFileMetadata>
  ): {
    changes: FileChangeRecord[];
    modified: string[];
    added: string[];
    deleted: string[];
    unchanged: string[];
  } {
    const changes: FileChangeRecord[] = [];
    const modified: string[] = [];
    const added: string[] = [];
    const deleted: string[] = [];
    const unchanged: string[] = [];

    const oldPaths = new Set(Object.keys(oldBaseline));
    const newPaths = new Set(Object.keys(newBaseline));

    // Check added and modified
    for (const p of newPaths) {
      const newMeta = newBaseline[p];
      if (!oldPaths.has(p)) {
        added.push(p);
        changes.push({
          path: p,
          status: 'ADDED',
          newHash: newMeta.sha256,
          newSize: newMeta.size,
        });
      } else {
        const oldMeta = oldBaseline[p];
        if (oldMeta.sha256 !== newMeta.sha256) {
          modified.push(p);
          changes.push({
            path: p,
            status: 'MODIFIED',
            oldHash: oldMeta.sha256,
            newHash: newMeta.sha256,
            oldSize: oldMeta.size,
            newSize: newMeta.size,
          });
        } else {
          unchanged.push(p);
          changes.push({
            path: p,
            status: 'UNCHANGED',
            oldHash: oldMeta.sha256,
            newHash: newMeta.sha256,
            oldSize: oldMeta.size,
            newSize: newMeta.size,
          });
        }
      }
    }

    // Check deleted
    for (const p of oldPaths) {
      if (!newPaths.has(p)) {
        const oldMeta = oldBaseline[p];
        deleted.push(p);
        changes.push({
          path: p,
          status: 'DELETED',
          oldHash: oldMeta.sha256,
          oldSize: oldMeta.size,
        });
      }
    }

    return { changes, modified, added, deleted, unchanged };
  }
}
