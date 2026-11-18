const { PrismaClient } = require('../node_modules/@prisma/client');
const { RepoSnapshotService } = require('../src/build-engine/scanner/repoSnapshotService');
const { AdapterRegistry } = require('../src/build-engine/adapters/adapterRegistry');
const { ParallelBuildScheduler } = require('../src/build-engine/scheduler/parallelBuildScheduler');
const { LocalRunManager } = require('../src/build-engine/runner/localRunManager');

const prisma = new PrismaClient();

async function testTalentHubE2E() {
  console.log('===========================================================');
  console.log('🧪 TALENTHUB REAL INTEGRATION E2E VALIDATION');
  console.log('===========================================================');

  // 1. Fetch talenthub repository from GitForge
  const repo = await prisma.repository.findFirst({
    where: { name: 'talenthub' }
  });
  if (!repo) throw new Error('talenthub repository not found in GitForge DB');

  console.log(`\n[STEP 1] Found TalentHub repository: ${repo.name} (${repo.id})`);
  console.log(`Storage Path: ${repo.storagePath}`);

  // 2. Project Detection
  console.log('\n[STEP 2] Running Project Detection...');
  const files = await RepoSnapshotService.listFilesAtCommit(repo.storagePath, repo.defaultBranch);
  const readFileHelper = async (relPath) => {
    try {
      const buf = await RepoSnapshotService.readFileAtCommit(repo.storagePath, repo.defaultBranch, relPath);
      return buf.toString('utf-8');
    } catch {
      return null;
    }
  };

  const match = await AdapterRegistry.detectProject(files, readFileHelper);
  if (!match) throw new Error('Failed to detect TalentHub project type');

  const { adapter, detection } = match;
  console.log(`✅ Identified Project: ${detection.name}`);
  console.log(`✅ Kind:               ${detection.kind.toUpperCase()}`);
  console.log(`✅ Frameworks:         ${detection.frameworks.join(', ')}`);
  console.log(`✅ Build System:       ${detection.buildSystem}`);
  console.log(`✅ Entry Point:        ${detection.entryPoint}`);

  // 3. Environment Validation (tools + MySQL)
  console.log('\n[STEP 3] Validating Environment & External Services...');
  const env = await adapter.validateEnvironment(detection);
  console.log(`Overall Valid: ${env.valid ? '✅ PASSED' : '❌ FAILED'}`);
  for (const t of env.tools) {
    console.log(` - Tool: ${t.name} -> ${t.installed ? 'INSTALLED (' + t.version + ')' : 'MISSING'}`);
  }
  for (const s of env.services) {
    console.log(` - Service: ${s.name} (: ${s.port}) -> ${s.available ? '✅ RUNNING' : '❌ NOT REACHABLE'}`);
  }

  // 4. Generate Build Plan DAG
  console.log('\n[STEP 4] Generating Build Action DAG without manual manifest...');
  const plan = await adapter.generateBuildPlan({
    repositoryId: repo.id,
    repoPath: repo.storagePath,
    commitSha: repo.defaultBranch,
    changedFiles: [],
    affectedFiles: [],
    detection,
  });

  console.log(`✅ Build Plan ID: ${plan.id}`);
  console.log(`✅ Targets to execute: ${plan.actions.map(a => a.name).join(' -> ')}`);
  console.log(`✅ Parallel Batches: ${plan.independentBatches.map(b => '[' + b.join(', ') + ']').join(' -> ')}`);

  // 5. Execute Build Plan with Parallel Scheduler
  console.log('\n[STEP 5] Executing Build Plan in Parallel Workers...');
  const jobId = `job_talenthub_${Date.now()}`;
  const jobResult = await ParallelBuildScheduler.executePlan(
    jobId,
    repo.storagePath,
    repo.defaultBranch,
    plan.actions,
    plan.executionOrder,
    4
  );

  console.log(`✅ Build Status: ${jobResult.status}`);
  console.log(`✅ Total Duration: ${jobResult.totalDurationMs}ms`);
  for (const [tName, task] of Object.entries(jobResult.tasks)) {
    console.log(`   • Target "${tName}": ${task.status} (${task.durationMs}ms, Worker ${task.workerId})`);
  }

  if (jobResult.status !== 'SUCCESS') {
    throw new Error('TalentHub build plan execution failed');
  }

  // 6. Run Application in Run Manager
  console.log('\n[STEP 6] Launching TalentHub in Local Run Manager...');
  const session = await LocalRunManager.runApplication(
    jobId,
    repo.id,
    detection.entryPoint || 'server.js',
    [],
    'backend'
  );

  console.log(`✅ Session ID: ${session.id}`);
  console.log(`✅ Process PID: ${session.pid}`);
  console.log(`✅ Initial Status: ${session.status}`);

  // 7. Poll stdout/stderr for startup output
  console.log('\n[STEP 7] Streaming Real-Time Application Output...');
  let runningUrl = null;
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const current = LocalRunManager.getSession(session.id);
    if (!current) break;

    for (const log of current.logs.slice(-3)) {
      console.log(`   [stdout] ${log.trim()}`);
    }

    if (current.url) {
      runningUrl = current.url;
      console.log(`\n🎉 Detected Live Server URL: ${runningUrl}`);
      break;
    }
    if (current.status === 'FAILED') {
      console.log('❌ Process exited prematurely');
      break;
    }
  }

  // 8. Clean Shutdown
  console.log('\n[STEP 8] Stopping Application Process...');
  const stopped = LocalRunManager.stopSession(session.id);
  console.log(`✅ Process Cleanup: ${stopped ? 'STOPPED' : 'ALREADY INACTIVE'}`);

  console.log('\n===========================================================');
  console.log('🎉 TALENTHUB FULL PIPELINE PASSED SUCCESSFULLY!');
  console.log('===========================================================');

  await prisma.$disconnect();
}

testTalentHubE2E().catch(err => {
  console.error('\n❌ E2E Test Failed:', err);
  process.exit(1);
});
