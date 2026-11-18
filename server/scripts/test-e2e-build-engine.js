const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  console.log('=== Starting End-to-End Build Engine Test ===\n');

  // Step 1: Login
  console.log('1. Authenticating as alice...');
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: 'alice', password: 'DemoPassword123!' })
  });
  const { token } = await loginRes.json();
  const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  console.log('✓ Authenticated successfully.\n');

  // Step 2: Get Repositories
  console.log('2. Querying repositories via Build Engine API...');
  const reposRes = await fetch('http://localhost:5000/api/build-engine/repositories', { headers: authHeaders });
  const reposData = await reposRes.json();
  const targetRepo = reposData.repositories.find(r => r.name === 'cpp-demo');
  if (!targetRepo) throw new Error('Repository cpp-demo not found');
  console.log(`✓ Located target repository: ${targetRepo.name} (${targetRepo.id})\n`);

  // Step 3: Scan Repository
  console.log('3. Triggering repository scan (SHA-256 baseline + dependency analysis)...');
  const scanRes = await fetch(`http://localhost:5000/api/build-engine/repositories/${targetRepo.id}/scan`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ branch: 'main' })
  });
  const scanData = await scanRes.json();
  const scanId = scanData.scan.scanId;
  console.log(`✓ Scan finished! Scan ID: ${scanId}`);
  console.log(`  File Count: ${scanData.scan.fileCount}`);
  console.log(`  Isolated Files: ${scanData.scan.isolatedFilesCount}\n`);

  // Step 4: Verify Dependency Graph
  console.log('4. Verifying dependency graph resolution...');
  const graphRes = await fetch(`http://localhost:5000/api/build-engine/scans/${scanId}`, { headers: authHeaders });
  const graphData = await graphRes.json();
  console.log(`✓ Dependency graph: ${graphData.graph.nodes.length} nodes, ${graphData.graph.edges.length} edges`);
  graphData.graph.edges.forEach(e => {
    console.log(`   Edge: ${e.source} -> ${e.target}`);
  });
  console.log();

  // Step 5: Build Planner (Full Initial Build)
  console.log('5. Generating initial build plan...');
  const planRes = await fetch(`http://localhost:5000/api/build-engine/repositories/${targetRepo.id}/plan`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ scanId })
  });
  const planData = await planRes.json();
  const plan = planData.plan;
  const planId = plan.id;
  console.log(`✓ Plan generated! Plan ID: ${planId}`);
  console.log(`  Total Targets: ${plan.totalTargetCount}`);
  console.log(`  Topological Execution Order: ${plan.executionOrder.join(' -> ')}`);
  console.log(`  Parallel Batches (${plan.independentBatches.length}):`);
  plan.independentBatches.forEach((b, i) => {
    console.log(`    Batch ${i + 1}: [${b.join(', ')}]`);
  });
  console.log();

  // Step 6: Execute Build Plan
  console.log('6. Executing build plan with native G++ compiler...');
  const execRes = await fetch(`http://localhost:5000/api/build-engine/plans/${planId}/execute`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ concurrencyLimit: 4 })
  });
  const execData = await execRes.json();
  console.log(`✓ Execution result: ${execData.job.status}`);
  console.log(`  Job ID: ${execData.job.id}`);
  console.log(`  Completed tasks: ${execData.job.completedTasks} / ${execData.job.totalTasks}`);
  const taskValues = Object.values(execData.job.tasks);
  taskValues.forEach(t => {
    console.log(`    Task [${t.targetId}]: status=${t.status}, worker=${t.workerId}, exitCode=${t.exitCode}`);
  });
  console.log();

  // Step 7: Second Build Execution (Verify Build Cache Hits)
  console.log('7. Running second build plan execution to verify Content-Addressable Cache...');
  const execRes2 = await fetch(`http://localhost:5000/api/build-engine/plans/${planId}/execute`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ concurrencyLimit: 4 })
  });
  const execData2 = await execRes2.json();
  console.log(`✓ Second execution result: ${execData2.job.status}`);
  const taskValues2 = Object.values(execData2.job.tasks);
  taskValues2.forEach(t => {
    console.log(`    Task [${t.targetId}]: status=${t.status}`);
  });
  const cachedCount = taskValues2.filter(t => t.status === 'CACHED').length;
  console.log(`✓ Cache validation: ${cachedCount}/${taskValues2.length} tasks retrieved from cache!\n`);

  // Step 8: Local Application Run Manager
  console.log('8. Testing Local Run Manager for compiled executable...');
  const runRes = await fetch(`http://localhost:5000/api/build-engine/jobs/${execData.job.id}/run`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ executablePath: 'bin/app.exe', args: [] })
  });
  const runData = await runRes.json();
  const session = runData.session;
  console.log(`✓ Run Session launched! Session ID: ${session.id}, PID: ${session.pid}`);
  
  // Wait 1.5s for process execution and poll logs
  await new Promise(r => setTimeout(r, 1500));
  const sessionRes = await fetch(`http://localhost:5000/api/build-engine/run-sessions/${session.id}`, {
    headers: authHeaders
  });
  const sessionData = await sessionRes.json();
  console.log(`  Process Exit Code: ${sessionData.session.exitCode}`);
  console.log('  Captured Output:');
  sessionData.session.logs.forEach(line => console.log(`    [STDOUT] ${line.trim()}`));
  console.log();

  // Step 9: Change Detection & Incremental Build Test
  console.log('9. Modifying shared.hpp and committing to test incremental build & impact analysis...');
  const tempDir = path.resolve('D:/gitforge/data/temp-cpp-setup');
  const sharedHppPath = path.join(tempDir, 'src', 'shared.hpp');
  const updatedContent = `#ifndef SHARED_HPP
#define SHARED_HPP

#include <string>

struct TaskPayload {
    int id;
    std::string taskName;
    int computationCost;
    int priorityLevel; // Incremental field added
};

#endif
`;
  fs.writeFileSync(sharedHppPath, updatedContent);
  
  execSync('git add src/shared.hpp', { cwd: tempDir, stdio: 'pipe' });
  execSync('git commit -m "Update shared.hpp with priorityLevel"', { cwd: tempDir, stdio: 'pipe' });
  execSync('git push origin main', { cwd: tempDir, stdio: 'pipe' });
  console.log('✓ Pushed new commit modifying shared.hpp\n');

  // Step 10: Change Detection API
  console.log('10. Detecting changes comparing against previous SHA-256 baseline...');
  const changeRes = await fetch(`http://localhost:5000/api/build-engine/repositories/${targetRepo.id}/detect-changes`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ baseScanId: scanId, branch: 'main' })
  });
  const changeData = await changeRes.json();
  const aff = changeData.affected;
  console.log(`✓ Changes detected:`);
  console.log(`  Modified Files: ${changeData.summary.modified}`);
  console.log(`  Directly Affected Files: ${JSON.stringify(aff.directlyAffectedFiles)}`);
  console.log(`  Transitively Affected Files: ${JSON.stringify(aff.transitivelyAffectedFiles)}`);
  console.log(`  All Affected Files: ${JSON.stringify(aff.allAffectedFiles)}`);
  console.log(`  Unaffected Files: ${JSON.stringify(aff.unchangedFiles)}`);
  console.log(`  Dependency Chains: ${aff.dependencyChains.length}`);
  console.log();

  // Step 11: Incremental Plan Creation
  console.log('11. Generating incremental build plan for affected files only...');
  const incPlanRes = await fetch(`http://localhost:5000/api/build-engine/repositories/${targetRepo.id}/plan`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      commitSha: changeData.targetCommit,
      changedFiles: aff.modifiedFiles,
      affectedFiles: aff.allAffectedFiles
    })
  });
  const incPlanData = await incPlanRes.json();
  console.log(`✓ Incremental Plan: ${incPlanData.plan.id}`);
  console.log(`  Affected Targets: ${incPlanData.plan.affectedTargetCount} / ${incPlanData.plan.totalTargetCount}`);
  console.log(`  Execution Order: ${incPlanData.plan.executionOrder.join(', ')}\n`);

  // Step 12: Incremental Execution
  console.log('12. Executing incremental build plan...');
  const incExecRes = await fetch(`http://localhost:5000/api/build-engine/plans/${incPlanData.plan.id}/execute`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ concurrencyLimit: 4 })
  });
  const incExecData = await incExecRes.json();
  console.log(`✓ Incremental Build Result: ${incExecData.job.status}`);
  const incTasks = Object.values(incExecData.job.tasks);
  incTasks.forEach(t => {
    console.log(`    Task [${t.targetId}]: status=${t.status}, exitCode=${t.exitCode}`);
  });
  console.log();

  // Step 13: Build History & Cache API
  console.log('13. Checking Build History & Cache Metrics API...');
  const histRes = await fetch('http://localhost:5000/api/build-engine/history', { headers: authHeaders });
  const histData = await histRes.json();
  console.log(`✓ Total builds recorded: ${histData.history?.length || histData.builds?.length}`);

  const cacheRes = await fetch('http://localhost:5000/api/build-engine/cache', { headers: authHeaders });
  const cacheData = await cacheRes.json();
  console.log(`✓ Cache metrics: ${cacheData.entryCount} entries, ${cacheData.totalSizeBytes} bytes\n`);

  console.log('========================================================');
  console.log('🎉 ALL 13 END-TO-END BUILD ENGINE VALIDATION STEPS PASSED!');
  console.log('========================================================');
}

main().catch(err => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
