const { execSync } = require('child_process');
const cwd = 'D:/finpay-app';
try {
  execSync('git add scripts/bundle-summary.cjs', { cwd, stdio: 'inherit' });
  execSync('git commit -m "Add bundle summary script"', { cwd, stdio: 'inherit' });
  execSync('git push gitforge master:main', { cwd, stdio: 'inherit' });
  console.log('✓ Successfully committed and pushed scripts/bundle-summary.cjs to GitForge!');
} catch (err) {
  console.error(err.message);
}
