@echo off
echo --- Verifying push: clone fresh copy ---
git clone http://testuser1:pass1234@localhost:5000/git/testuser1/my-first-repo.git D:\gitforge\test-workspace\verify-clone 2>&1
dir D:\gitforge\test-workspace\verify-clone
echo --- hello.md content: ---
type D:\gitforge\test-workspace\verify-clone\hello.md

echo --- Git log in verify-clone: ---
cd /d D:\gitforge\test-workspace\verify-clone
git log --oneline
