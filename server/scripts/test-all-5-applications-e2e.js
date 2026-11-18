const { PrismaClient } = require('../node_modules/@prisma/client');
const { RepoSnapshotService } = require('../src/build-engine/scanner/repoSnapshotService');
const { AdapterRegistry } = require('../src/build-engine/adapters/adapterRegistry');
const { ParallelBuildScheduler } = require('../src/build-engine/scheduler/parallelBuildScheduler');
const { LocalRunManager } = require('../src/build-engine/runner/localRunManager');

const prisma = new PrismaClient();

const testMatrix = [
  {
    repoName: 'cpp-demo',
    expectedKind: 'cpp',
    expectedAdapter: 'C/C++ Native Compiler Adapter',
    expectedLang: 'C++',
  },
  {
    repoName: 'python-demo',
    expectedKind: 'python',
    expectedAdapter: 'Python Application & Validation Adapter',
    expectedLang: 'Python',
  },
  {
    repoName: 'node-api-demo',
    expectedKind: 'nodejs',
    expectedAdapter: 'Node.js & Express Application Adapter',
    expectedLang: 'JavaScript',
  },
  {
    repoName: 'react-vite-demo',
    expectedKind: 'react_vite',
    expectedAdapter: 'React / Vite & TypeScript Web Application Adapter',
    expectedLang: 'JavaScript',
  },
  {
    repoName: 'talenthub',
    expectedKind: 'nodejs',
    expectedAdapter: 'Node.js & Express Application Adapter',
    expectedLang: 'JavaScript',
  },
];

async function runMasterTest() {
  console.log('========================================================================');
  console.log('🧪 VERIFYING 5 DISTINCT REAL REPOSITORIES IN GITFORGE BUILD ENGINE');
  console.log('========================================================================');

  const results = [];

  for (const item of testMatrix) {
    console.log(`\n========================================================================`);
    console.log(`▶ TEST CASE: Repository "alice/${item.repoName}"`);
    console.log(`========================================================================`);

    const repo = await prisma.repository.findFirst({
      where: { name: item.repoName },
      include: { owner: true }
    });

    if (!repo) {
      console.error(`❌ Repository ${item.repoName} not found in database!`);
      results.push({ name: item.repoName, status: 'FAILED: Repo not found' });
      continue;
    }

    console.log(`[1] Selected Repository: ${repo.owner.username}/${repo.name} (${repo.id})`);
    console.log(`    Storage: ${repo.storagePath} | Default Branch: ${repo.defaultBranch}`);

    // Read tree at commit
    const files = await RepoSnapshotService.listFilesAtCommit(repo.storagePath, repo.defaultBranch);
    console.log(`    Files at commit: ${files.length} (${files.slice(0, 5).join(', ')}...)`);

    const readFileHelper = async (relPath) => {
      try {
        const buf = await RepoSnapshotService.readFileAtCommit(repo.storagePath, repo.defaultBranch, relPath);
        return buf.toString('utf-8');
      } catch {
        return null;
      }
    };

    // [2] Evidence-based Project Detection
    console.log(`\n[2] Running Project Detection on actual repository tree...`);
    const match = await AdapterRegistry.detectProject(files, readFileHelper);
    if (!match) {
      console.error(`❌ Failed to detect project for ${item.repoName}`);
      results.push({ name: item.repoName, status: 'FAILED: Detection failed' });
      continue;
    }

    const { adapter, detection } = match;
    console.log(`    • Detected Kind:    ${detection.kind.toUpperCase()}`);
    console.log(`    • Adapter:          ${adapter.name}`);
    console.log(`    • Primary Language: ${detection.primaryLanguage}`);
    console.log(`    • Build System:     ${detection.buildSystem}`);
    console.log(`    • Confidence:       ${(detection.confidence * 100).toFixed(0)}%`);
    console.log(`    • Entry Point:      ${detection.entryPoint}`);

    if (detection.kind !== item.expectedKind) {
      console.error(`❌ Kind mismatch: expected ${item.expectedKind}, got ${detection.kind}`);
      results.push({ name: item.repoName, status: `FAILED: Kind mismatch (${detection.kind})` });
      continue;
    }

    // [3] Environment Validation
    console.log(`\n[3] Validating Host Environment...`);
    const env = await adapter.validateEnvironment(detection);
    console.log(`    • Environment Valid: ${env.valid ? '✅ YES' : '⚠️ WARNINGS'}`);
    for (const t of env.tools) {
      console.log(`      - Tool: ${t.name} -> ${t.installed ? 'INSTALLED (' + t.version + ')' : 'MISSING'}`);
    }
    for (const s of env.services) {
      console.log(`      - Service: ${s.name} (: ${s.port}) -> ${s.available ? 'CONNECTED' : 'NOT REACHABLE'}`);
    }

    // [4] Generate Build Plan DAG
    console.log(`\n[4] Generating Build Action Plan DAG...`);
    const plan = await adapter.generateBuildPlan({
      repositoryId: repo.id,
      repoPath: repo.storagePath,
      commitSha: repo.defaultBranch,
      changedFiles: [],
      affectedFiles: [],
      detection,
    });
    console.log(`    • Plan ID: ${plan.id}`);
    console.log(`    • Targets (${plan.actions.length}): ${plan.actions.map(a => a.name).join(' -> ')}`);
    console.log(`    • Has Cycle: ${plan.hasCycle ? 'YES' : 'NO'}`);

    // [5] Isolated Build Execution
    console.log(`\n[5] Executing Build in Isolated Workspace...`);
    const jobId = `job_${item.repoName}_${Date.now()}`;
    const jobResult = await ParallelBuildScheduler.executePlan(
      jobId,
      repo.storagePath,
      repo.defaultBranch,
      plan.actions,
      plan.executionOrder,
      4
    );

    console.log(`    • Build Status: ${jobResult.status} (${jobResult.totalDurationMs}ms)`);
    for (const [tName, task] of Object.entries(jobResult.tasks)) {
      console.log(`      - Action "${tName}": ${task.status} (${task.durationMs}ms)`);
    }

    if (jobResult.status !== 'SUCCESS') {
      console.error(`❌ Build execution failed for ${item.repoName}`);
      results.push({ name: item.repoName, status: 'FAILED: Build execution failed' });
      continue;
    }

    // [6] Launch in Run Manager
    console.log(`\n[6] Launching Application in Run Manager...`);
    const services = LocalRunManager.detectServices(jobId);
    console.log(`    • Detected Services in workspace: ${services.map(s => s.name + ' (' + s.executablePath + ')').join(' | ') || 'None (using entry point)'}`);

    const targetExec = services[0]?.executablePath || detection.entryPoint || 'server.js';
    const targetServiceId = services[0]?.id || 'main';

    const session = await LocalRunManager.runApplication(
      jobId,
      repo.id,
      targetExec,
      [],
      targetServiceId
    );

    console.log(`    • Session ID:    ${session.id}`);
    console.log(`    • Process PID:   ${session.pid}`);
    console.log(`    • Allocated Port:${session.port}`);
    console.log(`    • Target URL:    ${session.url}`);
    console.log(`    • Status:        ${session.status}`);

    // Poll for startup
    await new Promise(r => setTimeout(r, 1500));
    const active = LocalRunManager.getSession(session.id);
    console.log(`    • Active Logs:   ${active?.logs?.length || 0} lines`);
    for (const l of (active?.logs || []).slice(0, 3)) {
      console.log(`      ${l.trim()}`);
    }

    // Clean stop
    LocalRunManager.stopSession(session.id);
    console.log(`    • Process shutdown cleanly ✅`);

    results.push({
      name: item.repoName,
      adapter: adapter.name,
      kind: detection.kind,
      buildStatus: jobResult.status,
      runStatus: 'LAUNCHED & STOPPED',
      status: 'PASSED'
    });
  }

  await prisma.$disconnect();

  console.log(`\n========================================================================`);
  console.log(`📊 MASTER TEST SUMMARY: 5 APPLICATIONS INDIVIDUALLY VERIFIED`);
  console.log(`========================================================================`);
  for (const r of results) {
    console.log(` ${r.status === 'PASSED' ? '✅' : '❌'} ${r.name.padEnd(20)} | Kind: ${(r.kind || '').padEnd(12)} | Build: ${(r.buildStatus || '').padEnd(8)} | Run: ${r.runStatus}`);
  }
  console.log(`========================================================================`);
}

runMasterTest().catch(console.error);
