import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { config, validateConfig } from "./config/index.js";
import { setupSecurity } from "./middleware/security.js";
import { AppLogger } from "./utils/logger.js";

export async function createApp() {
  // Validar configuración antes de inicializar
  try {
    validateConfig();
    AppLogger.info('Configuration validation passed');
  } catch (error) {
    AppLogger.error('Configuration validation failed', error);
    throw error;
  }
  
  const app = express();
  
  // Setup security middleware early
  setupSecurity(app);
  
  // Body parsing with size limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: false, limit: '10mb' }));

  // Enhanced request logging middleware
  app.use((req: any, res, next) => {
    const start = Date.now();
    
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (req.path.startsWith("/api")) {
        AppLogger.request(req, res, duration);
        
        // Also keep the existing simple log for development
        if (config.deployment.isDevelopment) {
          log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
        }
      }
    });

    next();
  });

  const server = await registerRoutes(app);

  // Initialize demo user on startup
  try {
    const { storage } = await import('./storage.js');
    const demoUser = {
      id: '00000000-0000-4000-8000-000000000000',
      email: 'demo@example.com',
      firstName: 'Demo',
      lastName: 'User'
    };
    
    // Check if demo user exists, if not create it
    const existingDemoUser = await storage.getUser(demoUser.id);
    if (!existingDemoUser) {
      await storage.upsertUser(demoUser);
      AppLogger.info('Demo user created successfully');
    } else {
      AppLogger.info('Demo user already exists');
    }
  } catch (error) {
    AppLogger.error('Failed to initialize demo user', error);
  }

  // Setup periodic cache cleanup (every 6 hours in production)
  if (config.deployment.isProduction) {
    setInterval(async () => {
      try {
        const { storage } = await import('./storage.js');
        await storage.cleanupOldSearchCache();
        AppLogger.info('Search cache cleanup completed');
      } catch (error) {
        AppLogger.error('Cache cleanup failed', error);
      }
    }, 6 * 60 * 60 * 1000); // 6 hours
  }

  // Enhanced error handling middleware
  app.use((err: any, req: any, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    let message = err.message || "Internal Server Error";
    
    // Log security events
    if (status === 429) {
      AppLogger.security({
        type: 'rate_limit',
        ip: req.ip,
        userId: req.user?.id,
        details: { endpoint: req.path, method: req.method }
      });
    }
    
    // Log validation errors
    if (status === 400 && err.message.includes('validation')) {
      AppLogger.security({
        type: 'validation_error',
        ip: req.ip,
        userId: req.user?.id,
        details: { endpoint: req.path, error: err.message }
      });
    }
    
    // Don't expose internal errors in production
    if (status === 500 && config.deployment.isProduction) {
      message = "An unexpected error occurred";
    }
    
    // Only send response if not already sent
    if (!res.headersSent) {
      res.status(status).json({ 
        error: message,
        ...(config.deployment.isDevelopment && { stack: err.stack })
      });
    }
    
    // Log the error with context
    AppLogger.error(`Server error: ${err.message}`, {
      error: err,
      request: {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userId: req.user?.id
      }
    });
    
    next();
  });

  // Serve static files
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  return { app, server };
}

// Only start server if this is the main module (for local development)
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const { app, server } = await createApp();
    
    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });
  })();
}
