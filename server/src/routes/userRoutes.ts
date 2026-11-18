import { Router } from 'express';
import { MemberController } from '../controllers/memberController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// User's own invitations
router.get('/invitations', authenticateToken, MemberController.myInvitations);
router.patch('/invitations/:invitationId/respond', authenticateToken, MemberController.respondToInvitation);

export const userRouter = router;
