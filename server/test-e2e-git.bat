@echo off
setlocal enabledelayedexpansion

echo =========================================================
echo   GITFORGE PHASE 3: COMPREHENSIVE NATIVE GIT E2E TEST
echo =========================================================

set WORKSPACE=D:\gitforge\test-e2e-git
if exist "%WORKSPACE%" rmdir /s /q "%WORKSPACE%"
mkdir "%WORKSPACE%"

echo.
echo [1] Testing Clone from User1 (alice)
git clone http://alice:DemoPassword123!@localhost:5000/git/alice/core-runtime.git "%WORKSPACE%\alice-local" 2>&1
if not exist "%WORKSPACE%\alice-local\.git" (
    echo FAIL: Failed to clone alice repo
    exit /b 1
)
echo SUCCESS: Clone successful!

echo.
echo [2] Configuring local committer and adding multiple commits
cd /d "%WORKSPACE%\alice-local"
git config user.name "Alice Engineer"
git config user.email "alice@gitforge.dev"

echo // Module A > module_a.js
git add module_a.js
git commit -m "feat: Add module_a"

echo // Module B > module_b.js
git add module_b.js
git commit -m "feat: Add module_b"

echo.
echo [3] Pushing multiple commits to main
git push origin main 2>&1
if %errorlevel% neq 0 (
    echo FAIL: Push failed
    exit /b 1
)
echo SUCCESS: Pushed commits to origin main!

echo.
echo [4] Creating feature branch feature/threadpool and pushing to remote
git checkout -b feature/threadpool
echo // Optimized Thread Pool > threadpool.js
git add threadpool.js
git commit -m "feat: Implement threadpool optimization"
git push -u origin feature/threadpool 2>&1
if %errorlevel% neq 0 (
    echo FAIL: Push feature branch failed
    exit /b 1
)
echo SUCCESS: Pushed feature/threadpool to remote!

echo.
echo [5] Testing Collaborator (bob) Clone and Push with WRITE role
git clone http://bob:DemoPassword123!@localhost:5000/git/alice/core-runtime.git "%WORKSPACE%\bob-local" 2>&1
cd /d "%WORKSPACE%\bob-local"
git config user.name "Bob Collaborator"
git config user.email "bob@gitforge.dev"
git checkout -b bob-feature
echo // Bob contribution > bob_work.txt
git add bob_work.txt
git commit -m "feat: Bob work"
git push -u origin bob-feature 2>&1
if %errorlevel% neq 0 (
    echo FAIL: Bob WRITE push failed
    exit /b 1
)
echo SUCCESS: Collaborator Bob pushed branch bob-feature successfully!

echo.
echo [6] Testing Unauthorized User (testuser2) push rejection to alice/core-runtime
cd /d "%WORKSPACE%\bob-local"
git push http://testuser2:pass1234@localhost:5000/git/alice/core-runtime.git bob-feature:testuser2-bad 2>&1
if %errorlevel% equ 0 (
    echo FAIL: Unauthorized push should have failed!
    exit /b 1
) else (
    echo SUCCESS: Unauthorized user push correctly rejected with 401/403!
)

echo.
echo [7] Clean up e2e git workspace
cd /d D:\gitforge
rmdir /s /q "%WORKSPACE%"

echo.
echo =========================================================
echo   ALL NATIVE GIT E2E TESTS PASSED PERFECTLY!
echo =========================================================
