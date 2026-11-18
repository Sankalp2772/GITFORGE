# GitForge Complete Source Code File Inventory & Directory Structure

## 1. Complete Project Directory Structure

```text
GitForge/
│
├── client/                               # Frontend Single Page Application (React 18 + Vite)
│   ├── index.html                        # HTML5 shell template
│   ├── package.json                      # Frontend NPM dependencies & scripts
│   ├── vite.config.ts                    # Vite bundler configuration & dev server proxy
│   ├── tsconfig.json                     # TypeScript compiler settings for React
│   ├── tailwind.config.js                # Tailwind CSS design system utility definitions
│   ├── postcss.config.js                 # CSS processing pipeline
│   └── src/
│       ├── main.tsx                      # Frontend application entry point
│       ├── App.tsx                       # React Router configuration & route switchboard
│       ├── index.css                     # Global design tokens, scrollbar styling, fonts
│       ├── api/
│       │   └── client.ts                 # Central Axios client instance with JWT interceptor
│       ├── context/
│       │   └── AuthContext.tsx           # Global authentication state, login, logout, token manager
│       ├── types/
│       │   └── index.ts                  # Shared TypeScript interfaces (User, Repo, PR, Issue)
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Navbar.tsx            # Global navigation header with user profile & repo links
│       │   │   ├── Layout.tsx            # Main application layout wrapper
│       │   │   └── ProtectedRoute.tsx    # Route guard redirecting unauthenticated users
│       │   ├── repo/
│       │   │   └── RepoHeader.tsx        # Repository header with clone/push modal & tab navigation
│       │   └── MarkdownViewer.tsx        # Rich markdown renderer with syntax highlighting
│       ├── pages/
│       │   ├── Login.tsx                 # User authentication sign-in page
│       │   ├── Register.tsx              # User registration page
│       │   ├── Dashboard.tsx             # User dashboard listing repositories & recent activity
│       │   ├── Explore.tsx               # Public repository discovery page
│       │   ├── Profile.tsx               # User profile & SSH key management page
│       │   ├── CreateRepo.tsx            # New repository initialization form
│       │   ├── RepoCode.tsx              # Code browser with file tree, Monaco viewer & push helper
│       │   ├── RepoCommits.tsx           # Commit log timeline viewer
│       │   ├── RepoIssues.tsx            # Issue tracking & discussion page
│       │   ├── RepoPulls.tsx             # Pull request review & merge interface
│       │   ├── RepoMembers.tsx           # Collaborator permission manager
│       │   └── RepoSettings.tsx          # Repository deletion & visibility settings
│       └── build-engine/                 # Incremental Build & Execution Engine Web UI
│           ├── context/
│           │   └── BuildEngineContext.tsx# Build state provider: selected target, workers, logs
│           ├── components/
│           │   ├── BuildEngineLayout.tsx # Specialized IDE frame layout for build engine
│           │   ├── BuildEngineSidebar.tsx# Navigation sidebar for engine stages
│           │   └── BuildEngineTopBar.tsx # Action bar with Run/Build trigger and baseline commit picker
│           └── pages/
│               ├── EngineOverview.tsx        # Pipeline health, commit comparison summary & metrics
│               ├── EngineScanner.tsx         # File tree scanner & header discovery viewer
│               ├── EngineDependencyGraph.tsx # Interactive visual DAG (nodes, forward & reverse edges)
│               ├── EngineChangeDetection.tsx # SHA-256 diff table comparing baseline vs target commit
│               ├── EngineAffectedFiles.tsx   # BFS impact cascade tree showing affected targets
│               ├── EngineBuildPlanner.tsx    # Kahn's topological sort build tiers & cycle alerts
│               ├── EngineBuildExecution.tsx  # Multi-worker parallel compile & link execution monitor
│               ├── EngineCache.tsx           # Content-addressable cache (CAS) hits, misses & savings
│               ├── EngineRunManager.tsx      # Interactive program terminal with stdin input bar
│               ├── EngineHistory.tsx         # Historical build records, execution times & artifacts
│               ├── EngineEnvironment.tsx     # C++ toolchain diagnostics (MinGW GCC, CMake, Ninja)
│               └── EngineSettings.tsx        # Worker count selector (1, 2, 4, 8) & compiler flags
│
├── server/                               # Backend REST & Git Smart HTTP Server (Node.js + Express)
│   ├── package.json                      # Backend NPM dependencies, engines & scripts
│   ├── tsconfig.json                     # TypeScript server configuration
│   ├── .env                              # Environment variables (PORT=5000, DATABASE_URL, JWT_SECRET)
│   ├── prisma/
│   │   ├── schema.prisma                 # Relational schema (12 MySQL models, enums & foreign keys)
│   │   └── seed.ts                       # Database seeder initializing test accounts & sample repos
│   └── src/
│       ├── index.ts                      # Server entry point, middleware registration & HTTP listener
│       ├── config/
│       │   ├── index.ts                  # App configuration constants (disk paths, limits, ports)
│       │   └── prisma.ts                 # Singleton PrismaClient connection instance
│       ├── middleware/
│       │   ├── auth.ts                   # Express JWT authentication & bearer token extraction
│       │   └── permissions.ts            # Repository role authorization (OWNER, ADMIN, WRITE, READ)
│       ├── routes/
│       │   ├── authRoutes.ts             # Authentication endpoints (/api/auth/register, /login, /me)
│       │   ├── repositoryRoutes.ts       # Repository CRUD & branch management (/api/repos)
│       │   ├── pullRequestRoutes.ts      # Pull request workflows (/api/repos/:owner/:repo/pulls)
│       │   ├── issueRoutes.ts            # Issue creation & comments (/api/repos/:owner/:repo/issues)
│       │   ├── memberRoutes.ts           # Collaborator management (/api/repos/:owner/:repo/members)
│       │   ├── notificationRoutes.ts     # User notifications (/api/notifications)
│       │   ├── userRoutes.ts             # User profiles & settings (/api/users)
│       │   └── gitHttp.ts                # Git Smart HTTP transport proxy (/info/refs, upload/receive-pack)
│       ├── controllers/
│       │   ├── authController.ts         # User registration, bcrypt password hashing & JWT issuance
│       │   ├── repositoryController.ts   # Repo creation, bare git init & tree serialization
│       │   ├── pullRequestController.ts  # PR diff calculation, reviews & fast-forward merge
│       │   ├── issueController.ts        # Issue ticketing logic & commentary
│       │   ├── memberController.ts       # Role assignment & invitation management
│       │   └── notificationController.ts # Alert polling & read state updates
│       ├── services/
│       │   └── gitService.ts             # High-level Git command abstraction (log, diff, branches, tags)
│       ├── validators/
│       │   └── index.ts                  # Request payload validation rules & sanitization
│       └── build-engine/                 # Incremental Build & Dependency Resolution Engine Core
│           ├── types/
│           │   └── index.ts              # Core engine types (Graph, Node, Action, Tier, CacheEntry)
│           ├── routes/
│           │   └── buildEngineRoutes.ts  # Build engine REST endpoints (/api/repos/:id/build-engine/*)
│           ├── controllers/
│           │   └── buildEngineController.ts # Pipeline orchestration & commit diff baseline handler
│           ├── scanner/
│           │   └── repoSnapshotService.ts# Git archive extractor & source file discoverer
│           ├── hashing/
│           │   └── hashService.ts        # SHA-256 cryptographic content & action key hasher
│           ├── dependency/
│           │   ├── analyzers/
│           │   │   └── index.ts          # Language include regex parser (#include <...> / "...")
│           │   └── graph/
│           │       └── graphBuilder.ts   # Directed Acyclic Graph (DAG) constructor (forward & reverse)
│           ├── detection/
│           │   └── changeDetectionService.ts# Target vs baseline commit differential engine
│           ├── impact/
│           │   └── affectedAnalysisService.ts # Breadth-First Search (BFS) reverse impact traversal
│           ├── planner/
│           │   └── buildPlannerService.ts# Kahn's topological sort & cycle detection planner
│           ├── cache/
│           │   └── buildCacheService.ts  # Content-Addressable Storage (CAS) build object cache
│           ├── scheduler/
│           │   └── parallelBuildScheduler.ts # Parallel worker pool manager (1, 2, 4, 8 threads)
│           ├── runner/
│           │   └── localRunManager.ts    # Child process execution manager with interactive stdin pipe
│           ├── manifest/
│           │   └── manifestParser.ts     # CMakeLists.txt & build descriptor parser
│           └── adapters/                 # Multi-language build adapters
│               ├── baseAdapter.ts        # Abstract build adapter interface
│               ├── cppAdapter.ts         # Native C/C++ CMake & MinGW GCC adapter
│               ├── nodeAdapter.ts        # Node.js / TypeScript build adapter
│               ├── pythonAdapter.ts      # Python test & runtime adapter
│               ├── rustAdapter.ts        # Rust Cargo adapter
│               ├── goAdapter.ts          # Go toolchain adapter
│               ├── javaAdapter.ts        # Java Maven/Gradle adapter
│               ├── dotnetAdapter.ts      # .NET Core adapter
│               ├── phpAdapter.ts         # PHP runtime adapter
│               ├── reactViteAdapter.ts   # Frontend Vite build adapter
│               ├── staticWebAdapter.ts   # HTML/JS static web adapter
│               ├── fullStackAdapter.ts   # Composite full-stack adapter
│               └── adapterRegistry.ts    # Automatic project type detector & adapter factory
│
├── docs/                                 # Platform Technical Documentation Suite
│   └── GITFORGE_COMPLETE_TECHNICAL_DOCUMENTATION/
│       ├── diagrams/                     # Architecture diagrams in SVG & PNG formats
│       ├── 01_COMPLETE_FILE_INVENTORY.md
│       ├── 02_COMPLETE_SYSTEM_ARCHITECTURE.md
│       ├── 03_FRONTEND_BACKEND_COMMUNICATION.md
│       ├── 04_GIT_SMART_HTTP_COMPLETE_GUIDE.md
│       ├── 05_DATABASE_AND_ER_DIAGRAM.md
│       ├── 06_INCREMENTAL_BUILD_ENGINE.md
│       ├── 07_UML_COMMUNICATION_DIAGRAMS.md
│       ├── 08_TECHNOLOGY_STACK.md
│       ├── 09_COMPLETE_DATA_FLOW.md
│       ├── 10_API_DOCUMENTATION.md
│       ├── 11_IMPLEMENTATION_STATUS.md
│       └── README.md
│
└── data/                                 # Runtime Storage Directories (Excluded from Git)
    ├── repos/                            # Bare Git repositories (*.git)
    ├── build-workspaces/                 # Temporary checkouts for compilation
    └── build-cache/                      # Content-addressable SHA-256 object cache (.o files)
```

## 2. File Extension Classifications

| Extension | Purpose & Toolchain Role |
|---|---|
| `.ts` | TypeScript server files, business logic, algorithmic build services and adapters. |
| `.tsx` | TypeScript React components containing JSX markup for the user interface. |
| `.json` | Structured metadata, package definitions (`package.json`), compiler configurations (`tsconfig.json`). |
| `.prisma` | Database schema model definition file consumed by the Prisma ORM generator and migration engine. |
| `.cpp` | C++ source code containing function implementations and logic compiled by MinGW GCC. |
| `.h` / `.hpp` | C++ header declarations scanned by `GraphBuilder` for `#include` dependencies. |
| `.cmake` / `CMakeLists.txt` | Build configuration script consumed by CMake to generate Ninja or Make build systems. |
| `.svg` | Scalable Vector Graphics rendering responsive, resolution-independent architecture diagrams. |
| `.png` | High-resolution raster images embedded in documents and presentations. |
