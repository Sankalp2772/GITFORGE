# GitForge — Enterprise-Grade Self-Hosted Git Platform & Incremental Build Engine

> A high-performance, self-hosted code hosting platform and continuous integration workspace built from scratch. GitForge unifies **native Git Smart HTTP protocol hosting** (`git clone`, `git push`), an **in-browser Monaco-powered IDE**, **collaboration workflows (PRs, Issues, RBAC)**, and a **Bazel-inspired incremental compilation and dependency resolution engine**.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux-brightgreen.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-cyan.svg)](https://reactjs.org/)
[![Node](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma%20MySQL-indigo.svg)](https://www.prisma.io/)

---

## 📑 Table of Contents
1. [Executive Summary & Problem Statement](#1-executive-summary--problem-statement)
2. [High-Level System Architecture](#2-high-level-system-architecture)
3. [The Incremental Build & Dependency Resolution Engine](#3-the-incremental-build--dependency-resolution-engine)
4. [Algorithmic Processing Pipeline & Mathematical Lifecycle](#4-algorithmic-processing-pipeline--mathematical-lifecycle)
5. [Database Design & Entity-Relationship Model](#5-database-design--entity-relationship-model)
6. [Security Architecture, RBAC & Trust Boundaries](#6-security-architecture-rbac--trust-boundaries)
7. [Supported Language Adapters](#7-supported-language-adapters)
8. [Repository Directory Structure](#8-repository-directory-structure)
9. [Pre-Seeded Accounts & Demo Credentials](#9-pre-seeded-accounts--demo-credentials)
10. [Local Installation & Quickstart Guide](#10-local-installation--quickstart-guide)
11. [Git CLI Workflow (Zero-Daemon Smart HTTP)](#11-git-cli-workflow-zero-daemon-smart-http)
12. [Step-by-Step Evaluator & Live Demo Script](#12-step-by-step-evaluator--live-demo-script)
13. [Implementation Challenges & Engineering Solutions](#13-implementation-challenges--engineering-solutions)
14. [Academic & Sprint Documentation Index](#14-academic--sprint-documentation-index)

---

## 1. Executive Summary & Problem Statement

### The Problem
Traditional development environments face two critical bottlenecks:
1. **Compilation Inefficiencies:** Standard build automation tools (like GNU Make) rely on file modification timestamps (`mtime`). In modern Git workflows, routine actions like `git checkout`, branch switching, rebasing, or touching files mutate timestamps without changing source code—triggering unnecessary, multi-minute full rebuilds.
2. **Platform Bloat & Decoupling:** Existing self-hosted solutions either lack low-level Git streaming control, consume massive server overhead, or decouple source hosting from incremental compilation pipelines.

### The GitForge Solution
GitForge solves these challenges through a unified, 5-layer platform:
- **Zero-Daemon Git Smart HTTP:** Implements native packet-line (`pkt-line`) streaming RPC directly over HTTP/S with no third-party Git daemons (like Gitolite or Gogs).
- **Cryptographic Fingerprinting:** Replaces `mtime` with deterministic streaming **SHA-256 content hashes**, eliminating false rebuilds.
- **Dependency Graph Intelligence:** Extracts source code imports via AST/regex parsers across 10 languages into an in-memory **Directed Acyclic Graph (DAG)**.
- **Reverse BFS Impact Analysis:** Traverses dependency relationships backwards ($O(V+E)$) to isolate the exact transitive ripple effects of any code change.
- **Kahn’s Topological Sorting:** Guarantees deterministic, deadlock-free compilation waves and detects circular dependencies before spawning compilers.
- **Hermetic Content-Addressable Storage (CAS):** Caches compiled object binaries (`.o`, `.exe`) by composite action keys; cache hits execute in **0ms and 0 CPU cycles**.

---

## 2. High-Level System Architecture

GitForge is designed around a decoupled, 5-layer enterprise architecture connecting the browser, networking layers, sub-process runners, and physical disk storage.

![High-Level System Architecture](docs/GITFORGE_COMPLETE_TECHNICAL_DOCUMENTATION/diagrams/gitforge_high_level_architecture.png)

### The 5 Architectural Layers
1. **Presentation Layer (`client/`):**
   - Single Page Application built on **React 18**, **TypeScript**, **Vite**, and **Tailwind CSS** (dark slate theme with purple accents).
   - Integrated **Monaco Code Editor** (VS Code's editor core) for syntax-highlighted code browsing.
   - Force-directed interactive **Directed Acyclic Graph (DAG)** visualizer powered by `@xyflow/react` (ReactFlow).
   - **Terminal Run Manager** providing bidirectional `stdio` process streaming.
2. **Network & Transport Gateway:**
   - REST API Gateway under `/api/*` secured by JWT authentication.
   - Git Smart HTTP interceptor under `/:owner/:repo.git/*` implementing standard stateless-rpc specifications.
3. **Core Backend & Engine Subsystems (`server/src/build-engine/`):**
   - **E1 (Change Detection & Adapters):** SHA-256 fingerprinting, manifest validation, delta change set generation, and 10 language adapters.
   - **E2 (Dependency & Impact Analysis):** AST parsing, DAG builder, reverse BFS impact analysis, Kahn's topological sort, and cycle detection.
   - **E3 (Execution, CAS & Scheduler):** Multi-core parallel worker pool (1, 2, 4, 8 cores), Content-Addressable Storage (CAS), and process runner.
   - **E4 (Git Host & Collaboration):** Bare Git repository lifecycle manager, packet-line streaming RPC, PR diff engine, and RBAC security.
4. **Storage Layer:**
   - **MySQL 8.0 Database:** Relational metadata, user accounts, RBAC memberships, branches, PRs, issues, and audit logs.
   - **Bare Git Repositories:** Standard bare repositories stored at `data/repos/{username}/{repository}.git`.
   - **CAS Object Cache:** Hash-keyed binary store at `data/build-cache/{sha256}.o`.
5. **Runtime & Toolchain:**
   - Native Node.js 20+ runtime, Git CLI executable, MinGW-w64 GCC, Clang, CMake, Ninja, and Python.

---

## 3. The Incremental Build & Dependency Resolution Engine

The incremental build subsystem (accessible in the UI at `/build-engine`) is divided into 4 specialized academic engines:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                GITFORGE BUILD ENGINE SUBSYSTEM                              │
├──────────────────────────────┬──────────────────────────────┬───────────────────────────────┤
│  Engine E1: Change Detection │  Engine E2: Impact Analysis  │  Engine E3: Scheduler & Cache │
│  • Manifest Validation       │  • Multi-Language AST Parser │  • Kahn's Parallel Batches    │
│  • Git Snapshot Extraction   │  • Directed Acyclic Graph    │  • Multi-Core Pool (1/2/4/8)  │
│  • SHA-256 Fingerprinting    │  • Reverse BFS Traversal     │  • CAS Cache Hashing          │
│  • Delta Change Sets         │  • Cycle Node Isolation      │  • Process stdio Streaming    │
└──────────────────────────────┴──────────────────────────────┴───────────────────────────────┘
```

---

## 4. Algorithmic Processing Pipeline & Mathematical Lifecycle

![Algorithmic Processing Pipeline](docs/GITFORGE_COMPLETE_TECHNICAL_DOCUMENTATION/diagrams/gitforge_algorithmic_pipeline.png)

When a build is initiated, the engine executes six sequential algorithmic stages:

### Stage 1: Content Fingerprinting & Delta Change Detection
- **Algorithm:** Cryptographic streaming SHA-256 (`crypto.createHash('sha256')`).
- **Complexity:** $O(N \cdot \text{FileSize})$.
- **Mechanism:** Files are read directly from bare Git commit snapshots using `git cat-file -p`. Hashes are matched against the baseline commit. Only files with modified byte streams enter the delta change set:
  $$\Delta = \{\text{Modified Files}\} \cup \{\text{Added Files}\} \cup \{\text{Deleted Files}\}$$

### Stage 2: Source-Level Dependency Graph Construction
- **Algorithm:** AST / Regex Import Parsing.
- **Complexity:** $O(V + E)$ where $V$ is files, $E$ is dependencies.
- **Mechanism:** Source files are parsed to extract relative imports and system headers. Edges follow the formal direction:
  $$A \longrightarrow B \quad (\text{File } A \text{ depends on File } B)$$

### Stage 3: Reverse BFS Impact Analysis
- **Algorithm:** Reverse Breadth-First Search on Inverted Adjacency Lists.
- **Complexity:** $O(V + E)$.
- **Mechanism:** The graph is inverted into a reverse lookup $R[\text{target}] = \{\text{sources depending on target}\}$. The queue is seeded with $\Delta$.
  - **Directly Affected (1-hop):** Immediate consumers of changed files.
  - **Transitively Affected (2+ hops):** Upstream callers and entry points.
  - **Unaffected:** Completely unimpacted files safe for zero-rebuild caching.

### Stage 4: Kahn's Topological Sort & Cycle Detection
- **Algorithm:** Kahn's In-Degree Queue Algorithm.
- **Complexity:** $O(V + E)$.
- **Mechanism:** 
  1. Computes in-degrees for each target: $\text{inDegree}[T] = \text{number of uncompiled prerequisites}$.
  2. Enqueues all targets with $\text{inDegree}[T] == 0$.
  3. Dequeues node $U$, appends to `sortedOrder`, and decrements in-degrees of dependents.
  4. **Cycle Gate:** If $\text{sortedOrder}.\text{length} \neq |V|$, a circular dependency exists. The engine halts before compilation and outputs `cycleNodes`.

### Stage 5: Content-Addressable Storage (CAS) Caching
- **Algorithm:** Composite ActionKey Hash Lookup.
- **Complexity:** $O(1)$ constant time lookup.
- **Mechanism:** Computes a composite cryptographic digest:
  $$\text{ActionKey} = \text{SHA-256}\left(\sum \text{SHA256}(\text{Inputs}) + \text{Command} + \text{Arguments} + \text{Flags}\right)$$
  If `ActionKey` exists in `data/build-cache/`, compilation is skipped ($0\text{ ms}$ overhead), and pre-built binaries are materialized.

### Stage 6: Parallel Multi-Worker Execution
- **Algorithm:** Multi-Worker Wave Scheduler.
- **Complexity:** $O\left(\frac{\text{Tasks}}{\text{Cores}}\right)$.
- **Mechanism:** Independent targets in the same topological wave are executed concurrently across worker slots (1, 2, 4, 8). Stdout and stderr are captured and streamed to the UI in real time.

---

## 5. Database Design & Entity-Relationship Model

GitForge utilizes **MySQL 8.0** managed through **Prisma ORM** for ACID-compliant metadata storage, alongside on-disk Content-Addressable Storage (CAS).

![Entity Relationship Diagram](docs/GITFORGE_COMPLETE_TECHNICAL_DOCUMENTATION/diagrams/gitforge_data_design_er.png)

### Schema Entity Specifications

| Entity / Table | Primary Key | Foreign Keys / Relations | Description & Purpose |
|---|---|---|---|
| **`User`** | `id` (UUID) | `ownedRepositories`, `memberships` | Authentication, profile data, and salted `bcrypt` password hashes. |
| **`Repository`** | `id` (UUID) | `ownerId` $\rightarrow$ `User.id` | Bare Git disk directory mapping (`storagePath`), visibility (`PUBLIC`/`PRIVATE`). |
| **`RepositoryMember`** | `id` (UUID) | `repositoryId`, `userId` | RBAC access roles (`ADMIN`, `WRITE`, `READ`) governing Web and CLI. |
| **`RepositoryInvitation`**| `id` (UUID) | `repositoryId`, `invitedUserId`, `invitedById` | Invitation lifecycle management (`PENDING`, `ACCEPTED`, `REJECTED`). |
| **`Branch`** | `id` (UUID) | `repositoryId` $\rightarrow$ `Repository.id` | Tracks branch refs, head commit SHAs, and default branch flags. |
| **`PullRequest`** | `id` (UUID) | `repositoryId`, `authorId` $\rightarrow$ `User.id` | Source/target branch comparisons, reviews, and automated Git merge integration. |
| **`PullRequestReview`** | `id` (UUID) | `pullRequestId`, `reviewerId` | Review approvals, comments, and change requests (`ReviewState`). |
| **`Issue`** | `id` (UUID) | `repositoryId`, `authorId`, `assigneeId` | Issue tracking, status toggling (`OPEN`/`CLOSED`), and discussions. |
| **`ActivityLog`** | `id` (UUID) | `repositoryId`, `userId` | Audit trail of pushes, merges, invitations, and permission modifications. |
| **`BuildHistory` & CAS** | `id` (UUID) | `repositoryId`, `commitSha` | Logs build execution duration, cache hit ratios, and CAS digests. |

---

## 6. Security Architecture, RBAC & Trust Boundaries

![Security Architecture & RBAC](docs/GITFORGE_COMPLETE_TECHNICAL_DOCUMENTATION/diagrams/gitforge_security_rbac_architecture.png)

GitForge implements a multi-zone defense-in-depth model:
- **Zone 1: Untrusted External Clients:** Web browsers on port 5174 and Git CLI clients connecting over HTTP.
- **Zone 2: DMZ & Authentication Gateway:** JWT Bearer tokens for REST endpoints; HTTP Basic Auth with 10-round `bcrypt` verification for Git operations.
- **Zone 3: Trusted Execution Sandbox:** Strict command isolation.

### Command Injection Elimination
Arbitrary shell execution (`child_process.exec`) is strictly banned. Subprocess commands are executed via vectorized argument arrays:
```typescript
// SECURE: child_process.spawn array vectorization
const child = spawn(command, argsArray, { windowsHide: true });
```
This guarantees that shell chaining metacharacters (`;`, `&&`, `|`, `` ` ``, `$()`) and path traversal sequences (`../../`) are treated as literal strings, neutralizing Remote Code Execution (RCE).

### Role-Based Access Control (RBAC) Matrix

| Role | Clone/Read (Public) | Clone/Read (Private) | Git Push (Write) | Manage PRs/Issues | Member Invites | Delete Repo |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **`OWNER`** | Allowed | Allowed | Allowed | Allowed | Allowed | Full Control |
| **`ADMIN`** | Allowed | Allowed | Allowed | Allowed | Allowed | Denied |
| **`WRITE`** | Allowed | Allowed | Allowed | Allowed | Denied | Denied |
| **`READ`** | Allowed | Allowed | Denied | View Only | Denied | Denied |
| **`ANONYMOUS`**| Allowed | Denied | Denied | Denied | Denied | Denied |

---

## 7. Supported Language Adapters

GitForge includes 10 built-in language adapters that automatically detect project types, extract dependencies, and configure build plans:

1. **C / C++ (`cppAdapter.ts`):** Detects `#include "..."` and `#include <...>`; compiles with GCC/Clang/MSVC.
2. **TypeScript / JavaScript (`nodeAdapter.ts`):** Parses `import` and `require()`; manages Node runtimes.
3. **React + Vite (`reactViteAdapter.ts`):** Detects Vite configs and frontend component hierarchies.
4. **Python (`pythonAdapter.ts`):** Parses `import` and `from ... import`; tracks virtual environments.
5. **Java (`javaAdapter.ts`):** Scans package hierarchies and Maven/Gradle configurations.
6. **Go (`goAdapter.ts`):** Detects `go.mod` dependencies and package imports.
7. **Rust (`rustAdapter.ts`):** Resolves `Cargo.toml` targets and `mod` declarations.
8. **.NET / C# (`dotnetAdapter.ts`):** Parses `.csproj` references and MSBuild targets.
9. **PHP (`phpAdapter.ts`):** Resolves Composer dependencies and PSR-4 imports.
10. **Full-Stack Multi-Tier (`fullStackAdapter.ts`):** Automatically coordinates multi-tier repositories containing independent `frontend/`, `backend/`, and `database/` folders.

---

## 8. Repository Directory Structure

```text
D:\gitforge\
├── client/                               # Frontend Single Page Application (React 18)
│   ├── src/
│   │   ├── api/client.ts                 # Axios client with Bearer auth interceptors
│   │   ├── build-engine/                 # Incremental build engine UI views
│   │   │   ├── pages/
│   │   │   │   ├── EngineOverview.tsx    # Subsystem dashboard & status
│   │   │   │   ├── EngineScanner.tsx     # Git commit file scanner & SHA-256 view
│   │   │   │   ├── EngineDependencyGraph.tsx # ReactFlow visual DAG canvas
│   │   │   │   ├── EngineChangeDetection.tsx # Baseline delta changes
│   │   │   │   ├── EngineAffectedFiles.tsx   # Reverse BFS impact analysis view
│   │   │   │   ├── EngineBuildPlanner.tsx    # Kahn's sort topological waves
│   │   │   │   ├── EngineBuildExecution.tsx  # Live parallel compiler dashboard
│   │   │   │   ├── EngineCache.tsx       # CAS object store inspector
│   │   │   │   └── EngineRunManager.tsx  # Interactive terminal stdio runner
│   │   ├── components/                   # Navigation, layout, and Monaco viewer
│   │   └── pages/                        # Dashboard, RepoCode, PRs, Issues, Members
│   └── package.json
│
├── server/                               # Backend REST & Git Smart HTTP (Node.js)
│   ├── prisma/
│   │   └── schema.prisma                 # MySQL 8.0 schema & relation definitions
│   ├── src/
│   │   ├── build-engine/                 # Core Incremental Build Subsystem
│   │   │   ├── adapters/                 # 10 Multi-language adapters
│   │   │   ├── cache/buildCacheService.ts # Content-Addressable Storage (CAS)
│   │   │   ├── dependency/graph/         # AST parser & DAG builder
│   │   │   ├── detection/                # SHA-256 delta change detection
│   │   │   ├── impact/                   # Reverse BFS impact analysis
│   │   │   ├── planner/                  # Kahn's topological sort & cycle detector
│   │   │   ├── runner/localRunManager.ts # Interactive terminal stdio process runner
│   │   │   ├── scanner/                  # Git commit snapshot reader
│   │   │   └── scheduler/                # Multi-worker parallel compile scheduler
│   │   ├── controllers/                  # Auth, Repository, PR, Issue, Member controllers
│   │   ├── middleware/                   # JWT auth and RBAC permission checks
│   │   ├── routes/
│   │   │   ├── gitHttp.ts                # Git Smart HTTP streaming RPC interceptor
│   │   │   └── buildEngineRoutes.ts      # REST API endpoints for build engine
│   │   └── services/gitService.ts        # Native Git CLI subprocess execution
│   └── package.json
│
├── data/                                 # Runtime Storage (Excluded from Git)
│   ├── repos/                            # Bare Git repositories ({owner}/{repo}.git)
│   ├── build-cache/                      # Content-Addressable Storage ({hash}.o)
│   └── build-workspaces/                 # Hermetic temporary compile workspaces
│
├── docs/                                 # Formal Documentation & Diagrams
│   ├── CHAPTER_4_SPRINT_1_STUDENT_HANDBOOK.docx # Completed Sprint 1 Handbook
│   ├── GATE_0_PROJECT_SYNOPSIS_TEAM_1.docx      # Gate 0 Project Synopsis
│   ├── GATE_1_REQUIREMENTS_ENGINEERING_TEAM_1.docx # Gate 1 Requirements Document
│   └── GITFORGE_COMPLETE_TECHNICAL_DOCUMENTATION/
│       └── diagrams/                     # 300 DPI Architecture & ER PNGs
│
└── START_GITFORGE.bat                    # One-click automated platform launcher
```

---

## 9. Pre-Seeded Accounts & Demo Credentials

The local MySQL database contains seeded test accounts with configured repositories and permissions:

| Username | Email | Password | Role Description |
|---|---|---|---|
| **`alice`** | `alice@gitforge.dev` | `DemoPassword123!` | Repository Owner (`alice/core-runtime`, etc.) |
| **`bob`** | `bob@gitforge.dev` | `DemoPassword123!` | Collaborator (`WRITE` access on `alice/core-runtime`) |
| **`testuser1`** | `test1@gitforge.dev` | `pass1234` | Integration test user |
| **`testuser2`** | `test2@gitforge.dev` | `pass1234` | Integration test user |

---

## 10. Local Installation & Quickstart Guide

### Prerequisites
- **Node.js:** v20.0.0 or higher
- **MySQL:** 8.0 running locally on port 3306
- **Git:** Git CLI installed and in system PATH
- **C++ Compiler (Optional for C++ sample builds):** MinGW-w64 GCC or Clang

### Quickstart Option 1: Automated Launcher (Windows)
Double-click or run from PowerShell:
```cmd
START_GITFORGE.bat
```
*This verifies the MySQL service, starts the backend on port 5000, starts Vite on port 5174, and opens `http://localhost:5174` in your default browser.*

### Quickstart Option 2: Manual Setup

1. **Configure Environment Variables:**
   Create `server/.env`:
   ```env
   PORT=5000
   DATABASE_URL="mysql://root:password@localhost:3306/gitforge"
   JWT_SECRET="gitforge-super-secret-jwt-key"
   GIT_STORAGE_DIR="D:/gitforge/data/repos"
   BUILD_CACHE_DIR="D:/gitforge/data/build-cache"
   ```

2. **Initialize Database:**
   ```bash
   cd server
   npm install
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

3. **Start Backend Server:**
   ```bash
   cd server
   npm run dev
   # Backend running on http://localhost:5000
   ```

4. **Start Frontend Development Server:**
   ```bash
   cd client
   npm install
   npm run dev
   # Frontend accessible on http://localhost:5174
   ```

---

## 11. Git CLI Workflow (Zero-Daemon Smart HTTP)

GitForge exposes native Git Smart HTTP endpoints. Standard Git CLI clients interact directly with GitForge without local SSH configuration:

### 1. Clone a Repository
```bash
git clone http://localhost:5000/alice/core-runtime.git
cd core-runtime
```
*When prompted for credentials, use: Username: `alice`, Password: `DemoPassword123!`.*

### 2. Commit and Push
```bash
echo "Testing GitForge Smart HTTP" >> test.txt
git add test.txt
git commit -m "feat: added test.txt via native Git CLI"
git push origin main
```
The push streams raw packfiles to `gitHttp.ts`, executes `git receive-pack --stateless-rpc`, and immediately reflects in the Monaco web code browser.

---

## 12. Step-by-Step Evaluator & Live Demo Script

Follow this script during academic and technical evaluations:

### Step 1: Platform Startup & Dashboard Walkthrough
1. Execute `START_GITFORGE.bat`.
2. Navigate to `http://localhost:5174/login` and log in as `alice` (`DemoPassword123!`).
3. Tour the **Dashboard**: Highlight owned repositories, collaborator invitations, and activity logs.

### Step 2: Code Browser & Monaco Integration
1. Open repository `alice/core-runtime`.
2. Browse the file tree: click on C++, TypeScript, or Markdown files.
3. Point out the **Monaco Editor** with syntax highlighting, line numbers, and branch switching (`main`).

### Step 3: Multi-Developer Collaboration (PR & RBAC)
1. Navigate to **Members** (`/alice/core-runtime/members`). Show `bob` invited with role **`WRITE`**.
2. Open terminal: clone as `bob`, create a feature branch `feature/optimization`, commit changes, and push.
3. Open a **Pull Request** in the Web UI: inspect the inline unified diff viewer and click **Merge**. Show automated Git merge resolution.

### Step 4: The Build Engine — Cold Baseline Build
1. In the top navigation bar, click **Build Engine** (`/build-engine`).
2. Select repository `alice/core-runtime`.
3. Open **Dependency Graph**: Showcase the interactive 2D Directed Acyclic Graph (DAG) with nodes and edges rendered via ReactFlow.
4. Open **Build Execution** and click **"Run Build"**:
   - Show all targets compiling across worker slots.
   - Show the result: **0% Cached, 100% Compiled**. Artifacts are committed to Content-Addressable Storage (CAS).

### Step 5: The "Killer Demo" — Incremental Build & Impact Minimization
1. Open any file that is a low-level dependency (e.g., `calculator.hpp`). Add a function or comment.
2. In the Web UI, open **Change Detection**:
   - `calculator.hpp` is flagged as **MODIFIED** via SHA-256 fingerprinting.
3. Open **Affected Files (Reverse BFS Impact Analysis)**:
   - **Directly Affected:** `calculator.cpp`, `main.cpp`.
   - **Unaffected Files:** Independent modules are flagged as **Safe for Cache**.
4. Open **Build Planner**:
   - Show **Kahn's Topological Sort** organizing affected targets into independent parallel waves.
5. Click **"Execute Incremental Build"**:
   - Unaffected targets report **`CACHED` (0ms execution)**.
   - Only impacted targets recompile.
   - Highlight the dramatic reduction in compilation time.

---

## 13. Implementation Challenges & Engineering Solutions

| # | Implementation Challenge | Engineering Solution | Engine Involved |
|---|---|---|:---:|
| **1** | **Timestamp False Rebuilds:** Branch switches update `mtime`, causing unwanted rebuilds. | Replaced timestamps with streaming **SHA-256 cryptographic content fingerprinting**. | **E1** |
| **2** | **Command Injection Vulnerabilities:** User-configured manifests can inject shell metacharacters. | Strict JSON schema sanitization + vectorized argument execution via `child_process.spawn()`. | **E1 & E3** |
| **3** | **Downstream Impact Propagation:** Forward DAGs cannot efficiently identify callers of changed files. | Engineered **Adjacency Inversion** and **Reverse BFS Traversal** ($O(V+E)$). | **E2** |
| **4** | **Circular Dependency Deadlocks:** Loops in build targets freeze execution queues. | Implemented **Kahn's Algorithm** with in-degree queues, isolating cycle nodes before compile. | **E2** |
| **5** | **Memory Bloat on Large Git Pushes:** Buffering entire Git packfiles causes V8 OOM crashes. | Built **Zero-Buffering Stream Piping** bridging incoming HTTP streams directly to Git RPC. | **E4** |
| **6** | **Cache Poisoning:** Crashed or broken compilations corrupt subsequent build runs. | Enforced **Hermetic CAS** with composite action keys, validating exit code $0$ before storage. | **E3** |

---

## 14. Academic & Sprint Documentation Index

All formal course templates, Word handbooks, and vector diagrams are committed in the repository:

- 📄 **Sprint 1 Student Handbook:** [`docs/CHAPTER_4_SPRINT_1_STUDENT_HANDBOOK.docx`](docs/CHAPTER_4_SPRINT_1_STUDENT_HANDBOOK.docx)
- 📄 **Gate 0 Project Synopsis:** [`docs/GATE_0_PROJECT_SYNOPSIS_TEAM_1.docx`](docs/GATE_0_PROJECT_SYNOPSIS_TEAM_1.docx)
- 📄 **Gate 1 Functional Requirements Engineering:** [`docs/GATE_1_REQUIREMENTS_ENGINEERING_TEAM_1.docx`](docs/GATE_1_REQUIREMENTS_ENGINEERING_TEAM_1.docx)
- 🖼️ **High-Level System Architecture Diagram:** [`docs/GITFORGE_COMPLETE_TECHNICAL_DOCUMENTATION/diagrams/gitforge_high_level_architecture.png`](docs/GITFORGE_COMPLETE_TECHNICAL_DOCUMENTATION/diagrams/gitforge_high_level_architecture.png)
- 🖼️ **Algorithmic Pipeline & Control Flow Diagram:** [`docs/GITFORGE_COMPLETE_TECHNICAL_DOCUMENTATION/diagrams/gitforge_algorithmic_pipeline.png`](docs/GITFORGE_COMPLETE_TECHNICAL_DOCUMENTATION/diagrams/gitforge_algorithmic_pipeline.png)
- 🖼️ **Entity-Relationship (ER) Data Design Diagram:** [`docs/GITFORGE_COMPLETE_TECHNICAL_DOCUMENTATION/diagrams/gitforge_data_design_er.png`](docs/GITFORGE_COMPLETE_TECHNICAL_DOCUMENTATION/diagrams/gitforge_data_design_er.png)
- 🖼️ **Security Architecture & RBAC Matrix Diagram:** [`docs/GITFORGE_COMPLETE_TECHNICAL_DOCUMENTATION/diagrams/gitforge_security_rbac_architecture.png`](docs/GITFORGE_COMPLETE_TECHNICAL_DOCUMENTATION/diagrams/gitforge_security_rbac_architecture.png)

---

## 👥 Team 1 Register

- **Department:** Computer Science & Engineering
- **Guide:** Mr. Dheerajkumar
- **Theme:** System Software and Development Tools
- **Project Artefact:** Incremental Build and Dependency Resolution Tool (GitForge Platform)
- **Members:**
  - **Student A:** Sankalp Prakash Patil (Engine E2 — Dependency and Impact Analysis)
  - **Student B:** Abdul Khadar I (Engine E1 — Change Detection and Language Adapters)
  - **Student C:** Pranav Naik (Engine E3 — Scheduling, Execution, Cache and State)
  - **Student D:** Saiprasad B J (Engine E4 — Networked Worker Coordination & Core Host)
