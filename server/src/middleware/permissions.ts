import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from './auth';

export type RequiredPermission = 'READ' | 'WRITE' | 'ADMIN' | 'OWNER';

const roleWeights: Record<string, number> = {
  READ: 1,
  WRITE: 2,
  ADMIN: 3,
  OWNER: 4,
};

export interface RepoRequest extends AuthRequest {
  repository?: any;
  userRole?: 'OWNER' | 'ADMIN' | 'WRITE' | 'READ' | 'NONE';
}

export const checkRepoAccess = (requiredRole: RequiredPermission = 'READ') => {
  return async (req: RepoRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const owner = req.params['owner'] as string;
      const repo = req.params['repo'] as string;
      const id = req.params['id'] as string | undefined;
      const currentUserId = req.user?.id;

      let repository: any;
      if (id) {
        repository = await prisma.repository.findUnique({
          where: { id },
          include: {
            owner: { select: { id: true, username: true, email: true, avatar: true } },
            members: { select: { userId: true, role: true } },
          },
        });
      } else if (owner && repo) {
        const repoClean = typeof repo === 'string' && repo.endsWith('.git') ? repo.slice(0, -4) : repo;
        repository = await prisma.repository.findFirst({
          where: {
            name: repoClean,
            owner: { username: owner },
          },
          include: {
            owner: { select: { id: true, username: true, email: true, avatar: true } },
            members: { select: { userId: true, role: true } },
          },
        });
      }

      if (!repository) {
        res.status(404).json({ error: 'Repository not found' });
        return;
      }

      // Determine user role
      let userRole: 'OWNER' | 'ADMIN' | 'WRITE' | 'READ' | 'NONE' = 'NONE';
      if (currentUserId) {
        if (repository.ownerId === currentUserId) {
          userRole = 'OWNER';
        } else {
          const membership = (repository.members as Array<{ userId: string; role: string }>).find(
            (m) => m.userId === currentUserId
          );
          if (membership) {
            userRole = membership.role as 'ADMIN' | 'WRITE' | 'READ';
          }
        }
      }

      // Check access permission
      const reqWeight = roleWeights[requiredRole] || 1;
      const userWeight = roleWeights[userRole] || 0;

      // Public repositories allow READ for anyone
      if (requiredRole === 'READ' && repository.visibility === 'PUBLIC') {
        req.repository = repository;
        req.userRole = userRole;
        return next();
      }

      if (userWeight >= reqWeight) {
        req.repository = repository;
        req.userRole = userRole;
        return next();
      }

      if (!currentUserId) {
        res.status(401).json({ error: 'Unauthorized: Authentication required' });
        return;
      }

      res.status(403).json({ error: 'Forbidden: Insufficient repository permissions' });
    } catch (err: any) {
      next(err);
    }
  };
};
