import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface CommitInfo {
  sha: string;
  authorName: string;
  authorEmail: string;
  date: string;
  message: string;
}

export interface TreeItem {
  name: string;
  path: string;
  type: 'tree' | 'blob';
  mode: string;
  sha: string;
  size?: number;
}

export class GitService {
  /**
   * Safely execute git command using argument arrays (no shell injection)
   */
  private static execGit(
    args: string[],
    cwd?: string,
    inputBuffer?: Buffer
  ): Promise<{ stdout: Buffer; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn('git', args, {
        cwd,
        windowsHide: true,
      });

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      if (inputBuffer && child.stdin) {
        child.stdin.write(inputBuffer);
        child.stdin.end();
      }

      child.stdout.on('data', (data) => stdoutChunks.push(Buffer.from(data)));
      child.stderr.on('data', (data) => stderrChunks.push(Buffer.from(data)));

      child.on('close', (code) => {
        const stdout = Buffer.concat(stdoutChunks);
        const stderr = Buffer.concat(stderrChunks).toString('utf-8');

        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Git command 'git ${args.join(' ')}' failed (${code}): ${stderr}`));
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Initialize a bare repository on disk
   */
  public static async initBareRepo(repoPath: string, defaultBranch: string = 'main'): Promise<void> {
    if (!fs.existsSync(repoPath)) {
      fs.mkdirSync(repoPath, { recursive: true });
    }
    await this.execGit(['init', '--bare', `--initial-branch=${defaultBranch}`], repoPath);
    // Allow receiving pushes on bare repo
    await this.execGit(['config', 'http.receivepack', 'true'], repoPath);
  }

  /**
   * Initialize a repository with an initial README commit
   */
  public static async initWithReadme(
    repoPath: string,
    repoName: string,
    description: string = '',
    ownerName: string,
    ownerEmail: string,
    defaultBranch: string = 'main'
  ): Promise<string> {
    const tempDir = path.join(path.dirname(repoPath), `temp_init_${Date.now()}_${Math.random().toString(36).substring(7)}`);
    try {
      fs.mkdirSync(tempDir, { recursive: true });

      await this.execGit(['init', `--initial-branch=${defaultBranch}`], tempDir);
      await this.execGit(['config', 'user.name', ownerName], tempDir);
      await this.execGit(['config', 'user.email', ownerEmail], tempDir);

      const readmeContent = `# ${repoName}\n\n${description || 'Welcome to your new GitForge repository!'}\n`;
      fs.writeFileSync(path.join(tempDir, 'README.md'), readmeContent, 'utf-8');

      await this.execGit(['add', 'README.md'], tempDir);
      await this.execGit(['commit', '-m', 'Initial commit with README.md'], tempDir);

      // Push to bare repo
      await this.execGit(['remote', 'add', 'origin', repoPath], tempDir);
      await this.execGit(['push', '-u', 'origin', defaultBranch], tempDir);

      const { stdout } = await this.execGit(['rev-parse', 'HEAD'], tempDir);
      const sha = stdout.toString('utf-8').trim();

      return sha;
    } finally {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  }

  /**
   * List all branches
   */
  public static async listBranches(repoPath: string): Promise<string[]> {
    try {
      const { stdout } = await this.execGit(['branch', '--list', '--format=%(refname:short)'], repoPath);
      const output = stdout.toString('utf-8').trim();
      if (!output) return [];
      return output.split('\n').map((b) => b.trim()).filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * Create a new branch pointing to a specific commit or existing branch
   */
  public static async createBranch(repoPath: string, branchName: string, startPoint: string): Promise<void> {
    await this.execGit(['branch', branchName, startPoint], repoPath);
  }

  /**
   * Delete a branch
   */
  public static async deleteBranch(repoPath: string, branchName: string): Promise<void> {
    await this.execGit(['branch', '-D', branchName], repoPath);
  }

  /**
   * Get commit history for a ref (branch/tag/sha)
   * Format per line: SHA|AuthorName|AuthorEmail|ISODate|Subject
   */
  public static async getCommits(repoPath: string, ref: string = 'HEAD', limit: number = 30): Promise<CommitInfo[]> {
    try {
      // Use a unique delimiter unlikely to appear in commit messages
      const sep = '\x01\x02\x03';
      const format = `%H${sep}%an${sep}%ae${sep}%aI${sep}%s`;
      const { stdout } = await this.execGit(
        ['log', `-${limit}`, `--format=${format}`, ref],
        repoPath
      );

      const raw = stdout.toString('utf-8').trim();
      if (!raw) return [];

      return raw.split('\n').filter(Boolean).map((line) => {
        const parts = line.split(sep);
        return {
          sha: (parts[0] || '').trim(),
          authorName: (parts[1] || '').trim(),
          authorEmail: (parts[2] || '').trim(),
          date: (parts[3] || '').trim(),
          message: (parts[4] || '').trim(),
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Get single commit details and diff
   */
  public static async getCommitDetails(repoPath: string, sha: string): Promise<{
    sha: string;
    authorName: string;
    authorEmail: string;
    date: string;
    message: string;
    diff: string;
    parentSha?: string;
  }> {
    const { stdout: infoOut } = await this.execGit(
      ['show', '-s', '--format=%H%x1f%an%x1f%ae%x1f%aI%x1f%B%x1f%P', sha],
      repoPath
    );

    const parts = infoOut.toString('utf-8').split('\x1f');
    const commitSha = parts[0]?.trim();
    const authorName = parts[1]?.trim();
    const authorEmail = parts[2]?.trim();
    const date = parts[3]?.trim();
    const message = parts[4]?.trim();
    const parentSha = parts[5]?.trim() ? parts[5].trim().split(' ')[0] : undefined;

    const { stdout: diffOut } = await this.execGit(['show', '--pretty=format:', sha], repoPath);
    const diff = diffOut.toString('utf-8');

    return {
      sha: commitSha,
      authorName,
      authorEmail,
      date,
      message,
      diff,
      parentSha,
    };
  }

  /**
   * Get directory contents at a specific path and ref
   */
  public static async getTree(repoPath: string, ref: string = 'HEAD', subPath: string = ''): Promise<TreeItem[]> {
    try {
      const gitPathSpec = subPath ? `${ref}:${subPath.replace(/^\/+|\/+$/g, '')}` : ref;
      const { stdout } = await this.execGit(['ls-tree', '-l', gitPathSpec], repoPath);
      const lines = stdout.toString('utf-8').trim().split('\n').filter(Boolean);

      const items: TreeItem[] = [];
      for (const line of lines) {
        // Mode Type Sha Size\tName
        // Example: 100644 blob e69de29bb2d1d6434b8b29ae775ad8c2e48c5391       0\tREADME.md
        const tabIndex = line.indexOf('\t');
        if (tabIndex === -1) continue;

        const meta = line.substring(0, tabIndex).trim();
        const name = line.substring(tabIndex + 1).trim();

        const metaParts = meta.split(/\s+/);
        const mode = metaParts[0];
        const type = metaParts[1] as 'tree' | 'blob';
        const sha = metaParts[2];
        const sizeStr = metaParts[3];
        const size = sizeStr && sizeStr !== '-' ? parseInt(sizeStr, 10) : undefined;

        const fullPath = subPath ? `${subPath.replace(/^\/+|\/+$/g, '')}/${name}` : name;

        items.push({
          name,
          path: fullPath,
          type,
          mode,
          sha,
          size,
        });
      }

      // Sort directories first, then alphabetical
      items.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'tree' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      return items;
    } catch {
      return [];
    }
  }

  /**
   * Get file contents as text or raw
   */
  public static async getFileContent(repoPath: string, ref: string, filePath: string): Promise<string> {
    const gitPathSpec = `${ref}:${filePath.replace(/^\/+|\/+$/g, '')}`;
    const { stdout } = await this.execGit(['cat-file', '-p', gitPathSpec], repoPath);
    return stdout.toString('utf-8');
  }

  /**
   * Get diff between two branches or commits
   */
  public static async getDiff(repoPath: string, base: string, head: string): Promise<string> {
    const { stdout } = await this.execGit(['diff', base, head], repoPath);
    return stdout.toString('utf-8');
  }

  /**
   * Check if head can be merged cleanly into base
   */
  public static async checkMergeable(repoPath: string, base: string, head: string): Promise<boolean> {
    const tempDir = path.join(path.dirname(repoPath), `temp_merge_${Date.now()}_${Math.random().toString(36).substring(7)}`);
    try {
      await this.execGit(['clone', '--local', repoPath, tempDir]);
      await this.execGit(['checkout', base], tempDir);
      // Try merge without commit
      await this.execGit(['merge', '--no-commit', '--no-ff', head], tempDir);
      return true;
    } catch {
      return false;
    } finally {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  }

  /**
   * Execute merge of head into base
   */
  public static async mergeBranch(
    repoPath: string,
    base: string,
    head: string,
    authorName: string,
    authorEmail: string,
    message: string
  ): Promise<string> {
    const tempDir = path.join(path.dirname(repoPath), `temp_do_merge_${Date.now()}_${Math.random().toString(36).substring(7)}`);
    try {
      await this.execGit(['clone', '--local', repoPath, tempDir]);
      await this.execGit(['config', 'user.name', authorName], tempDir);
      await this.execGit(['config', 'user.email', authorEmail], tempDir);
      await this.execGit(['checkout', base], tempDir);
      // Ensure the head ref is fetched/checked out
      await this.execGit(['fetch', 'origin', `${head}:${head}`], tempDir);
      await this.execGit(['merge', head, '-m', message], tempDir);
      await this.execGit(['push', 'origin', base], tempDir);

      const { stdout } = await this.execGit(['rev-parse', 'HEAD'], tempDir);
      return stdout.toString('utf-8').trim();
    } finally {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  }
}
