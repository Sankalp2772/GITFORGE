import { spawn } from 'child_process';
import path from 'path';
import { SupportedLanguage, ScannedFileMetadata } from '../types';
import { HashService } from '../hashing/hashService';

export class RepoSnapshotService {
  /**
   * Safely execute git commands in repository storage
   */
  private static execGit(args: string[], repoPath: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const child = spawn('git', args, {
        cwd: repoPath,
        windowsHide: true,
      });

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      child.stdout.on('data', (d) => stdoutChunks.push(Buffer.from(d)));
      child.stderr.on('data', (d) => stderrChunks.push(Buffer.from(d)));

      child.on('close', (code) => {
        if (code === 0) {
          resolve(Buffer.concat(stdoutChunks));
        } else {
          reject(new Error(`Git ${args.join(' ')} failed (${code}): ${Buffer.concat(stderrChunks).toString()}`));
        }
      });
      child.on('error', reject);
    });
  }

  /**
   * Resolve git ref (branch name, HEAD, or short SHA) to an exact 40-character commit SHA
   */
  public static async resolveCommitSha(repoPath: string, ref: string): Promise<string> {
    try {
      const raw = await this.execGit(['rev-parse', ref], repoPath);
      return raw.toString('utf-8').trim();
    } catch {
      return ref;
    }
  }

  /**
   * List all files in the repository at an exact immutable Git commit
   */
  public static async listFilesAtCommit(repoPath: string, commitSha: string): Promise<string[]> {
    const raw = await this.execGit(['ls-tree', '-r', '--name-only', commitSha], repoPath);
    return raw
      .toString('utf-8')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  /**
   * Read raw file buffer from the repository at an exact commit
   */
  public static async readFileAtCommit(repoPath: string, commitSha: string, filePath: string): Promise<Buffer> {
    const spec = `${commitSha}:${filePath.replace(/\\/g, '/')}`;
    return await this.execGit(['cat-file', '-p', spec], repoPath);
  }

  /**
   * Detect programming language from extension & contents
   */
  public static detectLanguage(filePath: string): SupportedLanguage {
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath).toLowerCase();

    if (['.c', '.h'].includes(ext)) return 'c';
    if (['.cpp', '.cc', '.cxx', '.hpp', '.hxx', '.hh'].includes(ext)) return 'cpp';
    if (['.java'].includes(ext)) return 'java';
    if (['.py'].includes(ext)) return 'python';
    if (['.ts'].includes(ext)) return 'typescript';
    if (['.tsx', '.jsx'].includes(ext)) return 'react';
    if (['.js', '.mjs', '.cjs'].includes(ext)) return 'javascript';
    if (['.html', '.htm'].includes(ext)) return 'html';
    if (['.css', '.scss', '.less'].includes(ext)) return 'css';

    return 'unknown';
  }

  /**
   * Check if a file is a project configuration or build manifest
   */
  public static isConfigFile(filePath: string): boolean {
    const base = path.basename(filePath).toLowerCase();
    return [
      'build.manifest.json',
      'cmakelists.txt',
      'makefile',
      'package.json',
      'tsconfig.json',
      'vite.config.ts',
      'vite.config.js',
      'pom.xml',
      'build.gradle',
      'requirements.txt',
      'pyproject.toml',
    ].includes(base);
  }

  /**
   * Check if a file is typically an application entry point
   */
  public static isEntryPoint(filePath: string, content: string): boolean {
    const base = path.basename(filePath).toLowerCase();
    if (['main.cpp', 'main.c', 'app.js', 'main.js', 'index.ts', 'main.ts', 'app.py', 'main.py'].includes(base)) {
      return true;
    }
    // Check main function in C/C++/Java
    if (content.includes('int main(') || content.includes('void main(') || content.includes('public static void main(')) {
      return true;
    }
    return false;
  }
}
