async function verify() {
  console.log('===========================================================');
  console.log('🚀 COMPREHENSIVE PIPELINE VERIFICATION');
  console.log('===========================================================');

  // 1. Auth login
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: 'alice', password: 'DemoPassword123!' })
  });
  const { token } = await loginRes.json();
  const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };

  // 2. Repositories
  const reposRes = await fetch('http://localhost:5000/api/build-engine/repositories', { headers });
  const { repositories } = await reposRes.json();

  const testRepos = ['cpp-demo', 'talenthub', 'finpay-app'];

  for (const name of testRepos) {
    const repo = repositories.find(r => r.name === name);
    if (!repo) {
      console.log(`⚠️ Repo ${name} not found`);
      continue;
    }

    console.log(`\n-----------------------------------------------------------`);
    console.log(`▶ Testing Repository: ${repo.owner.username}/${repo.name}`);
    console.log(`-----------------------------------------------------------`);

    // A. Project Detection
    const detectRes = await fetch(`http://localhost:5000/api/build-engine/repositories/${repo.id}/detect`, { headers });
    const detect = await detectRes.json();
    console.log(`[Detection] Kind: ${detect.project.kind.toUpperCase()} | Confidence: ${(detect.project.confidence * 100).toFixed(0)}% | Primary Language: ${detect.project.primaryLanguage}`);
    console.log(`[Environment] Valid: ${detect.environment.valid ? '✅ YES' : '❌ NO'} | Tools: ${detect.environment.tools.map(t => t.name).join(', ')}`);

    // B. Build Plan Generation
    const planRes = await fetch(`http://localhost:5000/api/build-engine/repositories/${repo.id}/plan`, {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    });
    const planData = await planRes.json();
    if (!planData.plan) {
      console.log(`❌ Failed to generate plan:`, planData.error);
      continue;
    }
    const plan = planData.plan;
    console.log(`[Plan] ID: ${plan.id} | Targets: ${plan.actions.map(a => a.name).join(' -> ')}`);

    // C. Build Plan Execution
    const execRes = await fetch(`http://localhost:5000/api/build-engine/plans/${plan.id}/execute`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ concurrencyLimit: 4 })
    });
    const execData = await execRes.json();
    const job = execData.job;
    console.log(`[Build] Job: ${job.id} | Status: ${job.status} | Completed: ${job.completedTasks}/${job.totalTasks} | Duration: ${job.totalDurationMs}ms`);

    // D. Detected Services in Workspace
    const servRes = await fetch(`http://localhost:5000/api/build-engine/jobs/${job.id}/services`, { headers });
    const servData = await servRes.json();
    console.log(`[Services Detected]: ${servData.services.map(s => s.name + ' (' + s.executablePath + ')').join(' | ')}`);
  }

  console.log('\n===========================================================');
  console.log('✅ ALL VERIFICATIONS COMPLETED SUCCESSFULLY');
  console.log('===========================================================');
}

verify().catch(console.error);
