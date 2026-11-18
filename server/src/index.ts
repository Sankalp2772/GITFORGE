import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { config } from './config';

// Ensure bundled build tools and local compilers are in process.env.PATH
const toolsBin = path.resolve(__dirname, '../../tools/cmake/bin');
const toolsRoot = path.resolve(__dirname, '../../tools');
const ucrtBin = 'C:\\msys64\\ucrt64\\bin';
const mingwBin = 'C:\\MinGW\\bin';
const extraPaths = [toolsBin, toolsRoot, ucrtBin, mingwBin].filter((p) => fs.existsSync(p));
if (extraPaths.length > 0) {
  process.env.PATH = `${extraPaths.join(path.delimiter)}${path.delimiter}${process.env.PATH || ''}`;
}
import { authRouter } from './routes/authRoutes';
import { repositoryRouter } from './routes/repositoryRoutes';
import { memberRouter } from './routes/memberRoutes';
import { pullRequestRouter } from './routes/pullRequestRoutes';
import { issueRouter } from './routes/issueRoutes';
import { notificationRouter } from './routes/notificationRoutes';
import { userRouter } from './routes/userRoutes';
import { gitHttpRouter } from './routes/gitHttp';
import { optionalAuthenticateToken } from './middleware/auth';
import { checkRepoAccess } from './middleware/permissions';

const app = express();

// CORS configuration (allow Vite dev server on 5173 and 5174, or production origins)
app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, git CLI)
    if (!origin) return callback(null, true);
    if (
      origin === 'http://localhost:5173' ||
      origin === 'http://localhost:5174' ||
      origin === 'http://127.0.0.1:5173' ||
      origin === 'http://127.0.0.1:5174'
    ) {
      return callback(null, true);
    }
    return callback(null, true); // Dev mode allows origin
  },
  credentials: true,
}));

// Rate limiter for general API routes to mitigate brute force & DoS
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' },
});

// Strict rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 login/register requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
});

// Git Smart HTTP must be mounted BEFORE express.json() to allow raw streaming packets
app.use('/git', gitHttpRouter);

// JSON body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// REST Routes with Rate Limiting
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/repositories', apiLimiter, repositoryRouter);

// Nested repository resource routes
app.use('/api/repositories/:owner/:repo/members', apiLimiter, memberRouter);
app.use('/api/repositories/:owner/:repo/pulls', apiLimiter, pullRequestRouter);
app.use('/api/repositories/:owner/:repo/issues', apiLimiter, issueRouter);
app.use('/api/repositories/:owner/:repo/activity', apiLimiter, optionalAuthenticateToken, checkRepoAccess('READ'), (req: any, res: any, next: any) => {
  const { ActivityController } = require('./controllers/notificationController');
  return ActivityController.listRepoActivity(req, res, next);
});

// User-level routes
app.use('/api/user', apiLimiter, userRouter);
app.use('/api/notifications', apiLimiter, notificationRouter);

// Incremental Build Engine Subsystem
const { buildEngineRouter } = require('./build-engine/routes/buildEngineRoutes');
app.use('/api/build-engine', apiLimiter, buildEngineRouter);

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'GitForge Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Centralized error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[GitForge Error]', err?.message || err);
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ error: message });
});

// Start Server
app.listen(config.port, () => {
  console.log(`===============================================`);
  console.log(`🚀 GitForge Server running on http://localhost:${config.port}`);
  console.log(`📦 Git Storage Root: ${config.gitStorageRoot}`);
  console.log(`===============================================`);
});

export default app;
