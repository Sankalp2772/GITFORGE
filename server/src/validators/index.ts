import { z } from 'zod';

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens and underscores'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  bio: z.string().max(255).optional(),
});

export const loginSchema = z.object({
  login: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  bio: z.string().max(500).optional(),
  avatar: z.string().url().or(z.string().length(0)).optional(),
});

export const createRepoSchema = z.object({
  name: z
    .string()
    .min(1, 'Repository name is required')
    .max(100, 'Repository name too long')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Repository name contains invalid characters'),
  description: z.string().max(500).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
  initializeWithReadme: z.boolean().optional().default(true),
  defaultBranch: z.string().min(1).default('main'),
});

export const updateRepoSchema = z.object({
  description: z.string().max(500).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  defaultBranch: z.string().optional(),
});
