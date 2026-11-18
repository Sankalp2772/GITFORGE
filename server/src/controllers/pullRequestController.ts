import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { RepoRequest } from '../middleware/permissions';
import { GitService } from '../services/gitService';

export class PullRequestController {
  public static async list(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const repo = req.repository;
      const status = (req.query['status'] as string) || 'OPEN';

      const prs = await prisma.pullRequest.findMany({
        where: { repositoryId: repo.id, status: status as any },
        include: {
          author: { select: { id: true, username: true, avatar: true } },
          _count: { select: { comments: true, reviews: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ pullRequests: prs });
    } catch (err) { next(err); }
  }

  public static async create(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const repo = req.repository;
      const { title, description, sourceBranch, targetBranch } = req.body;

      if (!title || !sourceBranch || !targetBranch) {
        res.status(400).json({ error: 'title, sourceBranch and targetBranch are required' });
        return;
      }
      if (sourceBranch === targetBranch) {
        res.status(400).json({ error: 'Source and target branches must be different' });
        return;
      }

      const branches = await GitService.listBranches(repo.storagePath);
      if (!branches.includes(sourceBranch) || !branches.includes(targetBranch)) {
        res.status(400).json({ error: 'One or both branches do not exist' });
        return;
      }

      // Auto-increment PR number
      const lastPR = await prisma.pullRequest.findFirst({
        where: { repositoryId: repo.id },
        orderBy: { number: 'desc' },
      });
      const number = (lastPR?.number || 0) + 1;

      const pr = await prisma.pullRequest.create({
        data: {
          number,
          repositoryId: repo.id,
          authorId: req.user.id,
          title,
          description,
          sourceBranch,
          targetBranch,
          status: 'OPEN',
        },
        include: {
          author: { select: { id: true, username: true, avatar: true } },
        },
      });

      await prisma.activityLog.create({
        data: {
          repositoryId: repo.id,
          userId: req.user.id,
          action: 'CREATE_PR',
          details: `Opened PR #${number}: ${title}`,
        },
      });

      res.status(201).json({ message: 'Pull request created', pullRequest: pr });
    } catch (err) { next(err); }
  }

  public static async get(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const repo = req.repository;
      const prNumber = parseInt(req.params['prNumber'] as string, 10);

      const pr = await prisma.pullRequest.findUnique({
        where: { repositoryId_number: { repositoryId: repo.id, number: prNumber } },
        include: {
          author: { select: { id: true, username: true, avatar: true } },
          reviews: {
            include: { reviewer: { select: { id: true, username: true, avatar: true } } },
            orderBy: { createdAt: 'desc' },
          },
          comments: {
            include: { author: { select: { id: true, username: true, avatar: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!pr) { res.status(404).json({ error: 'Pull request not found' }); return; }

      // Get diff
      let diff = '';
      try {
        diff = await GitService.getDiff(repo.storagePath, pr.targetBranch, pr.sourceBranch);
      } catch { /* Branches might not have diverged */ }

      res.json({ pullRequest: { ...pr, diff } });
    } catch (err) { next(err); }
  }

  public static async merge(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const repo = req.repository;
      const prNumber = parseInt(req.params['prNumber'] as string, 10);

      const pr = await prisma.pullRequest.findUnique({
        where: { repositoryId_number: { repositoryId: repo.id, number: prNumber } },
      });

      if (!pr) { res.status(404).json({ error: 'Pull request not found' }); return; }
      if (pr.status !== 'OPEN') { res.status(400).json({ error: 'Pull request is not open' }); return; }

      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      const mergeMessage = `Merge pull request #${prNumber}: ${pr.title}\n\nMerged ${pr.sourceBranch} into ${pr.targetBranch}`;

      try {
        const mergeSha = await GitService.mergeBranch(
          repo.storagePath,
          pr.targetBranch,
          pr.sourceBranch,
          user?.username || 'GitForge',
          user?.email || 'gitforge@localhost',
          mergeMessage
        );

        await prisma.pullRequest.update({
          where: { id: pr.id },
          data: { status: 'MERGED', mergedAt: new Date(), mergedBy: req.user.id },
        });

        await prisma.activityLog.create({
          data: {
            repositoryId: repo.id,
            userId: req.user.id,
            action: 'MERGE_PR',
            details: `Merged PR #${prNumber} (${pr.sourceBranch} -> ${pr.targetBranch}) at ${mergeSha.substring(0, 7)}`,
          },
        });

        res.json({ message: `Pull request #${prNumber} merged successfully`, sha: mergeSha });
      } catch (mergeErr: any) {
        res.status(409).json({ error: `Merge failed: ${mergeErr.message}` });
      }
    } catch (err) { next(err); }
  }

  public static async close(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const repo = req.repository;
      const prNumber = parseInt(req.params['prNumber'] as string, 10);

      const pr = await prisma.pullRequest.findUnique({
        where: { repositoryId_number: { repositoryId: repo.id, number: prNumber } },
      });

      if (!pr) { res.status(404).json({ error: 'Pull request not found' }); return; }
      if (pr.status !== 'OPEN') { res.status(400).json({ error: 'Pull request is not open' }); return; }

      // Only author or admin/owner can close
      const isAuthor = pr.authorId === req.user.id;
      const isPrivileged = req.userRole === 'OWNER' || req.userRole === 'ADMIN';
      if (!isAuthor && !isPrivileged) {
        res.status(403).json({ error: 'Only the PR author or admin can close a pull request' });
        return;
      }

      await prisma.pullRequest.update({ where: { id: pr.id }, data: { status: 'CLOSED' } });
      res.json({ message: 'Pull request closed' });
    } catch (err) { next(err); }
  }

  public static async addComment(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const repo = req.repository;
      const prNumber = parseInt(req.params['prNumber'] as string, 10);
      const { content } = req.body;

      if (!content?.trim()) { res.status(400).json({ error: 'Comment content is required' }); return; }

      const pr = await prisma.pullRequest.findUnique({
        where: { repositoryId_number: { repositoryId: repo.id, number: prNumber } },
      });
      if (!pr) { res.status(404).json({ error: 'Pull request not found' }); return; }

      const comment = await prisma.pullRequestComment.create({
        data: { pullRequestId: pr.id, authorId: req.user.id, content },
        include: { author: { select: { id: true, username: true, avatar: true } } },
      });

      res.status(201).json({ comment });
    } catch (err) { next(err); }
  }

  public static async addReview(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const repo = req.repository;
      const prNumber = parseInt(req.params['prNumber'] as string, 10);
      const { state, body } = req.body;

      const validStates = ['COMMENTED', 'APPROVED', 'CHANGES_REQUESTED'];
      if (!validStates.includes(state)) {
        res.status(400).json({ error: 'state must be COMMENTED, APPROVED, or CHANGES_REQUESTED' });
        return;
      }

      const pr = await prisma.pullRequest.findUnique({
        where: { repositoryId_number: { repositoryId: repo.id, number: prNumber } },
      });
      if (!pr) { res.status(404).json({ error: 'Pull request not found' }); return; }

      const review = await prisma.pullRequestReview.create({
        data: { pullRequestId: pr.id, reviewerId: req.user.id, state, body },
        include: { reviewer: { select: { id: true, username: true, avatar: true } } },
      });

      res.status(201).json({ review });
    } catch (err) { next(err); }
  }
}
