const { PrismaClient } = require('../node_modules/@prisma/client');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Setting up TalentHub in GitForge ---');

  // 1. Get Alice user
  const alice = await prisma.user.findFirst({ where: { username: 'alice' } });
  if (!alice) throw new Error('User alice not found');

  // 2. Find or create repository
  let repo = await prisma.repository.findFirst({
    where: { ownerId: alice.id, name: 'talenthub' }
  });

  const gitStorageRoot = path.resolve('D:/gitforge/data/repos');
  const bareRepoPath = path.join(gitStorageRoot, 'alice', 'talenthub.git');

  if (!repo) {
    if (!fs.existsSync(bareRepoPath)) {
      fs.mkdirSync(bareRepoPath, { recursive: true });
      execSync('git init --bare', { cwd: bareRepoPath });
    }

    repo = await prisma.repository.create({
      data: {
        name: 'talenthub',
        description: 'College placement management system built with Node.js, Express, MySQL and vanilla JavaScript',
        ownerId: alice.id,
        visibility: 'PUBLIC',
        storagePath: bareRepoPath,
        defaultBranch: 'main',
      }
    });
    console.log('Created repository:', repo.name, repo.id);
  } else {
    console.log('Existing repository:', repo.name, repo.id);
  }

  // 3. Check D:\TalentHub git state
  const talentHubDir = 'D:\\TalentHub';
  if (!fs.existsSync(path.join(talentHubDir, '.git'))) {
    console.log('Initializing git in D:\\TalentHub...');
    execSync('git init', { cwd: talentHubDir });
    execSync('git checkout -b main', { cwd: talentHubDir });
  }

  // Configure remote
  const remoteUrl = 'http://alice:DemoPassword123!@localhost:5000/git/alice/talenthub.git';
  try {
    execSync('git remote remove gitforge', { cwd: talentHubDir });
  } catch (e) { /* ignore */ }

  execSync(`git remote add gitforge "${remoteUrl}"`, { cwd: talentHubDir });

  // Add all files, commit and push
  execSync('git add -A', { cwd: talentHubDir });
  try {
    execSync('git commit -m "Initial commit for GitForge Build Engine integration"', { cwd: talentHubDir });
  } catch (e) {
    console.log('Working tree already committed');
  }

  console.log('Pushing D:\\TalentHub to GitForge bare repository...');
  execSync(`git push -u "${bareRepoPath}" HEAD:main --force`, { cwd: talentHubDir });
  console.log('Successfully pushed TalentHub to GitForge bare repo!');

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
