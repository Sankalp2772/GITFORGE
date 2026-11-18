import { Router } from 'express';
import { NotificationController, ActivityController } from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, NotificationController.list);
router.patch('/:id/read', authenticateToken, NotificationController.markRead);
router.get('/activity', authenticateToken, ActivityController.listUserActivity);

export const notificationRouter = router;
