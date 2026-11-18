$login = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"login":"testuser1","password":"pass1234"}'
$h = @{ Authorization = "Bearer $($login.token)" }

Write-Host "=== Commit History ==="
$c = Invoke-RestMethod -Uri "http://localhost:5000/api/repositories/testuser1/my-first-repo/commits?ref=main" -Headers $h
Write-Host "Total commits: $($c.commits.Count)"
foreach ($cm in $c.commits) {
    Write-Host "  $($cm.sha.Substring(0,7)) | $($cm.message) | $($cm.authorName)"
}

Write-Host ""
Write-Host "=== File Tree ==="
$t = Invoke-RestMethod -Uri "http://localhost:5000/api/repositories/testuser1/my-first-repo/tree?ref=main" -Headers $h
foreach ($item in $t.tree) {
    Write-Host "  [$($item.type)] $($item.name) (sha: $($item.sha.Substring(0,7)))"
}

Write-Host ""
Write-Host "=== README.md content (via API blob) ==="
$b = Invoke-RestMethod -Uri "http://localhost:5000/api/repositories/testuser1/my-first-repo/blob?ref=main&path=README.md" -Headers $h
Write-Host $b.content

Write-Host ""
Write-Host "=== Branch list ==="
$br = Invoke-RestMethod -Uri "http://localhost:5000/api/repositories/testuser1/my-first-repo/branches" -Headers $h
Write-Host "Branches: $($br.branches -join ', ')"
Write-Host "Default: $($br.defaultBranch)"

Write-Host ""
Write-Host "=== Create new branch 'feature/test' ==="
$newBranch = Invoke-RestMethod -Uri "http://localhost:5000/api/repositories/testuser1/my-first-repo/branches" -Method POST `
    -ContentType "application/json" -Headers $h `
    -Body '{"name":"feature/test","startPoint":"main"}'
Write-Host $newBranch.message

$br2 = Invoke-RestMethod -Uri "http://localhost:5000/api/repositories/testuser1/my-first-repo/branches" -Headers $h
Write-Host "Branches after creation: $($br2.branches -join ', ')"

Write-Host ""
Write-Host "=== Private repo DENIED for testuser2 ==="
$login2 = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"login":"testuser2","password":"pass1234"}'
$h2 = @{ Authorization = "Bearer $($login2.token)" }
try {
    Invoke-RestMethod -Uri "http://localhost:5000/api/repositories/testuser1/private-repo" -Headers $h2
    Write-Host "FAIL: Should have been denied!"
} catch {
    Write-Host "PASS: Access denied for testuser2 to private repo"
}

Write-Host ""
Write-Host "=== Public repo readable by testuser2 (no auth) ==="
try {
    $pub = Invoke-RestMethod -Uri "http://localhost:5000/api/repositories/testuser1/my-first-repo"
    Write-Host "PASS: Public repo accessible without auth - $($pub.repository.name)"
} catch {
    Write-Host "FAIL: Public repo should be accessible without auth"
}
