import { Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../config/prisma';
import { config } from '../config';
import { GitService } from '../services/gitService';
import { createRepoSchema, updateRepoSchema } from '../validators';
import { AuthRequest } from '../middleware/auth';
import { RepoRequest } from '../middleware/permissions';

export class RepositoryController {
  /**
   * Create a new repository
   */
  public static async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const parsed = createRepoSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.errors[0].message });
        return;
      }

      const { name, description, visibility, initializeWithReadme, defaultBranch } = parsed.data;

      // Check unique (ownerId + name)
      const existing = await prisma.repository.findFirst({
        where: {
          ownerId: req.user.id,
          name,
        },
      });

      if (existing) {
        res.status(409).json({ error: 'A repository with this name already exists for your account' });
        return;
      }

      // Prepare storage path: D:\gitforge\data\repos\username\reponame.git
      const userDir = path.join(config.gitStorageRoot, req.user.username);
      const storagePath = path.join(userDir, `${name}.git`);

      // Initialize bare git repository
      await GitService.initBareRepo(storagePath, defaultBranch);

      let initialCommitSha = '';
      if (initializeWithReadme) {
        initialCommitSha = await GitService.initWithReadme(
          storagePath,
          name,
          description || '',
          req.user.username,
          req.user.email,
          defaultBranch
        );
      }

      // Create repository in DB
      const repo = await prisma.repository.create({
        data: {
          name,
          description,
          visibility,
          ownerId: req.user.id,
          defaultBranch,
          storagePath,
          branches: initialCommitSha
            ? {
                create: {
                  name: defaultBranch,
                  commitSha: initialCommitSha,
                  isDefault: true,
                },
              }
            : undefined,
          activityLogs: {
            create: {
              userId: req.user.id,
              action: 'CREATE_REPOSITORY',
              details: `Created repository ${req.user.username}/${name}`,
            },
          },
        },
        include: {
          owner: {
            select: { id: true, username: true, email: true, avatar: true },
          },
        },
      });

      const cloneUrl = `http://localhost:${config.port}/git/${req.user.username}/${name}.git`;

      res.status(201).json({
        message: 'Repository created successfully',
        repository: {
          ...repo,
          cloneUrl,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * List repositories visible to current user (public repos + user's own/member private repos)
   */
  public static async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user?.id;

      const repos = await prisma.repository.findMany({
        where: currentUserId
          ? {
              OR: [
                { visibility: 'PUBLIC' },
                { ownerId: currentUserId },
                { members: { some: { userId: currentUserId } } },
              ],
            }
          : { visibility: 'PUBLIC' },
        include: {
          owner: { select: { id: true, username: true, avatar: true } },
          members: {
            select: {
              userId: true,
              role: true,
            },
          },
          _count: {
            select: {
              members: true,
              pullRequests: true,
              issues: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      const reposWithCloneUrl = repos.map((r) => ({
        ...r,
        cloneUrl: `http://localhost:${config.port}/git/${r.owner.username}/${r.name}.git`,
      }));

      res.json({ repositories: reposWithCloneUrl });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single repository details
   */
  public static async getByOwnerAndName(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const repo = req.repository;
      const cloneUrl = `http://localhost:${config.port}/git/${repo.owner.username}/${repo.name}.git`;

      // Fetch git branches directly from git storage
      const gitBranches = await GitService.listBranches(repo.storagePath);

      res.json({
        repository: {
          ...repo,
          cloneUrl,
          branches: gitBranches,
          userRole: req.userRole,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update repository details
   */
  public static async update(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateRepoSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.errors[0].message });
        return;
      }

      const repo = req.repository;

      const updated = await prisma.repository.update({
        where: { id: repo.id },
        data: {
          description: parsed.data.description,
          visibility: parsed.data.visibility,
          defaultBranch: parsed.data.defaultBranch,
        },
        include: {
          owner: { select: { id: true, username: true, avatar: true } },
        },
      });

      res.json({ message: 'Repository updated', repository: updated });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete repository
   */
  public static async delete(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const repo = req.repository;

      // Delete storage directory
      if (fs.existsSync(repo.storagePath)) {
        fs.rmSync(repo.storagePath, { recursive: true, force: true });
      }

      // Delete database record (cascading deletes members, branches, PRs, etc.)
      await prisma.repository.delete({
        where: { id: repo.id },
      });

      res.json({ message: 'Repository deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get directory contents / tree
   */
  public static async getTree(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const repo = req.repository;
      const ref = (req.query.ref as string) || repo.defaultBranch || 'HEAD';
      const subPath = (req.query.path as string) || '';

      const tree = await GitService.getTree(repo.storagePath, ref, subPath);
      res.json({ tree, ref, path: subPath });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get file content
   */
  public static async getBlob(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const repo = req.repository;
      const ref = (req.query.ref as string) || repo.defaultBranch || 'HEAD';
      const filePath = req.query.path as string;

      if (!filePath) {
        res.status(400).json({ error: 'File path is required' });
        return;
      }

      const content = await GitService.getFileContent(repo.storagePath, ref, filePath);
      res.json({ content, ref, path: filePath });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get commit history
   */
  public static async getCommits(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const repo = req.repository;
      const ref = (req.query.ref as string) || repo.defaultBranch || 'HEAD';
      const limit = parseInt((req.query.limit as string) || '30', 10);

      const commits = await GitService.getCommits(repo.storagePath, ref, limit);
      res.json({ commits, ref });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get commit detail with diff
   */
  public static async getCommitDetails(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const repo = req.repository;
      const sha = req.params.sha as string;

      const details = await GitService.getCommitDetails(repo.storagePath, sha);
      res.json({ commit: details });
    } catch (err) {
      next(err);
    }
  }

  /**
   * List branches
   */
  public static async getBranches(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const repo = req.repository;
      const branches = await GitService.listBranches(repo.storagePath);
      res.json({ branches, defaultBranch: repo.defaultBranch });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create new branch
   */
  public static async createBranch(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const repo = req.repository;
      const { name, startPoint } = req.body;

      if (!name) {
        res.status(400).json({ error: 'Branch name is required' });
        return;
      }

      await GitService.createBranch(repo.storagePath, name, startPoint || repo.defaultBranch || 'HEAD');
      res.status(201).json({ message: `Branch ${name} created successfully` });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create branch' });
    }
  }

  /**
   * Delete branch
   */
  public static async deleteBranch(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const repo = req.repository;
      const branchName = req.params.branchName as string;

      if (branchName === repo.defaultBranch) {
        res.status(400).json({ error: 'Cannot delete the default branch' });
        return;
      }

      await GitService.deleteBranch(repo.storagePath, branchName);
      res.json({ message: `Branch ${branchName} deleted successfully` });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to delete branch' });
    }
  }
}
