$ErrorActionPreference = "Stop"
$testDir = "D:\gitforge\test-workspace"

Write-Host "=== GIT SMART HTTP TESTS ===" -ForegroundColor Cyan
Write-Host ""

# Clean up previous run
if (Test-Path $testDir) { Remove-Item -Recurse -Force $testDir }
New-Item -ItemType Directory -Path $testDir | Out-Null

# 1. Get login token
Write-Host "--- Authenticating testuser1 ---" -ForegroundColor Yellow
$login = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST `
    -ContentType "application/json" `
    -Body '{"login":"testuser1","password":"pass1234"}'
Write-Host "OK: Authenticated as $($login.user.username)" -ForegroundColor Green

# 2. Clone the public repo via Git Smart HTTP
Write-Host ""
Write-Host "--- Cloning public repo via Git HTTP (with Basic Auth) ---" -ForegroundColor Yellow
$cloneDir = "$testDir\my-first-repo"
$env:GIT_TERMINAL_PROMPT = "0"  # Prevent git from prompting
$gitOutput = git clone "http://testuser1:pass1234@localhost:5000/git/testuser1/my-first-repo.git" $cloneDir 2>&1
Write-Host $gitOutput -ForegroundColor Gray
if (Test-Path "$cloneDir\.git") {
    Write-Host "OK: Cloned successfully to $cloneDir" -ForegroundColor Green
} else {
    Write-Host "FAIL: Clone directory not created" -ForegroundColor Red
    exit 1
}

# 3. Verify README.md exists from initial commit
Write-Host ""
Write-Host "--- Verifying initial README.md ---" -ForegroundColor Yellow
if (Test-Path "$cloneDir\README.md") {
    $readmeContent = Get-Content "$cloneDir\README.md" -Raw
    Write-Host "OK: README.md exists, content:" -ForegroundColor Green
    Write-Host $readmeContent.Trim() -ForegroundColor Gray
} else {
    Write-Host "FAIL: README.md not found" -ForegroundColor Red
}

# 4. Add a new file and commit
Write-Host ""
Write-Host "--- Adding new file and committing ---" -ForegroundColor Yellow
Set-Location $cloneDir
git config user.email "test1@gitforge.dev"
git config user.name "testuser1"
"# Hello from GitForge Push Test`n`nThis file was pushed via Git Smart HTTP." | Set-Content "hello.md"
git add hello.md
git commit -m "Add hello.md via push test"
Write-Host "OK: Committed hello.md" -ForegroundColor Green

# 5. Push to GitForge
Write-Host ""
Write-Host "--- Pushing to GitForge via Git Smart HTTP ---" -ForegroundColor Yellow
$pushOutput = git push "http://testuser1:pass1234@localhost:5000/git/testuser1/my-first-repo.git" main 2>&1
Write-Host $pushOutput -ForegroundColor Gray
Write-Host "OK: Push completed" -ForegroundColor Green

# 6. Test unauthorized push (testuser2 pushes to testuser1's repo - should fail)
Write-Host ""
Write-Host "--- Testing unauthorized push (testuser2 -> testuser1 public repo) ---" -ForegroundColor Yellow
try {
    $unauthorizedPush = git push "http://testuser2:pass1234@localhost:5000/git/testuser1/my-first-repo.git" main 2>&1
    Write-Host "FAIL: Should have been rejected!" -ForegroundColor Red
} catch {
    Write-Host "OK: Unauthorized push rejected (as expected)" -ForegroundColor Green
}

# 7. Fresh clone into second directory
Write-Host ""
Write-Host "--- Cloning to verify pushed files are available ---" -ForegroundColor Yellow
$verifyDir = "$testDir\verify-clone"
git clone "http://testuser1:pass1234@localhost:5000/git/testuser1/my-first-repo.git" $verifyDir 2>&1 | Out-Null
if (Test-Path "$verifyDir\hello.md") {
    Write-Host "OK: hello.md exists in fresh clone!" -ForegroundColor Green
    Get-Content "$verifyDir\hello.md" | Write-Host -ForegroundColor Gray
} else {
    Write-Host "FAIL: hello.md not found in fresh clone" -ForegroundColor Red
}

# 8. Verify commit history via API
Write-Host ""
Write-Host "--- Verifying commit history via API ---" -ForegroundColor Yellow
$commits = Invoke-RestMethod -Uri "http://localhost:5000/api/repositories/testuser1/my-first-repo/commits?ref=main" -Method GET `
    -Headers @{ Authorization = "Bearer $($login.token)" }
Write-Host "Total commits: $($commits.commits.Count)" -ForegroundColor Green
foreach ($c in $commits.commits) {
    Write-Host "  - $($c.sha.Substring(0,7)) | $($c.message) | by $($c.authorName)" -ForegroundColor White
}

# 9. Get file tree via API
Write-Host ""
Write-Host "--- Fetching file tree via API ---" -ForegroundColor Yellow
$tree = Invoke-RestMethod -Uri "http://localhost:5000/api/repositories/testuser1/my-first-repo/tree?ref=main" -Method GET `
    -Headers @{ Authorization = "Bearer $($login.token)" }
Write-Host "Files in repo:" -ForegroundColor Green
foreach ($item in $tree.tree) {
    Write-Host "  [$($item.type)] $($item.name)" -ForegroundColor White
}

# 10. Get blob content via API
Write-Host ""
Write-Host "--- Fetching README.md content via API ---" -ForegroundColor Yellow
$blob = Invoke-RestMethod -Uri "http://localhost:5000/api/repositories/testuser1/my-first-repo/blob?ref=main&path=README.md" -Method GET `
    -Headers @{ Authorization = "Bearer $($login.token)" }
Write-Host "README.md content:" -ForegroundColor Green
Write-Host $blob.content -ForegroundColor Gray

# 11. Test clone private repo without auth (should fail)
Write-Host ""
Write-Host "--- Testing private repo clone without auth ---" -ForegroundColor Yellow
$env:GIT_TERMINAL_PROMPT = "0"
try {
    $privateCloneAttempt = git clone "http://localhost:5000/git/testuser1/private-repo.git" "$testDir\private-clone-attempt" 2>&1
    if (Test-Path "$testDir\private-clone-attempt\.git") {
        Write-Host "FAIL: Private clone should have been rejected!" -ForegroundColor Red
    } else {
        Write-Host "OK: Private clone rejected (no .git directory created)" -ForegroundColor Green
    }
} catch {
    Write-Host "OK: Private clone rejected with error" -ForegroundColor Green
}

# 12. Test branch listing via API
Write-Host ""
Write-Host "--- Listing branches via API ---" -ForegroundColor Yellow
$branches = Invoke-RestMethod -Uri "http://localhost:5000/api/repositories/testuser1/my-first-repo/branches" -Method GET `
    -Headers @{ Authorization = "Bearer $($login.token)" }
Write-Host "Branches: $($branches.branches -join ', ')" -ForegroundColor Green
Write-Host "Default: $($branches.defaultBranch)" -ForegroundColor Green

Write-Host ""
Write-Host "=== ALL GIT TESTS COMPLETE ===" -ForegroundColor Cyan

# Clean up
Set-Location "D:\gitforge"
