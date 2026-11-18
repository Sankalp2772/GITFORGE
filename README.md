# GitForge – Phase 1 & Phase 2: Complete Platform Documentation

GitForge is a high-performance, GitHub-like code hosting platform built from scratch with native Git CLI execution, Git Smart HTTP clone/pull/push support, collaboration and member management, and an interactive dark-themed React + Monaco Editor frontend.

---

## 1. System Architecture

- **Root Directory:** `D:\gitforge`
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS (dark theme with purple accents), React Router, Axios, Monaco Editor, Lucide React (`D:\gitforge\client`).
- **Backend:** Node.js, Express, TypeScript, Prisma ORM, MySQL 8.0 / PostgreSQL compatible (`D:\gitforge\server`).
- **Storage:** Bare Git repositories stored at `D:\gitforge\data\repos\{username}\{repository}.git`.
- **Git Smart HTTP:** Custom streaming endpoints for native `git-upload-pack` and `git-receive-pack` supporting standard CLI `git clone`, `git fetch`, and `git push`.
- **Collaboration:** Repository member management with RBAC (`OWNER`, `ADMIN`, `WRITE`, `READ`), Pull Requests with inline unified diffs and Git merging, Issues, and Notifications.

---

## 2. Seeded Test Accounts

The following demo accounts are available in the local database:

| Username | Email | Password | Role Description |
|---|---|---|---|
| `alice` | `alice@gitforge.dev` | `DemoPassword123!` | Repository Owner (`alice/core-runtime`) |
| `bob` | `bob@gitforge.dev` | `DemoPassword123!` | Collaborator (`WRITE` role on `alice/core-runtime`) |
| `testuser1` | `test1@gitforge.dev` | `pass1234` | Integration test user |
| `testuser2` | `test2@gitforge.dev` | `pass1234` | Integration test user |

---

## 3. Running GitForge Locally

### Step 1: Start Backend Server
```bash
cd D:\gitforge\server
npm run dev
# Starts on http://localhost:5000
```

### Step 2: Start Frontend Development Server
```bash
cd D:\gitforge\client
npm run dev
# Starts on http://localhost:5174 (or 5173 if free)
```

The frontend Vite server automatically proxies all `/api` and `/git` requests directly to the backend.

---

## 4. Frontend Feature Walkthrough

1. **Authentication (`/login` & `/register`)**:
   - Username/email login with password visibility toggling, client form validation, and JWT persistence.
2. **Dashboard (`/`)**:
   - Repository overview (Owned + Collaborations), real-time pending invitation acceptance/rejection, recent activity logs, and user profile overview.
3. **Repository Creation (`/new`)**:
   - Create bare repositories with customizable visibility (Public/Private) and optional automatic `README.md` initial commit.
4. **Code Browser (`/:owner/:repo`)**:
   - Native Git tree navigation, branch switcher, branch creation modal, commit preview, and Monaco Editor read-only file viewing.
5. **Commit History (`/:owner/:repo/commits`)**:
   - List commit history with author, date, and SHA, and click any commit to inspect its unified diff.
6. **Member Management (`/:owner/:repo/members`)**:
   - Search users, send invitations with roles (`ADMIN`, `WRITE`, `READ`), view and cancel pending invitations, adjust member roles, or remove members.
7. **Pull Requests (`/:owner/:repo/pulls`)**:
   - Open PRs comparing branches, inspect branch diffs, post comments, approve reviews, and execute automated native Git merges.
8. **Issues (`/:owner/:repo/issues`)**:
   - Open issues, track discussion comments, and toggle status (`OPEN` / `CLOSED`).
9. **Settings (`/:owner/:repo/settings`)**:
   - Modify repository metadata or permanently delete repositories and disk storage.
10. **Explore (`/explore`)**:
    - Search all public Git repositories.
11. **User Profile (`/:username`)**:
    - Update bio and avatar.


---

## 5. Phase 4: Custom Incremental Build & Dependency Resolution Engine

A separate, Bazel-inspired incremental build subsystem integrated into GitForge, accessible directly via the top navigation bar at `/build-engine`.

### Subsystem Architecture

1. **Repository Scanner & SHA-256 Baseline**:
   - Reads exact Git commit snapshots without cloning.
   - Computes deterministic SHA-256 hashes of all source files.
   - Detects project languages and entry points (C/C++, TypeScript/JavaScript, Python).

2. **Source-File Dependency Resolution**:
   - Multi-language AST/regex parsers for `#include`, `import`, and `require`.
   - Generates interactive directed acyclic graphs (DAG) rendered via `@xyflow/react` (`A -> B`: `A` depends on `B`).

3. **Change Detection & BFS Reverse Traversal**:
   - Detects modified, added, and deleted files by baseline comparison.
   - Computes directly and transitively affected files using reverse BFS dependency traversal.
   - Highlights unaffected files safe for caching.

4. **Build Planner (Kahn's Topological Sort)**:
   - Validates `build.manifest.json` against command-injection vulnerabilities (blocking pipes, subshells, chaining).
   - Generates deterministic execution orders and parallel independent execution batches.
   - Cycle detection rejects cyclic graphs with diagnostic error paths.

5. **Bounded Parallel Execution & Native Compilation**:
   - Bounded parallel scheduler (1 to 8 concurrent workers) using native Node.js process spawning.
   - Zero Docker or Bazel dependencies — compiles using local MinGW/UCRT GCC (`C:\msys64\ucrt64\bin\g++.exe`).
   - Workspace isolation at `D:\gitforge\data\build-workspaces\{jobId}\`.

6. **Content-Addressable Cache**:
   - Stored on disk at `D:\gitforge\data\build-cache\`.
   - Keys derived from target command, arguments, and input file SHA-256 digests.
   - Cache hits skip compilation and copy pre-built artifacts in constant time.

7. **Local Run Manager & Build History**:
   - Launch and monitor built executables (`bin/app.exe`).
   - Captures real-time stdout and stderr with PID tracking.
   - Persistent build execution logs and metrics.
