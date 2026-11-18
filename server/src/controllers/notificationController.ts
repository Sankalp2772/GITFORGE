import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';

function strParam(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
}

export class NotificationController {
  public static async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }

      const notifications = await prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      const unreadCount = await prisma.notification.count({
        where: { userId: req.user.id, isRead: false },
      });

      res.json({ notifications, unreadCount });
    } catch (err) { next(err); }
  }

  public static async markRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const id = strParam(req.params['id']);

      if (id === 'all') {
        await prisma.notification.updateMany({
          where: { userId: req.user.id, isRead: false },
          data: { isRead: true },
        });
        res.json({ message: 'All notifications marked as read' });
      } else {
        await prisma.notification.updateMany({
          where: { id, userId: req.user.id },
          data: { isRead: true },
        });
        res.json({ message: 'Notification marked as read' });
      }
    } catch (err) { next(err); }
  }
}

export class ActivityController {
  public static async listRepoActivity(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const repo = req.repository;
      const logs = await prisma.activityLog.findMany({
        where: { repositoryId: repo.id },
        include: { user: { select: { id: true, username: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      res.json({ activityLogs: logs });
    } catch (err) { next(err); }
  }

  public static async listUserActivity(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }

      const logs = await prisma.activityLog.findMany({
        where: { userId: req.user.id },
        include: {
          repository: { select: { name: true, owner: { select: { username: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      res.json({ activityLogs: logs });
    } catch (err) { next(err); }
  }
}
