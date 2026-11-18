const { execSync } = require('child_process');
const cwd = 'D:/finpay-app';

try {
  console.log('1. Adding build.manifest.json...');
  execSync('git add build.manifest.json', { cwd, stdio: 'inherit' });

  console.log('2. Committing build manifest...');
  try {
    execSync('git commit -m "Add build.manifest.json for GitForge Build Engine"', { cwd, stdio: 'inherit' });
  } catch (e) {
    console.log('Already committed or no changes.');
  }

  console.log('3. Configuring gitforge remote...');
  try {
    execSync('git remote remove gitforge', { cwd, stdio: 'ignore' });
  } catch (e) {}

  execSync('git remote add gitforge http://alice:DemoPassword123!@localhost:5000/git/alice/finpay-app.git', { cwd, stdio: 'inherit' });

  console.log('4. Pushing master branch to GitForge (main)...');
  execSync('git push gitforge master:main --force', { cwd, stdio: 'inherit' });

  console.log('\n✓ Successfully pushed D:/finpay-app to GitForge repository: alice/finpay-app!');
} catch (err) {
  console.error('\nPush failed:', err.message);
  process.exit(1);
}
