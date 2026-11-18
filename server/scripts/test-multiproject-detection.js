const { PrismaClient } = require('../node_modules/@prisma/client');
const { RepoSnapshotService } = require('../src/build-engine/scanner/repoSnapshotService');
const { AdapterRegistry } = require('../src/build-engine/adapters/adapterRegistry');

// We will test using direct internal services
const prisma = new PrismaClient();

async function runTest() {
  console.log('===========================================================');
  console.log('🧪 MULTI-PROJECT DETECTION & ADAPTER INTEGRATION TEST');
  console.log('===========================================================');

  const repos = await prisma.repository.findMany({ include: { owner: true } });
  console.log(`Found ${repos.length} repositories in GitForge:`);
  for (const r of repos) {
    console.log(` - ${r.owner.username}/${r.name} (${r.id})`);
  }

  for (const r of repos) {
    console.log('\n-----------------------------------------------------------');
    console.log(`🔍 Testing Detection on: ${r.owner.username}/${r.name}`);
    console.log('-----------------------------------------------------------');

    try {
      const files = await RepoSnapshotService.listFilesAtCommit(r.storagePath, r.defaultBranch);
      console.log(`Files count: ${files.length}`);

      const readFileHelper = async (relPath) => {
        try {
          const buf = await RepoSnapshotService.readFileAtCommit(r.storagePath, r.defaultBranch, relPath);
          return buf.toString('utf-8');
        } catch {
          return null;
        }
      };

      const match = await AdapterRegistry.detectProject(files, readFileHelper);
      if (!match) {
        console.log('❌ Project not detected');
        continue;
      }

      const { adapter, detection } = match;
      console.log(`✅ Detected Kind:        ${detection.kind.toUpperCase()}`);
      console.log(`✅ Project Name:          ${detection.name}`);
      console.log(`✅ Confidence:            ${(detection.confidence * 100).toFixed(0)}%`);
      console.log(`✅ Primary Language:      ${detection.primaryLanguage}`);
      console.log(`✅ Frameworks:            ${detection.frameworks.join(', ')}`);
      console.log(`✅ Build System:          ${detection.buildSystem}`);
      console.log(`✅ Entry Point:           ${detection.entryPoint}`);
      console.log(`✅ Evidence:`);
      detection.evidence.forEach(e => console.log(`   • ${e}`));

      // Validate Environment
      console.log(`\n📋 Environment Validation:`);
      const env = await adapter.validateEnvironment(detection);
      console.log(`   Overall Valid: ${env.valid ? '✅ YES' : '⚠️ NO'}`);
      for (const t of env.tools) {
        console.log(`   • Tool: ${t.name} -> ${t.installed ? 'INSTALLED (' + t.version + ')' : 'MISSING'}`);
      }
      for (const s of env.services) {
        console.log(`   • Service: ${s.name} (${s.host}:${s.port}) -> ${s.available ? '✅ RUNNING' : '❌ NOT REACHABLE'}`);
      }

      // Check Dependencies
      console.log(`\n📦 Dependencies Check:`);
      const deps = await adapter.checkDependencies(r.storagePath, detection);
      console.log(`   Installed: ${deps.installed ? '✅ YES' : '❌ NO'}`);
      if (deps.suggestedInstallCommand) {
        console.log(`   Install command: ${deps.suggestedInstallCommand.command} ${deps.suggestedInstallCommand.args.join(' ')}`);
      }

      // Run Configurations
      console.log(`\n🚀 Available Run Configurations:`);
      const runConfigs = await adapter.getRunConfigurations(r.storagePath, detection);
      for (const rc of runConfigs) {
        console.log(`   • [${rc.type.toUpperCase()}] ${rc.name} -> ${rc.command} ${rc.args.join(' ')} (default port: ${rc.defaultPort || 'N/A'})`);
        if (rc.dependsOn && rc.dependsOn.length > 0) {
          console.log(`     Depends on: ${rc.dependsOn.join(' -> ')}`);
        }
      }

      // Generate Build Plan DAG
      console.log(`\n⚙️ Generating Build Action DAG:`);
      const plan = await adapter.generateBuildPlan({
        repositoryId: r.id,
        repoPath: r.storagePath,
        commitSha: r.defaultBranch,
        changedFiles: [],
        affectedFiles: [],
        detection,
      });

      console.log(`   Plan ID: ${plan.id}`);
      console.log(`   Total Targets: ${plan.totalTargetCount}`);
      console.log(`   Execution Order: ${plan.executionOrder.join(' -> ')}`);
      console.log(`   Has Cycle: ${plan.hasCycle ? '⚠️ YES' : '✅ NO'}`);
      console.log(`   Parallel Batches: ${plan.independentBatches.map(b => '[' + b.join(', ') + ']').join(' -> ')}`);

    } catch (err) {
      console.error(`Error testing ${r.name}:`, err.message);
    }
  }

  await prisma.$disconnect();
  console.log('\n===========================================================');
  console.log('✅ ALL INTEGRATION TESTS COMPLETED');
  console.log('===========================================================');
}

runTest().catch(console.error);
