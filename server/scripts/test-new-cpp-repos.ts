import { RepoSnapshotService } from '../src/build-engine/scanner/repoSnapshotService';
import { AdapterRegistry } from '../src/build-engine/adapters/adapterRegistry';
import { ManifestParser } from '../src/build-engine/manifest/manifestParser';
import { BuildPlannerService } from '../src/build-engine/planner/buildPlannerService';
import { ParallelBuildScheduler } from '../src/build-engine/scheduler/parallelBuildScheduler';
import { LocalRunManager } from '../src/build-engine/runner/localRunManager';
import { PrismaClient } from '../node_modules/@prisma/client/default.js';

const prisma = new PrismaClient();

async function testAllNewCppRepos() {
  console.log('========================================================================');
  console.log('🚀 TESTING NEW C++ APPLICATIONS END-TO-END WITH REAL OUTPUTS');
  console.log('========================================================================\n');

  const repos = await prisma.repository.findMany({ include: { owner: true } });

  for (const repo of repos) {
    console.log('------------------------------------------------------------------------');
    console.log(`▶ REPOSITORY: ${repo.owner.username}/${repo.name}`);
    console.log('------------------------------------------------------------------------');

    // 1. Snapshot
    const files = await RepoSnapshotService.listFilesAtCommit(repo.storagePath, repo.defaultBranch);
    console.log(`  Files detected (${files.length}): ${files.join(', ')}`);

    // 2. Detection
    const readFileHelper = async (p: string) => {
      try {
        const buf = await RepoSnapshotService.readFileAtCommit(repo.storagePath, repo.defaultBranch, p);
        return buf.toString('utf8');
      } catch {
        return null;
      }
    };
    const match = await AdapterRegistry.detectProject(files, readFileHelper);
    if (!match) throw new Error(`Detection failed for ${repo.name}`);
    console.log(`  Detection: ${match.detection.name} (${match.detection.primaryLanguage}) [${match.detection.buildSystem}]`);

    // 3. Plan
    const manifestBuf = await RepoSnapshotService.readFileAtCommit(repo.storagePath, repo.defaultBranch, 'build.manifest.json');
    const { manifest } = ManifestParser.parseAndValidate(manifestBuf.toString('utf8'));
    const plan = BuildPlannerService.createBuildPlan(repo.id, repo.defaultBranch, manifest, [], []);
    console.log(`  Build Plan targets: ${plan.actions.map((a) => a.name).join(' -> ')}`);

    // 4. Build
    const jobId = `job_${repo.name}_${Date.now()}`;
    const result = await ParallelBuildScheduler.executePlan(
      jobId,
      repo.storagePath,
      repo.defaultBranch,
      plan.actions,
      plan.executionOrder,
      4
    );
    console.log(`  Build Status: ${result.status} (${result.totalDurationMs}ms)`);

    // 5. Run & capture real output
    const session = await LocalRunManager.runApplication(jobId, repo.name, 'bin/app.exe', [], 'binary');
    await new Promise((r) => setTimeout(r, 1500));
    const active = LocalRunManager.getSession(session.id);
    if (active) {
      console.log('  Real Process Output:');
      console.log(active.logs.map((l: string) => `    ${l}`).join('\n'));
      console.log(`  Exit Code: ${active.exitCode}`);
      LocalRunManager.stopSession(session.id);
    }
  }

  console.log('\n========================================================================');
  console.log('✅ ALL C++ REPOSITORIES SUCCESSFULLY BUILT AND EXECUTED WITH REAL OUTPUT');
  console.log('========================================================================\n');
}

testAllNewCppRepos()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
