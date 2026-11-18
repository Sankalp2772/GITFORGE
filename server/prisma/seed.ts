import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';
import { GitService } from '../src/services/gitService';
import { config } from '../src/config';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting GitForge Database Seed...');

  // 1. Create Demo Users
  const passwordHash = await bcrypt.hash('DemoPassword123!', 10);

  const alice = await prisma.user.upsert({
    where: { username: 'alice' },
    update: {},
    create: {
      username: 'alice',
      email: 'alice@gitforge.dev',
      passwordHash,
      bio: 'Staff Systems & Infrastructure Engineer',
      avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=alice',
    },
  });

  const bob = await prisma.user.upsert({
    where: { username: 'bob' },
    update: {},
    create: {
      username: 'bob',
      email: 'bob@gitforge.dev',
      passwordHash,
      bio: 'Full-Stack Developer & Open-Source Enthusiast',
      avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=bob',
    },
  });

  const testPasswordHash = await bcrypt.hash('pass1234', 10);

  const testuser1 = await prisma.user.upsert({
    where: { username: 'testuser1' },
    update: {},
    create: {
      username: 'testuser1',
      email: 'test1@gitforge.dev',
      passwordHash: testPasswordHash,
      bio: 'Integration Test User 1',
      avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=testuser1',
    },
  });

  const testuser2 = await prisma.user.upsert({
    where: { username: 'testuser2' },
    update: {},
    create: {
      username: 'testuser2',
      email: 'test2@gitforge.dev',
      passwordHash: testPasswordHash,
      bio: 'Integration Test User 2',
      avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=testuser2',
    },
  });

  console.log(`✅ Users created: ${alice.username}, ${bob.username}, ${testuser1.username}, ${testuser2.username}`);

  // 2. Create Sample Repository for Alice
  const repoName = 'core-runtime';
  const repoStorage = path.join(config.gitStorageRoot, alice.username, `${repoName}.git`);

  let repo = await prisma.repository.findFirst({
    where: { ownerId: alice.id, name: repoName },
  });

  if (!repo) {
    let commitSha = '';
    if (fs.existsSync(repoStorage)) {
      const commits = await GitService.getCommits(repoStorage, 'HEAD', 1);
      commitSha = commits[0]?.sha || '';
    } else {
      await GitService.initBareRepo(repoStorage, 'main');
      commitSha = await GitService.initWithReadme(
        repoStorage,
        repoName,
        'High-performance asynchronous core runtime service built for distributed systems.',
        alice.username,
        alice.email,
        'main'
      );
    }

    repo = await prisma.repository.create({
      data: {
        name: repoName,
        description: 'High-performance asynchronous core runtime service built for distributed systems.',
        visibility: 'PUBLIC',
        ownerId: alice.id,
        defaultBranch: 'main',
        storagePath: repoStorage,
        branches: {
          create: {
            name: 'main',
            commitSha,
            isDefault: true,
          },
        },
        members: {
          create: {
            userId: bob.id,
            role: 'WRITE',
          },
        },
        activityLogs: {
          create: [
            {
              userId: alice.id,
              action: 'CREATE_REPOSITORY',
              details: 'Initialized repository core-runtime with README.md',
            },
            {
              userId: alice.id,
              action: 'INVITE_MEMBER',
              details: `Added ${bob.username} as collaborator`,
            },
          ],
        },
      },
    });

    console.log(`✅ Repository created: ${alice.username}/${repo.name}`);
  }

  // 3. Create Sample Issue
  const existingIssue = await prisma.issue.findFirst({
    where: { repositoryId: repo.id, number: 1 },
  });

  if (!existingIssue) {
    const issue = await prisma.issue.create({
      data: {
        number: 1,
        repositoryId: repo.id,
        authorId: bob.id,
        title: 'Optimize thread pool allocator',
        description: 'The thread pool allocator can be improved for zero-copy buffer transfers.',
        status: 'OPEN',
        comments: {
          create: {
            authorId: alice.id,
            content: 'Great catch, Bob! Can you open a PR targeting main?',
          },
        },
      },
    });
    console.log(`✅ Sample Issue #${issue.number} created`);
  }

  console.log('✨ Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
