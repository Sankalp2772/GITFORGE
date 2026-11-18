@echo off
cd /d D:\gitforge\test-workspace\my-first-repo
git config user.email test1@gitforge.dev
git config user.name testuser1
echo # Hello from GitForge Push Test > hello.md
echo This was pushed via Git Smart HTTP >> hello.md
git add hello.md
git commit -m "Add hello.md via push test"
git push http://testuser1:pass1234@localhost:5000/git/testuser1/my-first-repo.git main
echo Push exit code: %errorlevel%
