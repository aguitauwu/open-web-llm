import passport from "passport";
import { Strategy as GoogleStrategy, VerifyCallback } from "passport-google-oauth20";
import session from "express-session";
import MongoStore from "connect-mongo";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";
import { AppLogger } from './utils/logger.js';

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  AppLogger.warn("Google OAuth credentials not provided. Users won't be able to authenticate with Google", { 
    missing: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    suggestion: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables'
  });
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  let sessionStore;
  if (process.env.STORAGE_TYPE === 'mongodb' && process.env.MONGODB_URL) {
    sessionStore = MongoStore.create({
      mongoUrl: process.env.MONGODB_URL,
      ttl: sessionTtl / 1000, // TTL in seconds
      collectionName: 'sessions',
    });
  }
  
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required for Google authentication");
  }

  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  });
}

async function upsertUser(profile: any) {
  await storage.upsertUser({
    id: profile.id,
    email: profile.emails[0].value,
    firstName: profile.name.givenName,
    lastName: profile.name.familyName,
    profileImageUrl: profile.photos[0].value,
  });
}

export async function setupGoogleAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Only set up Google OAuth if credentials are available
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    // Configure Google OAuth strategy
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5000'}/api/auth/google/callback`
    }, async (accessToken: string, refreshToken: string, profile: any, done: VerifyCallback) => {
      try {
        // Save user to database
        await upsertUser(profile);
        
        // Return user profile (NEVER include tokens in user object for security)
        const user = {
          id: profile.id,
          email: profile.emails?.[0]?.value,
          firstName: profile.name?.givenName,
          lastName: profile.name?.familyName,
          profileImageUrl: profile.photos?.[0]?.value,
        };
        
        return done(null, user);
      } catch (error) {
        return done(error, undefined);
      }
    }));

    // Serialize user
    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });

    // Deserialize user
    passport.deserializeUser(async (id: string, done) => {
      try {
        const user = await storage.getUser(id);
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    });

    // Google OAuth routes
    app.get('/api/auth/google', 
      passport.authenticate('google', { scope: ['profile', 'email'] })
    );

    app.get('/api/auth/google/callback', 
      passport.authenticate('google', { failureRedirect: '/login' }),
      (req, res) => {
        // Success redirect
        res.redirect('/');
      }
    );
  }

  // Get current user (always available)
  app.get('/api/auth/user', (req: any, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  });

  // Logout (always available)
  app.get('/api/logout', (req: any, res) => {
    req.logout((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Error logging out" });
      }
      res.redirect('/');
    });
  });
}

export const isAuthenticated: RequestHandler = (req: any, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Middleware de autenticación opcional para modo demo
export const optionalAuth: RequestHandler = (req: any, res, next) => {
  // Si está autenticado, usar el usuario real
  if (req.isAuthenticated()) {
    return next();
  }
  
  // Si no está autenticado, crear usuario demo temporal
  req.user = {
    id: 'demo-user',
    email: 'demo@example.com',
    firstName: 'Demo',
    lastName: 'User',
    isDemo: true
  };
  
  return next();
};