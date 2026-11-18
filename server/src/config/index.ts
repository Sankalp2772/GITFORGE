import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const rawStorageRoot = process.env.GIT_STORAGE_ROOT || 'D:/gitforge/data/repos';

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || 'mysql://root:root@localhost:3306/gitforge_db',
  jwtSecret: process.env.JWT_SECRET || 'gitforge_super_secure_jwt_secret_phase1_key_2026',
  jwtExpiresIn: '7d' as const,
  // Normalize path: convert forward slashes to OS separator and resolve
  gitStorageRoot: path.resolve(rawStorageRoot.replace(/\//g, path.sep).replace(/\\\\/g, path.sep)),
};
