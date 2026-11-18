import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { RepoRequest } from '../middleware/permissions';

export class IssueController {
  public static async list(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const repo = req.repository;
      const status = (req.query['status'] as string) || 'OPEN';

      const issues = await prisma.issue.findMany({
        where: { repositoryId: repo.id, status: status as any },
        include: {
          author: { select: { id: true, username: true, avatar: true } },
          assignee: { select: { id: true, username: true, avatar: true } },
          labels: true,
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ issues });
    } catch (err) { next(err); }
  }

  public static async create(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const repo = req.repository;
      const { title, description, assigneeId, labelIds } = req.body;

      if (!title?.trim()) { res.status(400).json({ error: 'Issue title is required' }); return; }

      const lastIssue = await prisma.issue.findFirst({
        where: { repositoryId: repo.id },
        orderBy: { number: 'desc' },
      });
      const number = (lastIssue?.number || 0) + 1;

      const issue = await prisma.issue.create({
        data: {
          number,
          repositoryId: repo.id,
          authorId: req.user.id,
          assigneeId: assigneeId || undefined,
          title,
          description,
          status: 'OPEN',
          labels: labelIds?.length ? { connect: labelIds.map((id: string) => ({ id })) } : undefined,
        },
        include: {
          author: { select: { id: true, username: true, avatar: true } },
          assignee: { select: { id: true, username: true, avatar: true } },
          labels: true,
        },
      });

      await prisma.activityLog.create({
        data: {
          repositoryId: repo.id,
          userId: req.user.id,
          action: 'CREATE_ISSUE',
          details: `Opened issue #${number}: ${title}`,
        },
      });

      res.status(201).json({ issue });
    } catch (err) { next(err); }
  }

  public static async get(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const repo = req.repository;
      const issueNumber = parseInt(req.params['issueNumber'] as string, 10);

      const issue = await prisma.issue.findUnique({
        where: { repositoryId_number: { repositoryId: repo.id, number: issueNumber } },
        include: {
          author: { select: { id: true, username: true, avatar: true } },
          assignee: { select: { id: true, username: true, avatar: true } },
          labels: true,
          comments: {
            include: { author: { select: { id: true, username: true, avatar: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!issue) { res.status(404).json({ error: 'Issue not found' }); return; }
      res.json({ issue });
    } catch (err) { next(err); }
  }

  public static async updateStatus(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const repo = req.repository;
      const issueNumber = parseInt(req.params['issueNumber'] as string, 10);
      const { status } = req.body;

      if (!['OPEN', 'CLOSED'].includes(status)) {
        res.status(400).json({ error: 'status must be OPEN or CLOSED' });
        return;
      }

      const issue = await prisma.issue.findUnique({
        where: { repositoryId_number: { repositoryId: repo.id, number: issueNumber } },
      });
      if (!issue) { res.status(404).json({ error: 'Issue not found' }); return; }

      const updated = await prisma.issue.update({
        where: { id: issue.id },
        data: {
          status,
          closedAt: status === 'CLOSED' ? new Date() : null,
        },
      });

      await prisma.activityLog.create({
        data: {
          repositoryId: repo.id,
          userId: req.user.id,
          action: status === 'CLOSED' ? 'CLOSE_ISSUE' : 'REOPEN_ISSUE',
          details: `${status === 'CLOSED' ? 'Closed' : 'Reopened'} issue #${issueNumber}`,
        },
      });

      res.json({ issue: updated });
    } catch (err) { next(err); }
  }

  public static async addComment(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const repo = req.repository;
      const issueNumber = parseInt(req.params['issueNumber'] as string, 10);
      const { content } = req.body;

      if (!content?.trim()) { res.status(400).json({ error: 'Comment content is required' }); return; }

      const issue = await prisma.issue.findUnique({
        where: { repositoryId_number: { repositoryId: repo.id, number: issueNumber } },
      });
      if (!issue) { res.status(404).json({ error: 'Issue not found' }); return; }

      const comment = await prisma.issueComment.create({
        data: { issueId: issue.id, authorId: req.user.id, content },
        include: { author: { select: { id: true, username: true, avatar: true } } },
      });

      res.status(201).json({ comment });
    } catch (err) { next(err); }
  }

  public static async listLabels(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const repo = req.repository;
      const labels = await prisma.label.findMany({ where: { repositoryId: repo.id } });
      res.json({ labels });
    } catch (err) { next(err); }
  }

  public static async createLabel(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const repo = req.repository;
      const { name, color, description } = req.body;

      if (!name?.trim()) { res.status(400).json({ error: 'Label name is required' }); return; }

      const label = await prisma.label.create({
        data: { repositoryId: repo.id, name, color: color || '#6b7280', description },
      });

      res.status(201).json({ label });
    } catch (err) { next(err); }
  }
}
