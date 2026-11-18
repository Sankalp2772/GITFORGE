import { Router } from 'express';
import { MemberController } from '../controllers/memberController';
import { authenticateToken } from '../middleware/auth';
import { checkRepoAccess } from '../middleware/permissions';

const router = Router({ mergeParams: true });

// All member routes require at least READ access
router.get('/', authenticateToken, checkRepoAccess('READ'), MemberController.listMembers);
router.post('/invite', authenticateToken, checkRepoAccess('ADMIN'), MemberController.inviteUser);
router.get('/invitations', authenticateToken, checkRepoAccess('ADMIN'), MemberController.listInvitations);
router.delete('/invitations/:invitationId', authenticateToken, checkRepoAccess('ADMIN'), MemberController.cancelInvitation);
router.patch('/:memberId/role', authenticateToken, checkRepoAccess('ADMIN'), MemberController.changeMemberRole);
router.delete('/:memberId', authenticateToken, checkRepoAccess('ADMIN'), MemberController.removeMember);

export const memberRouter = router;
