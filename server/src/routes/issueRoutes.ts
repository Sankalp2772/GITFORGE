import { Router } from 'express';
import { IssueController } from '../controllers/issueController';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth';
import { checkRepoAccess } from '../middleware/permissions';

const router = Router({ mergeParams: true });

router.get('/', optionalAuthenticateToken, checkRepoAccess('READ'), IssueController.list);
router.post('/', authenticateToken, checkRepoAccess('READ'), IssueController.create);
router.get('/labels', optionalAuthenticateToken, checkRepoAccess('READ'), IssueController.listLabels);
router.post('/labels', authenticateToken, checkRepoAccess('WRITE'), IssueController.createLabel);
router.get('/:issueNumber', optionalAuthenticateToken, checkRepoAccess('READ'), IssueController.get);
router.patch('/:issueNumber/status', authenticateToken, checkRepoAccess('READ'), IssueController.updateStatus);
router.post('/:issueNumber/comments', authenticateToken, checkRepoAccess('READ'), IssueController.addComment);

export const issueRouter = router;
