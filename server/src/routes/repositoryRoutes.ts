import { Router } from 'express';
import { RepositoryController } from '../controllers/repositoryController';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth';
import { checkRepoAccess } from '../middleware/permissions';

const router = Router();

// Public / Authenticated listing & creation
router.get('/', optionalAuthenticateToken, RepositoryController.list);
router.post('/', authenticateToken, RepositoryController.create);

// Single repo details
router.get('/:owner/:repo', optionalAuthenticateToken, checkRepoAccess('READ'), RepositoryController.getByOwnerAndName);
router.patch('/:owner/:repo', authenticateToken, checkRepoAccess('ADMIN'), RepositoryController.update);
router.delete('/:owner/:repo', authenticateToken, checkRepoAccess('OWNER'), RepositoryController.delete);

// Git browser: tree, blob, commits, diff
router.get('/:owner/:repo/tree', optionalAuthenticateToken, checkRepoAccess('READ'), RepositoryController.getTree);
router.get('/:owner/:repo/blob', optionalAuthenticateToken, checkRepoAccess('READ'), RepositoryController.getBlob);
router.get('/:owner/:repo/commits', optionalAuthenticateToken, checkRepoAccess('READ'), RepositoryController.getCommits);
router.get('/:owner/:repo/commits/:sha', optionalAuthenticateToken, checkRepoAccess('READ'), RepositoryController.getCommitDetails);

// Branches
router.get('/:owner/:repo/branches', optionalAuthenticateToken, checkRepoAccess('READ'), RepositoryController.getBranches);
router.post('/:owner/:repo/branches', authenticateToken, checkRepoAccess('WRITE'), RepositoryController.createBranch);
router.delete('/:owner/:repo/branches/:branchName', authenticateToken, checkRepoAccess('ADMIN'), RepositoryController.deleteBranch);

export const repositoryRouter = router;
