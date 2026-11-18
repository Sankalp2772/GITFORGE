import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { config } from '../config';
import { registerSchema, loginSchema, updateProfileSchema } from '../validators';
import { AuthRequest } from '../middleware/auth';

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.errors[0].message });
        return;
      }

      const { username, email, password, bio } = parsed.data;

      // Check unique
      const existing = await prisma.user.findFirst({
        where: {
          OR: [{ username }, { email }],
        },
      });

      if (existing) {
        if (existing.username.toLowerCase() === username.toLowerCase()) {
          res.status(409).json({ error: 'Username is already taken' });
          return;
        }
        res.status(409).json({ error: 'Email is already registered' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          username,
          email,
          passwordHash,
          bio,
          avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`,
        },
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          bio: true,
          createdAt: true,
        },
      });

      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: 'Registration successful',
        user,
        token,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.errors[0].message });
        return;
      }

      const { login, password } = parsed.data;

      const user = await prisma.user.findFirst({
        where: {
          OR: [{ username: login }, { email: login }],
        },
      });

      if (!user) {
        res.status(401).json({ error: 'Invalid username/email or password' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ error: 'Invalid username/email or password' });
        return;
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          bio: user.bio,
          createdAt: user.createdAt,
        },
        token,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async me(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          bio: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              ownedRepositories: true,
              pullRequests: true,
              issues: true,
            },
          },
        },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({ user });
    } catch (err) {
      next(err);
    }
  }

  public static async updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.errors[0].message });
        return;
      }

      const updated = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          bio: parsed.data.bio,
          avatar: parsed.data.avatar || undefined,
        },
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          bio: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({ message: 'Profile updated successfully', user: updated });
    } catch (err) {
      next(err);
    }
  }

  public static async logout(_req: Request, res: Response): Promise<void> {
    res.json({ message: 'Logout successful' });
  }
}
