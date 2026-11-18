# GitForge Relational Database Architecture & ER Diagram

## 1. Entity-Relationship Overview

GitForge uses MySQL 8.0 managed via the Prisma ORM. The relational schema is structured into 12 normalized models representing users, access control, repository code, branches, collaboration, and audit trails.

![GitForge Database Schema and Entity-Relationship Diagram](diagrams/er_diagram.png)

*Direct SVG Vector Diagram: [er_diagram.svg](diagrams/er_diagram.svg)*

## 2. Complete Mermaid ER Diagram

```mermaid
erDiagram
    users ||--o{ repositories : "owns"
    users ||--o{ repository_members : "participates"
    users ||--o{ pull_requests : "authors"
    users ||--o{ issues : "authors"
    users ||--o{ activity_logs : "triggers"

    repositories ||--o{ branches : "contains"
    repositories ||--o{ repository_members : "has"
    repositories ||--o{ pull_requests : "tracks"
    repositories ||--o{ issues : "tracks"
    repositories ||--o{ activity_logs : "records"

    pull_requests ||--o{ pull_request_comments : "has"
    pull_requests ||--o{ pull_request_reviews : "receives"

    issues ||--o{ issue_comments : "has"

    users {
        string id PK "UUID"
        string username UQ
        string email UQ
        string passwordHash
        string avatarUrl
        enum role "ADMIN, USER"
        datetime createdAt
        datetime updatedAt
    }

    repositories {
        string id PK "UUID"
        string name
        string description
        boolean isPrivate
        string ownerId FK
        string defaultBranch
        string diskPath
        datetime createdAt
        datetime updatedAt
    }

    repository_members {
        string id PK "UUID"
        string repositoryId FK
        string userId FK
        enum role "OWNER, ADMIN, WRITE, READ"
        datetime createdAt
    }

    branches {
        string id PK "UUID"
        string repositoryId FK
        string name
        string commitSha
        boolean isDefault
    }

    pull_requests {
        string id PK "UUID"
        int number
        string repositoryId FK
        string authorId FK
        string title
        string sourceBranch
        string targetBranch
        enum status "OPEN, CLOSED, MERGED"
        datetime createdAt
    }

    issues {
        string id PK "UUID"
        int number
        string repositoryId FK
        string authorId FK
        string title
        enum status "OPEN, CLOSED"
        datetime createdAt
    }
```

## 3. Database Table Definitions

### `users` Table
Stores registered developer identities and credentials.
- `id`: UUID Primary Key.
- `username`: Unique varchar, used in repository URLs (`/:username/:repo`).
- `email`: Unique email for notifications and password recovery.
- `passwordHash`: Bcrypt hashed password string.
- `role`: Platform administration flag (`ADMIN` or `USER`).

### `repositories` Table
Stores logical repository metadata mapped to filesystem bare repos.
- `id`: UUID Primary Key.
- `ownerId`: Foreign key pointing to `users.id`.
- `name`: Repository slug (Unique per owner via composite constraint `@@unique([ownerId, name])`).
- `diskPath`: Absolute filesystem path to the bare repository (`D:/gitforge/data/repos/...`).
- `defaultBranch`: Default checkout branch (defaults to `main`).
