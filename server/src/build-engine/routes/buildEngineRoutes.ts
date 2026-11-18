import { Router } from 'express';
import { BuildEngineController } from '../controllers/buildEngineController';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

// Protect all build engine APIs with existing GitForge authentication
router.use(authenticateToken);

// Repositories & Project Detection
router.get('/repositories', BuildEngineController.getRepositories);
router.get('/repositories/:id/detect', BuildEngineController.detectProject);

// Scanning
router.post('/repositories/:id/scan', BuildEngineController.scanRepository);
router.get('/repositories/:id/latest-scan', BuildEngineController.getLatestScanForRepo);
router.get('/scans/:scanId', BuildEngineController.getScanGraph);

// Change Detection & Affected Files
router.post('/repositories/:id/detect-changes', BuildEngineController.detectChanges);

// Planning
router.post('/repositories/:id/plan', BuildEngineController.createPlan);

// Execution
router.post('/plans/:id/execute', BuildEngineController.executePlan);

// Cache
router.get('/cache', BuildEngineController.getCacheMetrics);
router.delete('/cache', BuildEngineController.clearCache);

// Application Run Manager
router.get('/jobs/:jobId/services', BuildEngineController.getServices);
router.post('/jobs/:jobId/install-dependencies', BuildEngineController.installDependencies);
router.post('/jobs/:jobId/run', BuildEngineController.runApplication);
router.get('/run-sessions/:sessionId', BuildEngineController.getRunSession);
router.post('/run-sessions/:sessionId/input', BuildEngineController.sendSessionInput);
router.post('/run-sessions/:sessionId/stop', BuildEngineController.stopApplication);

// Build History
router.get('/history', BuildEngineController.getBuildHistory);

export const buildEngineRouter = router;
