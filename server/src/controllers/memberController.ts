import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { RepoRequest } from '../middleware/permissions';

type MemberRole = 'ADMIN' | 'WRITE' | 'READ';

function strParam(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
}

export class MemberController {
  /** List members of a repository */
  public static async listMembers(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const repo = req.repository;
      const members = await prisma.repositoryMember.findMany({
        where: { repositoryId: repo.id },
        include: {
          user: { select: { id: true, username: true, email: true, avatar: true } },
        },
        orderBy: { joinedAt: 'asc' },
      });

      res.json({ owner: repo.owner, members });
    } catch (err) { next(err); }
  }

  /** Invite a user to a repository */
  public static async inviteUser(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const repo = req.repository;
      const { username, email, role } = req.body;

      if (!username && !email) { res.status(400).json({ error: 'Username or email is required' }); return; }

      const validRoles: MemberRole[] = ['ADMIN', 'WRITE', 'READ'];
      const inviteRole: MemberRole = validRoles.includes(role) ? role : 'READ';

      const targetUser = await prisma.user.findFirst({
        where: username ? { username } : { email },
      });

      if (!targetUser) { res.status(404).json({ error: 'User not found' }); return; }
      if (targetUser.id === repo.ownerId) { res.status(400).json({ error: 'Cannot invite the repository owner' }); return; }

      const existingMember = await prisma.repositoryMember.findUnique({
        where: { repositoryId_userId: { repositoryId: repo.id, userId: targetUser.id } },
      });
      if (existingMember) { res.status(409).json({ error: 'User is already a member' }); return; }

      const pendingInvite = await prisma.repositoryInvitation.findFirst({
        where: { repositoryId: repo.id, invitedUserId: targetUser.id, status: 'PENDING' },
      });
      if (pendingInvite) { res.status(409).json({ error: 'A pending invitation already exists for this user' }); return; }

      const invitation = await prisma.repositoryInvitation.create({
        data: {
          repositoryId: repo.id,
          invitedUserId: targetUser.id,
          invitedById: req.user.id,
          role: inviteRole,
          status: 'PENDING',
        },
        include: {
          invitedUser: { select: { id: true, username: true, email: true, avatar: true } },
        },
      });

      await prisma.notification.create({
        data: {
          userId: targetUser.id,
          title: 'Repository Invitation',
          content: `${req.user.username} invited you to ${repo.owner.username}/${repo.name} as ${inviteRole}`,
          type: 'INVITATION',
          link: `/repositories/${repo.owner.username}/${repo.name}`,
        },
      });

      await prisma.activityLog.create({
        data: {
          repositoryId: repo.id,
          userId: req.user.id,
          action: 'INVITE_MEMBER',
          details: `Invited ${targetUser.username} with role ${inviteRole}`,
        },
      });

      res.status(201).json({ message: 'Invitation sent', invitation });
    } catch (err) { next(err); }
  }

  /** List invitations for a repository */
  public static async listInvitations(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const repo = req.repository;
      const status = strParam(req.query['status'] as any) || 'PENDING';

      const invitations = await prisma.repositoryInvitation.findMany({
        where: { repositoryId: repo.id, status: status as any },
        include: {
          invitedUser: { select: { id: true, username: true, email: true, avatar: true } },
          invitedBy: { select: { id: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ invitations });
    } catch (err) { next(err); }
  }

  /** Cancel an invitation */
  public static async cancelInvitation(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const invitationId = strParam(req.params['invitationId']);
      const repo = req.repository;

      const invitation = await prisma.repositoryInvitation.findFirst({
        where: { id: invitationId, repositoryId: repo.id },
      });

      if (!invitation) { res.status(404).json({ error: 'Invitation not found' }); return; }
      if (invitation.status !== 'PENDING') { res.status(400).json({ error: 'Only pending invitations can be cancelled' }); return; }

      await prisma.repositoryInvitation.update({
        where: { id: invitationId },
        data: { status: 'CANCELLED' },
      });

      res.json({ message: 'Invitation cancelled' });
    } catch (err) { next(err); }
  }

  /** Accept or reject an invitation (called by the invited user) */
  public static async respondToInvitation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const invitationId = strParam(req.params['invitationId']);
      const { action } = req.body;

      const invitation = await prisma.repositoryInvitation.findUnique({
        where: { id: invitationId },
        include: {
          repository: { include: { owner: { select: { username: true } } } },
        },
      });

      if (!invitation) { res.status(404).json({ error: 'Invitation not found' }); return; }
      if (invitation.invitedUserId !== req.user.id) { res.status(403).json({ error: 'Not your invitation' }); return; }
      if (invitation.status !== 'PENDING') { res.status(400).json({ error: 'Invitation is no longer pending' }); return; }

      if (action === 'accept') {
        await prisma.$transaction([
          prisma.repositoryInvitation.update({
            where: { id: invitationId },
            data: { status: 'ACCEPTED' },
          }),
          prisma.repositoryMember.create({
            data: {
              repositoryId: invitation.repositoryId,
              userId: req.user.id,
              role: invitation.role,
            },
          }),
          prisma.activityLog.create({
            data: {
              repositoryId: invitation.repositoryId,
              userId: req.user.id,
              action: 'MEMBER_JOINED',
              details: `${req.user.username} joined as ${invitation.role}`,
            },
          }),
        ]);
        res.json({ message: 'Invitation accepted. You are now a member.' });
      } else if (action === 'reject') {
        await prisma.repositoryInvitation.update({
          where: { id: invitationId },
          data: { status: 'REJECTED' },
        });
        res.json({ message: 'Invitation rejected.' });
      } else {
        res.status(400).json({ error: 'Action must be "accept" or "reject"' });
      }
    } catch (err) { next(err); }
  }

  /** Get pending invitations for the current user */
  public static async myInvitations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }

      const invitations = await prisma.repositoryInvitation.findMany({
        where: { invitedUserId: req.user.id, status: 'PENDING' },
        include: {
          repository: { include: { owner: { select: { username: true, avatar: true } } } },
          invitedBy: { select: { id: true, username: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ invitations });
    } catch (err) { next(err); }
  }

  /** Change member role */
  public static async changeMemberRole(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const repo = req.repository;
      const memberId = strParam(req.params['memberId']);
      const { role } = req.body;

      const validRoles: MemberRole[] = ['ADMIN', 'WRITE', 'READ'];
      if (!validRoles.includes(role)) { res.status(400).json({ error: 'Invalid role' }); return; }

      const member = await prisma.repositoryMember.findFirst({
        where: { id: memberId, repositoryId: repo.id },
      });
      if (!member) { res.status(404).json({ error: 'Member not found' }); return; }

      const updated = await prisma.repositoryMember.update({
        where: { id: memberId },
        data: { role },
        include: { user: { select: { id: true, username: true } } },
      });

      await prisma.activityLog.create({
        data: {
          repositoryId: repo.id,
          userId: req.user.id,
          action: 'CHANGE_MEMBER_ROLE',
          details: `Changed ${updated.user.username}'s role to ${role}`,
        },
      });

      res.json({ message: 'Member role updated', member: updated });
    } catch (err) { next(err); }
  }

  /** Remove a member */
  public static async removeMember(req: RepoRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const repo = req.repository;
      const memberId = strParam(req.params['memberId']);

      const member = await prisma.repositoryMember.findFirst({
        where: { id: memberId, repositoryId: repo.id },
        include: { user: { select: { id: true, username: true } } },
      });
      if (!member) { res.status(404).json({ error: 'Member not found' }); return; }
      if (member.user.id === repo.ownerId) { res.status(400).json({ error: 'Cannot remove the repository owner' }); return; }

      await prisma.repositoryMember.delete({ where: { id: memberId } });

      await prisma.activityLog.create({
        data: {
          repositoryId: repo.id,
          userId: req.user.id,
          action: 'REMOVE_MEMBER',
          details: `Removed ${member.user.username} from repository`,
        },
      });

      res.json({ message: 'Member removed successfully' });
    } catch (err) { next(err); }
  }
}
