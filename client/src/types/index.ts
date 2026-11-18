export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    ownedRepositories: number;
    pullRequests: number;
    issues: number;
  };
}

export interface Repository {
  id: string;
  name: string;
  description?: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  ownerId: string;
  defaultBranch: string;
  storagePath?: string;
  createdAt: string;
  updatedAt: string;
  cloneUrl: string;
  owner: {
    id: string;
    username: string;
    avatar?: string;
    email?: string;
  };
  branches?: string[];
  userRole?: 'OWNER' | 'ADMIN' | 'WRITE' | 'READ' | 'NONE';
  _count?: {
    members: number;
    pullRequests: number;
    issues: number;
  };
}

export interface Member {
  id: string;
  repositoryId: string;
  userId: string;
  role: 'ADMIN' | 'WRITE' | 'READ';
  joinedAt: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatar?: string;
  };
}

export interface Invitation {
  id: string;
  repositoryId: string;
  invitedUserId: string;
  invitedById: string;
  role: 'ADMIN' | 'WRITE' | 'READ';
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
  repository?: {
    name: string;
    owner: {
      username: string;
      avatar?: string;
    };
  };
  invitedUser?: {
    id: string;
    username: string;
    email: string;
    avatar?: string;
  };
  invitedBy?: {
    id: string;
    username: string;
  };
}

export interface CommitInfo {
  sha: string;
  authorName: string;
  authorEmail: string;
  date: string;
  message: string;
}

export interface TreeItem {
  name: string;
  path: string;
  type: 'tree' | 'blob';
  mode: string;
  sha: string;
  size?: number;
}

export interface PullRequest {
  id: string;
  number: number;
  repositoryId: string;
  authorId: string;
  sourceBranch: string;
  targetBranch: string;
  title: string;
  description?: string;
  status: 'OPEN' | 'CLOSED' | 'MERGED';
  mergedAt?: string;
  mergedBy?: string;
  createdAt: string;
  updatedAt: string;
  diff?: string;
  author: {
    id: string;
    username: string;
    avatar?: string;
  };
  comments?: Array<{
    id: string;
    content: string;
    createdAt: string;
    author: {
      id: string;
      username: string;
      avatar?: string;
    };
  }>;
  reviews?: Array<{
    id: string;
    state: 'COMMENTED' | 'APPROVED' | 'CHANGES_REQUESTED';
    body?: string;
    createdAt: string;
    reviewer: {
      id: string;
      username: string;
      avatar?: string;
    };
  }>;
  _count?: {
    comments: number;
    reviews: number;
  };
}

export interface Issue {
  id: string;
  number: number;
  repositoryId: string;
  authorId: string;
  assigneeId?: string;
  title: string;
  description?: string;
  status: 'OPEN' | 'CLOSED';
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    username: string;
    avatar?: string;
  };
  assignee?: {
    id: string;
    username: string;
    avatar?: string;
  };
  labels?: Array<{
    id: string;
    name: string;
    color: string;
    description?: string;
  }>;
  comments?: Array<{
    id: string;
    content: string;
    createdAt: string;
    author: {
      id: string;
      username: string;
      avatar?: string;
    };
  }>;
  _count?: {
    comments: number;
  };
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  action: string;
  details?: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
  repository?: {
    name: string;
    owner: {
      username: string;
    };
  };
}
