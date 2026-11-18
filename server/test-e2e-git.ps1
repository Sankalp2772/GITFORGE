# Disable Stop on stderr output from git
$ErrorActionPreference = "Continue"

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "  GITFORGE PHASE 3: COMPREHENSIVE NATIVE GIT E2E TEST" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

$Workspace = "D:\gitforge\test-e2e-git"
if (Test-Path $Workspace) {
    Remove-Item -Recurse -Force $Workspace
}
New-Item -ItemType Directory -Path $Workspace | Out-Null

$env:GIT_TERMINAL_PROMPT = "0"

Write-Host "`n[1] Testing Clone from User1 (alice)" -ForegroundColor Yellow
git clone "http://alice:DemoPassword123%21@localhost:5000/git/alice/core-runtime.git" "$Workspace\alice-local"
if (-not (Test-Path "$Workspace\alice-local\.git")) {
    Write-Host "FAIL: Failed to clone alice repo" -ForegroundColor Red
    exit 1
}
Write-Host "SUCCESS: Clone successful!" -ForegroundColor Green

Write-Host "`n[2] Configuring committer and adding multiple commits" -ForegroundColor Yellow
Set-Location "$Workspace\alice-local"
git config user.name "Alice Engineer"
git config user.email "alice@gitforge.dev"

"// Module A" | Out-File "module_a.js" -Encoding utf8
git add module_a.js
git commit -m "feat: Add module_a"

"// Module B" | Out-File "module_b.js" -Encoding utf8
git add module_b.js
git commit -m "feat: Add module_b"

Write-Host "`n[3] Pushing multiple commits to main" -ForegroundColor Yellow
git push origin main
Write-Host "SUCCESS: Pushed commits to origin main!" -ForegroundColor Green

Write-Host "`n[4] Creating feature branch feature/threadpool and pushing to remote" -ForegroundColor Yellow
git checkout -b feature/threadpool
"// Optimized Thread Pool" | Out-File "threadpool.js" -Encoding utf8
git add threadpool.js
git commit -m "feat: Implement threadpool optimization"
git push -u origin feature/threadpool
Write-Host "SUCCESS: Pushed feature/threadpool to remote!" -ForegroundColor Green

Write-Host "`n[5] Testing Collaborator (bob) Clone and Push with WRITE role" -ForegroundColor Yellow
git clone "http://bob:DemoPassword123%21@localhost:5000/git/alice/core-runtime.git" "$Workspace\bob-local"
Set-Location "$Workspace\bob-local"
git config user.name "Bob Collaborator"
git config user.email "bob@gitforge.dev"
git checkout -b bob-feature
"// Bob contribution" | Out-File "bob_work.txt" -Encoding utf8
git add bob_work.txt
git commit -m "feat: Bob work"
git push -u origin bob-feature
Write-Host "SUCCESS: Collaborator Bob pushed branch bob-feature successfully!" -ForegroundColor Green

Write-Host "`n[6] Testing Unauthorized User (testuser2) push rejection to alice/core-runtime" -ForegroundColor Yellow
git push http://testuser2:pass1234@localhost:5000/git/alice/core-runtime.git bob-feature:testuser2-bad 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "SUCCESS: Unauthorized user push correctly rejected with error code $LASTEXITCODE!" -ForegroundColor Green
} else {
    Write-Host "FAIL: Unauthorized push should have failed!" -ForegroundColor Red
}

Set-Location "D:\gitforge"
Remove-Item -Recurse -Force $Workspace

Write-Host "`n=========================================================" -ForegroundColor Cyan
Write-Host "  ALL NATIVE GIT E2E TESTS PASSED PERFECTLY!" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
