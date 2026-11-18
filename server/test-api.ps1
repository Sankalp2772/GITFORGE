$baseUrl = "http://localhost:5000/api"

Write-Host "=== TEST 1: Health Check ===" -ForegroundColor Cyan
$health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
Write-Host "Status: $($health.status) - $($health.service)" -ForegroundColor Green

Write-Host ""
Write-Host "=== TEST 2: Register User 1 (testuser1) ===" -ForegroundColor Cyan
try {
    $reg1 = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST `
        -ContentType "application/json" `
        -Body '{"username":"testuser1","email":"test1@gitforge.dev","password":"pass1234"}'
    Write-Host "Registered: $($reg1.user.username) | Token: $($reg1.token.Substring(0,20))..." -ForegroundColor Green
    $token1 = $reg1.token
} catch {
    $err = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "Register error: $($err.error)" -ForegroundColor Yellow
    # Try login if already exists
    $login1 = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST `
        -ContentType "application/json" `
        -Body '{"login":"testuser1","password":"pass1234"}'
    Write-Host "Logged in: $($login1.user.username)" -ForegroundColor Green
    $token1 = $login1.token
}

Write-Host ""
Write-Host "=== TEST 3: Register User 2 (testuser2) ===" -ForegroundColor Cyan
try {
    $reg2 = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST `
        -ContentType "application/json" `
        -Body '{"username":"testuser2","email":"test2@gitforge.dev","password":"pass1234"}'
    Write-Host "Registered: $($reg2.user.username)" -ForegroundColor Green
    $token2 = $reg2.token
} catch {
    $err = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "Register error: $($err.error)" -ForegroundColor Yellow
    $login2 = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST `
        -ContentType "application/json" `
        -Body '{"login":"testuser2","password":"pass1234"}'
    Write-Host "Logged in: $($login2.user.username)" -ForegroundColor Green
    $token2 = $login2.token
}

Write-Host ""
Write-Host "=== TEST 4: Get Current User (me) ===" -ForegroundColor Cyan
$me = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method GET `
    -Headers @{ Authorization = "Bearer $token1" }
Write-Host "Me: $($me.user.username) <$($me.user.email)>" -ForegroundColor Green

Write-Host ""
Write-Host "=== TEST 5: Create Public Repository ===" -ForegroundColor Cyan
try {
    $repo = Invoke-RestMethod -Uri "$baseUrl/repositories" -Method POST `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $token1" } `
        -Body '{"name":"my-first-repo","description":"Test repo for GitForge","visibility":"PUBLIC","initializeWithReadme":true}'
    Write-Host "Created repo: $($repo.repository.name)" -ForegroundColor Green
    Write-Host "Clone URL: $($repo.repository.cloneUrl)" -ForegroundColor Green
    $repoOwner = "testuser1"
    $repoName = "my-first-repo"
} catch {
    $errText = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "Repo create error: $($errText.error)" -ForegroundColor Yellow
    $repoOwner = "testuser1"
    $repoName = "my-first-repo"
}

Write-Host ""
Write-Host "=== TEST 6: Create Private Repository ===" -ForegroundColor Cyan
try {
    $privRepo = Invoke-RestMethod -Uri "$baseUrl/repositories" -Method POST `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $token1" } `
        -Body '{"name":"private-repo","description":"Private test repo","visibility":"PRIVATE","initializeWithReadme":true}'
    Write-Host "Created private repo: $($privRepo.repository.name)" -ForegroundColor Green
} catch {
    $errText = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "Private repo error: $($errText.error)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== TEST 7: List Repositories (authenticated) ===" -ForegroundColor Cyan
$repos = Invoke-RestMethod -Uri "$baseUrl/repositories" -Method GET `
    -Headers @{ Authorization = "Bearer $token1" }
Write-Host "Total repos visible to testuser1: $($repos.repositories.Count)" -ForegroundColor Green
foreach ($r in $repos.repositories) {
    Write-Host "  - $($r.owner.username)/$($r.name) [$($r.visibility)]" -ForegroundColor White
}

Write-Host ""
Write-Host "=== TEST 8: Fetch Repo Details ===" -ForegroundColor Cyan
$repoDetails = Invoke-RestMethod -Uri "$baseUrl/repositories/$repoOwner/$repoName" -Method GET `
    -Headers @{ Authorization = "Bearer $token1" }
Write-Host "Repo: $($repoDetails.repository.name) | Default Branch: $($repoDetails.repository.defaultBranch)" -ForegroundColor Green
Write-Host "Branches: $($repoDetails.repository.branches -join ', ')" -ForegroundColor Green

Write-Host ""
Write-Host "=== TEST 9: Get Commit History ===" -ForegroundColor Cyan
$commits = Invoke-RestMethod -Uri "$baseUrl/repositories/$repoOwner/$repoName/commits?ref=main" -Method GET `
    -Headers @{ Authorization = "Bearer $token1" }
Write-Host "Commits: $($commits.commits.Count)" -ForegroundColor Green
foreach ($c in $commits.commits) {
    Write-Host "  - $($c.sha.Substring(0,7)) $($c.message) by $($c.authorName)" -ForegroundColor White
}

Write-Host ""
Write-Host "=== TEST 10: Private Repo Access by testuser2 (should fail) ===" -ForegroundColor Cyan
try {
    $denied = Invoke-RestMethod -Uri "$baseUrl/repositories/testuser1/private-repo" -Method GET `
        -Headers @{ Authorization = "Bearer $token2" }
    Write-Host "ERROR: Should have been denied!" -ForegroundColor Red
} catch {
    Write-Host "Correctly denied: $($_.Exception.Message)" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== ALL TESTS COMPLETE ===" -ForegroundColor Cyan
