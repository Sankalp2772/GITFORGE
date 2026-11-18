import { Router } from 'express';
import { PullRequestController } from '../controllers/pullRequestController';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth';
import { checkRepoAccess } from '../middleware/permissions';

const router = Router({ mergeParams: true });

router.get('/', optionalAuthenticateToken, checkRepoAccess('READ'), PullRequestController.list);
router.post('/', authenticateToken, checkRepoAccess('WRITE'), PullRequestController.create);
router.get('/:prNumber', optionalAuthenticateToken, checkRepoAccess('READ'), PullRequestController.get);
router.post('/:prNumber/merge', authenticateToken, checkRepoAccess('WRITE'), PullRequestController.merge);
router.patch('/:prNumber/close', authenticateToken, checkRepoAccess('READ'), PullRequestController.close);
router.post('/:prNumber/comments', authenticateToken, checkRepoAccess('READ'), PullRequestController.addComment);
router.post('/:prNumber/reviews', authenticateToken, checkRepoAccess('READ'), PullRequestController.addReview);

export const pullRequestRouter = router;
