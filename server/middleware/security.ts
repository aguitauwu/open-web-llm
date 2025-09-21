import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import responseTime from 'response-time';
import type { Express, Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

// Rate limiting para endpoints generales
export const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000 / 60) + ' minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: config.rateLimit.skipSuccessfulRequests,
});

// Rate limiting más estricto para endpoints de IA
export const aiLimiter = rateLimit({
  windowMs: config.rateLimit.aiLimitWindowMs,
  max: config.rateLimit.aiMaxRequests,
  message: {
    error: 'Too many AI requests, please slow down.',
    retryAfter: Math.ceil(config.rateLimit.aiLimitWindowMs / 1000) + ' seconds'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Temporalmente sin keyGenerator personalizado para evitar errores IPv6
});

// Rate limiting para búsquedas
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 20, // 20 búsquedas por minuto
  message: {
    error: 'Too many search requests, please slow down.',
    retryAfter: '60 seconds'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware de seguridad con Helmet
export function setupHelmet(app: Express) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "https://api.gemini.com", "https://api.mistral.ai", "https://openrouter.ai"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: config.deployment.isProduction ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false, // Necesario para algunas integraciones
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));
}

// Middleware de compresión
export function setupCompression(app: Express) {
  app.use(compression({
    filter: (req: Request, res: Response) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6,
    threshold: 1024,
  }));
}

// Middleware de response time
export function setupResponseTime(app: Express) {
  app.use(responseTime((req: Request, res: Response, time: number) => {
    if (config.deployment.isDevelopment) {
      console.log(`${req.method} ${req.url} - ${time.toFixed(2)}ms`);
    }
  }));
}

// Middleware de validación de contenido
export function validateContentType(allowedTypes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const contentType = req.headers['content-type'];
      if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
        return res.status(415).json({
          error: 'Unsupported content type',
          allowed: allowedTypes
        });
      }
    }
    next();
  };
}

// Middleware para limpiar headers sensibles
export function sanitizeHeaders(req: Request, res: Response, next: NextFunction) {
  // Remover headers que pueden exponer información sensible
  delete req.headers['x-forwarded-for'];
  delete req.headers['x-real-ip'];
  
  // Agregar headers de seguridad adicionales
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
}

// Aplicar todos los middleware de seguridad
export function setupSecurity(app: Express) {
  // Trust proxy para rate limiting correcto
  app.set('trust proxy', 1);
  
  // Response time tracking
  setupResponseTime(app);
  
  // Compression
  setupCompression(app);
  
  // Security headers
  setupHelmet(app);
  
  // Content validation
  app.use(validateContentType(['application/json', 'multipart/form-data']));
  
  // Header sanitization
  app.use(sanitizeHeaders);
  
  // General rate limiting
  app.use('/api/', generalLimiter);
}