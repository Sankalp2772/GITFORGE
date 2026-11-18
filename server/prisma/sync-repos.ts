import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { GitService } from '../src/services/gitService';
import { config } from '../src/config';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Syncing disk repositories to database...');
  const root = config.gitStorageRoot;
  if (!fs.existsSync(root)) {
    console.log('Storage root not found:', root);
    return;
  }

  const defaultPasswordHash = await bcrypt.hash('DemoPassword123!', 10);
  const owners = fs.readdirSync(root).filter(f => fs.statSync(path.join(root, f)).isDirectory());

  for (const ownerName of owners) {
    // Upsert user
    const user = await prisma.user.upsert({
      where: { username: ownerName },
      update: {},
      create: {
        username: ownerName,
        email: `${ownerName}@gitforge.dev`,
        passwordHash: defaultPasswordHash,
        bio: `${ownerName}'s account`,
        avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${ownerName}`,
      },
    });

    const ownerDir = path.join(root, ownerName);
    const repos = fs.readdirSync(ownerDir).filter(f => f.endsWith('.git'));

    for (const repoFile of repos) {
      const repoName = repoFile.replace(/\.git$/, '');
      const storagePath = path.join(ownerDir, repoFile);

      const existing = await prisma.repository.findFirst({
        where: { ownerId: user.id, name: repoName },
      });

      if (!existing) {
        let commitSha = '';
        try {
          const commits = await GitService.getCommits(storagePath, 'HEAD', 1);
          commitSha = commits[0]?.sha || '';
        } catch (e) {
          console.warn(`Could not get HEAD for ${ownerName}/${repoName}`);
        }

        const repo = await prisma.repository.create({
          data: {
            name: repoName,
            description: `${repoName} repository`,
            visibility: repoName.includes('private') ? 'PRIVATE' : 'PUBLIC',
            ownerId: user.id,
            defaultBranch: 'main',
            storagePath,
            branches: commitSha
              ? {
                  create: {
                    name: 'main',
                    commitSha,
                    isDefault: true,
                  },
                }
              : undefined,
          },
        });
        console.log(`✅ Synced repository: ${ownerName}/${repo.name}`);
      }
    }
  }

  console.log('✨ All disk repositories synced.');
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
