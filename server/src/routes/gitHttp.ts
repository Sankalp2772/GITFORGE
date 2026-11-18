import { Request, Response, Router } from 'express';
import { spawn } from 'child_process';
import fs from 'fs';
import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma';
import { config } from '../config';

const router = Router();

/**
 * Basic Auth verification for Git HTTP operations
 */
async function authenticateGitUser(req: Request): Promise<{ id: string; username: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return null;
  }

  const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf-8');
  const colonIndex = credentials.indexOf(':');
  if (colonIndex === -1) return null;

  const username = credentials.substring(0, colonIndex);
  const password = credentials.substring(colonIndex + 1);

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email: username }],
    },
  });

  if (!user) return null;

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return null;

  return { id: user.id, username: user.username };
}

/**
 * Verify user authorization for git operation
 */
async function authorizeGitAccess(
  owner: string,
  repoClean: string,
  service: 'git-upload-pack' | 'git-receive-pack',
  gitUser: { id: string; username: string } | null
): Promise<{ allowed: boolean; repoRecord?: any; reason?: string }> {
  const repoRecord = await prisma.repository.findFirst({
    where: {
      name: repoClean,
      owner: { username: owner },
    },
    include: {
      owner: true,
      members: true,
    },
  });

  if (!repoRecord) {
    return { allowed: false, reason: 'Repository not found' };
  }

  const isPublic = repoRecord.visibility === 'PUBLIC';
  const isOwner = gitUser && gitUser.id === repoRecord.ownerId;
  const member = gitUser ? (repoRecord.members as Array<{ userId: string; role: string }>).find((m) => m.userId === gitUser.id) : null;
  const hasWrite = isOwner || (member && (member.role === 'ADMIN' || member.role === 'WRITE'));
  const hasRead = isPublic || isOwner || !!member;

  if (service === 'git-receive-pack') {
    if (!gitUser || !hasWrite) {
      return { allowed: false, repoRecord, reason: 'Write access denied' };
    }
    return { allowed: true, repoRecord };
  } else {
    if (!hasRead) {
      return { allowed: false, repoRecord, reason: 'Read access denied' };
    }
    return { allowed: true, repoRecord };
  }
}

function getParam(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] ?? '';
  return val ?? '';
}

/**
 * Handle GET /git/:owner/:repo/info/refs?service=git-upload-pack|git-receive-pack
 */
router.get('/:owner/:repo/info/refs', async (req: Request, res: Response): Promise<void> => {
  try {
    const owner = getParam(req.params['owner']);
    const repo = getParam(req.params['repo']);
    const repoClean = repo.endsWith('.git') ? repo.slice(0, -4) : repo;
    const service = req.query['service'] as string | undefined;

    if (!service || (service !== 'git-upload-pack' && service !== 'git-receive-pack')) {
      res.status(400).send('Unsupported or missing service parameter');
      return;
    }

    const gitUser = await authenticateGitUser(req);
    const { allowed, repoRecord, reason } = await authorizeGitAccess(
      owner, repoClean, service as 'git-upload-pack' | 'git-receive-pack', gitUser
    );

    if (!repoRecord) {
      res.status(404).send('Repository not found');
      return;
    }

    if (!allowed) {
      res.setHeader('WWW-Authenticate', 'Basic realm="GitForge"');
      res.status(401).send(reason || 'Authentication required');
      return;
    }

    const repoPath: string = repoRecord.storagePath;
    if (!fs.existsSync(repoPath)) {
      res.status(500).send('Repository storage missing');
      return;
    }

    res.setHeader('Expires', 'Fri, 01 Jan 1980 00:00:00 GMT');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Cache-Control', 'no-cache, max-age=0, must-revalidate');
    res.setHeader('Content-Type', `application/x-${service}-advertisement`);

    const serviceName = service.replace(/^git-/, '');
    const initialPacket = `# service=${service}\n`;
    const hexLen = (initialPacket.length + 4).toString(16).padStart(4, '0');
    res.write(`${hexLen}${initialPacket}0000`);

    const gitProcess = spawn('git', [serviceName, '--stateless-rpc', '--advertise-refs', repoPath], {
      windowsHide: true,
    });

    gitProcess.stdout.pipe(res);
    gitProcess.stderr.on('data', (data: Buffer) => console.error(`git info/refs stderr: ${data.toString()}`));
  } catch (err) {
    console.error('Git info/refs error:', err);
    res.status(500).send('Internal server error');
  }
});

/**
 * Handle POST /git/:owner/:repo/git-upload-pack
 */
router.post('/:owner/:repo/git-upload-pack', async (req: Request, res: Response): Promise<void> => {
  try {
    const owner = getParam(req.params['owner']);
    const repo = getParam(req.params['repo']);
    const repoClean = repo.endsWith('.git') ? repo.slice(0, -4) : repo;

    const gitUser = await authenticateGitUser(req);
    const { allowed, repoRecord, reason } = await authorizeGitAccess(owner, repoClean, 'git-upload-pack', gitUser);

    if (!repoRecord) {
      res.status(404).send('Repository not found');
      return;
    }

    if (!allowed) {
      res.setHeader('WWW-Authenticate', 'Basic realm="GitForge"');
      res.status(401).send(reason || 'Authentication required');
      return;
    }

    const repoPath: string = repoRecord.storagePath;

    res.setHeader('Expires', 'Fri, 01 Jan 1980 00:00:00 GMT');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Cache-Control', 'no-cache, max-age=0, must-revalidate');
    res.setHeader('Content-Type', 'application/x-git-upload-pack-result');

    const gitProcess = spawn('git', ['upload-pack', '--stateless-rpc', repoPath], {
      windowsHide: true,
    });

    req.pipe(gitProcess.stdin);
    gitProcess.stdout.pipe(res);
    gitProcess.stderr.on('data', (data: Buffer) => console.error(`git upload-pack stderr: ${data.toString()}`));
  } catch (err) {
    console.error('Git upload-pack error:', err);
    res.status(500).send('Internal server error');
  }
});

/**
 * Handle POST /git/:owner/:repo/git-receive-pack (Push)
 */
router.post('/:owner/:repo/git-receive-pack', async (req: Request, res: Response): Promise<void> => {
  try {
    const owner = getParam(req.params['owner']);
    const repo = getParam(req.params['repo']);
    const repoClean = repo.endsWith('.git') ? repo.slice(0, -4) : repo;

    const gitUser = await authenticateGitUser(req);
    const { allowed, repoRecord, reason } = await authorizeGitAccess(owner, repoClean, 'git-receive-pack', gitUser);

    if (!repoRecord) {
      res.status(404).send('Repository not found');
      return;
    }

    if (!allowed) {
      res.setHeader('WWW-Authenticate', 'Basic realm="GitForge"');
      res.status(401).send(reason || 'Authentication required');
      return;
    }

    const repoPath: string = repoRecord.storagePath;

    res.setHeader('Expires', 'Fri, 01 Jan 1980 00:00:00 GMT');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Cache-Control', 'no-cache, max-age=0, must-revalidate');
    res.setHeader('Content-Type', 'application/x-git-receive-pack-result');

    const gitProcess = spawn('git', ['receive-pack', '--stateless-rpc', repoPath], {
      windowsHide: true,
    });

    req.pipe(gitProcess.stdin);
    gitProcess.stdout.pipe(res);
    gitProcess.stderr.on('data', (data: Buffer) => console.error(`git receive-pack stderr: ${data.toString()}`));

    gitProcess.on('close', async (code: number | null) => {
      if (code === 0 && gitUser) {
        try {
          await prisma.activityLog.create({
            data: {
              repositoryId: repoRecord.id,
              userId: gitUser.id,
              action: 'PUSH',
              details: `Pushed code to ${repoRecord.name}`,
            },
          });
          await prisma.repository.update({
            where: { id: repoRecord.id },
            data: { updatedAt: new Date() },
          });
        } catch (e) {
          console.error('Error recording push activity:', e);
        }
      }
    });
  } catch (err) {
    console.error('Git receive-pack error:', err);
    res.status(500).send('Internal server error');
  }
});

export const gitHttpRouter = router;
