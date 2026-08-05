import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error.middleware.js';
import { RegisterInput, LoginInput } from './auth.schema.js';
import { isLocalEnv } from '../../lib/envMode.js';

// In-memory fallback user store if DB connection fails
const memoryUsers = new Map<string, any>();

// Google OAuth client (lazy singleton)
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export class AuthService {
  static generateTokens(user: { id: string; email: string; role: string }) {
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN as any }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any }
    );

    return { accessToken, refreshToken };
  }

  static async register(input: RegisterInput) {
    const hashedPassword = await bcrypt.hash(input.password, 10);

    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new AppError('Email already registered', 400);
      }

      const user = await prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          passwordHash: hashedPassword,
          role: 'USER',
        },
      });

      const tokens = this.generateTokens(user);
      return { user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, avatarUrl: user.avatarUrl }, ...tokens };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (!isLocalEnv()) {
        throw new AppError('Registration unavailable. Database is unreachable.', 503);
      }

      // Memory fallback for test environment if DB is unreachable
      if (memoryUsers.has(input.email)) {
        throw new AppError('Email already registered', 400);
      }

      const mockUser = {
        id: `usr_${Date.now()}`,
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash: hashedPassword,
        role: 'USER',
        avatarUrl: null,
      };

      memoryUsers.set(input.email, mockUser);
      const tokens = this.generateTokens(mockUser);
      return { user: { id: mockUser.id, name: mockUser.name, email: mockUser.email, phone: mockUser.phone, role: mockUser.role, avatarUrl: mockUser.avatarUrl }, ...tokens };
    }
  }

  static async login(input: LoginInput) {
    let user: any = null;

    try {
      user = await prisma.user.findUnique({
        where: { email: input.email },
      });
    } catch (err) {
      if (!isLocalEnv()) {
        throw new AppError('Login unavailable. Database is unreachable.', 503);
      }
      user = memoryUsers.get(input.email);
    }

    if (!user && isLocalEnv() && memoryUsers.has(input.email)) {
      user = memoryUsers.get(input.email);
    }

    if (!user) {
      if (isLocalEnv() && input.email === 'demo@cinebook.com' && input.password === 'password123') {
        const hashedPassword = await bcrypt.hash('password123', 10);
        user = {
          id: 'usr_demo',
          name: 'Demo User',
          email: 'demo@cinebook.com',
          phone: '+977-9800000000',
          passwordHash: hashedPassword,
          role: 'USER',
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
        };
        memoryUsers.set(input.email, user);
      } else {
        throw new AppError('Invalid credentials', 401);
      }
    }

    // Reject if this account was created via Google OAuth (no password set)
    if (!user.passwordHash) {
      throw new AppError('This account uses Google Sign-In. Please log in with Google.', 400);
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 401);
    }

    const tokens = this.generateTokens(user);
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      ...tokens,
    };
  }

  /**
   * Google OAuth login / auto-registration.
   * Verifies the Google ID token, then finds or creates a user.
   */
  static async googleLogin(idToken: string) {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new AppError('Google login is not configured on this server', 503);
    }

    // 1. Verify the Google ID token
    let payload: any;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      throw new AppError('Invalid Google token', 401);
    }

    if (!payload?.email) {
      throw new AppError('Could not retrieve email from Google account', 400);
    }

    const { sub: googleId, email, name, picture } = payload;

    // 2. Find or create user
    try {
      // Try to find by googleId first (fastest path for returning Google users)
      let user = await prisma.user.findUnique({ where: { googleId } });

      if (!user) {
        // Check if email is already registered via password
        const existingByEmail = await prisma.user.findUnique({ where: { email } });

        if (existingByEmail) {
          // Link Google ID to existing email account (account merging)
          user = await prisma.user.update({
            where: { email },
            data: {
              googleId,
              // Update avatar only if they don't have one
              avatarUrl: existingByEmail.avatarUrl ?? picture ?? null,
            },
          });
        } else {
          // Brand new user â€” create account
          user = await prisma.user.create({
            data: {
              name: name ?? 'Google User',
              email,
              googleId,
              avatarUrl: picture ?? null,
              role: 'USER',
              // passwordHash left null â€” this is a Google-only account
            },
          });
        }
      }

      const tokens = this.generateTokens(user);
      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
        ...tokens,
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (!isLocalEnv()) {
        throw new AppError('Google login unavailable. Database is unreachable.', 503);
      }

      // Memory fallback when DB is unreachable (test only)
      const memKey = `google:${googleId}`;
      let memUser = memoryUsers.get(memKey) ?? memoryUsers.get(email);

      if (!memUser) {
        memUser = {
          id: `usr_${Date.now()}`,
          name: name ?? 'Google User',
          email,
          phone: null,
          googleId,
          role: 'USER',
          avatarUrl: picture ?? null,
        };
        memoryUsers.set(memKey, memUser);
        memoryUsers.set(email, memUser);
      }

      const tokens = this.generateTokens(memUser);
      return {
        user: {
          id: memUser.id,
          name: memUser.name,
          email: memUser.email,
          phone: memUser.phone,
          role: memUser.role,
          avatarUrl: memUser.avatarUrl,
        },
        ...tokens,
      };
    }
  }

  static async refreshToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { id: string };
      
      let user: any = null;
      try {
        user = await prisma.user.findUnique({ where: { id: decoded.id } });
      } catch (e) {
        if (!isLocalEnv()) {
          throw new AppError('Token refresh unavailable. Database is unreachable.', 503);
        }
        for (const u of memoryUsers.values()) {
          if (u.id === decoded.id) {
            user = u;
            break;
          }
        }
      }

      if (!user) {
        throw new AppError('User not found', 404);
      }

      const tokens = this.generateTokens(user);
      return tokens;
    } catch (err) {
      throw new AppError('Invalid refresh token', 401);
    }
  }
}

