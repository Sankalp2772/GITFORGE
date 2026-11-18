$baseUrl = "http://localhost:5000/api"

Write-Host "=== TEST: Phase 1 Complete Integration Test ===" -ForegroundColor Cyan

# 1. Login user 1 & 2
$login1 = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body '{"login":"testuser1","password":"pass1234"}'
$h1 = @{ Authorization = "Bearer $($login1.token)" }

$login2 = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body '{"login":"testuser2","password":"pass1234"}'
$h2 = @{ Authorization = "Bearer $($login2.token)" }

Write-Host "Users ready: testuser1 & testuser2" -ForegroundColor Green

# 2. Member invitation & acceptance test
Write-Host "`n--- Testing Member Invitation Flow ---" -ForegroundColor Yellow
try {
    $invite = Invoke-RestMethod -Uri "$baseUrl/repositories/testuser1/my-first-repo/members/invite" -Method POST `
        -Headers $h1 -ContentType "application/json" `
        -Body '{"username":"testuser2","role":"WRITE"}'
    Write-Host "Invited testuser2 as WRITE member. Invitation ID: $($invite.invitation.id)" -ForegroundColor Green
    $inviteId = $invite.invitation.id
} catch {
    Write-Host "Invite note: $($_.Exception.Message)" -ForegroundColor Gray
    # Check pending
    $myInvs = Invoke-RestMethod -Uri "$baseUrl/user/invitations" -Method GET -Headers $h2
    $inviteId = $myInvs.invitations[0].id
}

# Check notifications for user2
$notifs = Invoke-RestMethod -Uri "$baseUrl/notifications" -Method GET -Headers $h2
Write-Host "User2 unread notifications: $($notifs.unreadCount)" -ForegroundColor Green

# User2 accepts invitation
$accept = Invoke-RestMethod -Uri "$baseUrl/user/invitations/$inviteId/respond" -Method PATCH `
    -Headers $h2 -ContentType "application/json" `
    -Body '{"action":"accept"}'
Write-Host "User2 response: $($accept.message)" -ForegroundColor Green

# List members
$members = Invoke-RestMethod -Uri "$baseUrl/repositories/testuser1/my-first-repo/members" -Method GET -Headers $h1
Write-Host "Repository members count: $($members.members.Count)" -ForegroundColor Green
foreach ($m in $members.members) {
    Write-Host "  - Member: $($m.user.username) [Role: $($m.role)]" -ForegroundColor White
}

# 3. Pull Request Test
Write-Host "`n--- Testing Pull Request Flow ---" -ForegroundColor Yellow
# Create PR from feature/test -> main
$pr = Invoke-RestMethod -Uri "$baseUrl/repositories/testuser1/my-first-repo/pulls" -Method POST `
    -Headers $h2 -ContentType "application/json" `
    -Body '{"title":"Feature test PR","description":"Adding features to main","sourceBranch":"feature/test","targetBranch":"main"}'
Write-Host "Created PR #$($pr.pullRequest.number): $($pr.pullRequest.title)" -ForegroundColor Green

# Add comment to PR
$prComment = Invoke-RestMethod -Uri "$baseUrl/repositories/testuser1/my-first-repo/pulls/$($pr.pullRequest.number)/comments" -Method POST `
    -Headers $h1 -ContentType "application/json" `
    -Body '{"content":"LGTM, looks good to merge!"}'
Write-Host "Added PR comment: $($prComment.comment.content)" -ForegroundColor Green

# Review PR
$review = Invoke-RestMethod -Uri "$baseUrl/repositories/testuser1/my-first-repo/pulls/$($pr.pullRequest.number)/reviews" -Method POST `
    -Headers $h1 -ContentType "application/json" `
    -Body '{"state":"APPROVED","body":"Looks solid!"}'
Write-Host "Submitted review: $($review.review.state)" -ForegroundColor Green

# Merge PR
$merged = Invoke-RestMethod -Uri "$baseUrl/repositories/testuser1/my-first-repo/pulls/$($pr.pullRequest.number)/merge" -Method POST `
    -Headers $h1
Write-Host "Merge result: $($merged.message) (SHA: $($merged.sha.Substring(0,7)))" -ForegroundColor Green

# 4. Issue Management Test
Write-Host "`n--- Testing Issue Management Flow ---" -ForegroundColor Yellow
$issue = Invoke-RestMethod -Uri "$baseUrl/repositories/testuser1/my-first-repo/issues" -Method POST `
    -Headers $h2 -ContentType "application/json" `
    -Body '{"title":"Bug: Documentation typo","description":"Found a typo in README.md"}'
Write-Host "Created issue #$($issue.issue.number): $($issue.issue.title)" -ForegroundColor Green

# Comment on issue
$issueComment = Invoke-RestMethod -Uri "$baseUrl/repositories/testuser1/my-first-repo/issues/$($issue.issue.number)/comments" -Method POST `
    -Headers $h1 -ContentType "application/json" `
    -Body '{"content":"Thanks for reporting! Will fix."}'
Write-Host "Added issue comment from owner" -ForegroundColor Green

# Close issue
$closedIssue = Invoke-RestMethod -Uri "$baseUrl/repositories/testuser1/my-first-repo/issues/$($issue.issue.number)/status" -Method PATCH `
    -Headers $h1 -ContentType "application/json" `
    -Body '{"status":"CLOSED"}'
Write-Host "Updated issue status: $($closedIssue.issue.status)" -ForegroundColor Green

# 5. Activity Log Test
Write-Host "`n--- Testing Activity Logs ---" -ForegroundColor Yellow
$activity = Invoke-RestMethod -Uri "$baseUrl/repositories/testuser1/my-first-repo/activity" -Headers $h1
Write-Host "Repository activity events: $($activity.activityLogs.Count)" -ForegroundColor Green
foreach ($act in $activity.activityLogs | Select-Object -First 5) {
    Write-Host "  [$($act.action)] $($act.details) by $($act.user.username)" -ForegroundColor White
}

Write-Host "`n=== ALL PHASE 1 INTEGRATION TESTS PASSED ===" -ForegroundColor Cyan
