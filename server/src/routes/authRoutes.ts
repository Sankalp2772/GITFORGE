import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/me', authenticateToken, AuthController.me);
router.patch('/profile', authenticateToken, AuthController.updateProfile);
router.post('/logout', AuthController.logout);

export const authRouter = router;
