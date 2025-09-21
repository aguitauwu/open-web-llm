import winston from 'winston';
import { config } from '../config/index.js';

// Configuración del logger con Winston
const logger = winston.createLogger({
  level: config.deployment.isDevelopment ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.colorize({ all: config.deployment.isDevelopment })
  ),
  transports: [
    // Console logging
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level}] ${message}${metaStr}`;
        })
      )
    })
  ],
  exceptionHandlers: [
    new winston.transports.Console()
  ],
  rejectionHandlers: [
    new winston.transports.Console()
  ]
});

// Tipos de logs estructurados
export interface SecurityLogData {
  type: 'rate_limit' | 'validation_error' | 'auth_failure' | 'suspicious_activity';
  ip?: string;
  userId?: string;
  details: any;
}

export interface PerformanceLogData {
  type: 'api_request' | 'database_query' | 'ai_request';
  duration: number;
  endpoint?: string;
  status?: number;
  details?: any;
}

export interface AILogData {
  type: 'ai_request' | 'ai_response' | 'ai_error';
  model: string;
  userId?: string;
  promptLength?: number;
  responseLength?: number;
  duration?: number;
  error?: string;
}

// Logging functions específicas
export class AppLogger {
  // Log general
  static info(message: string, meta?: any) {
    logger.info(message, meta);
  }
  
  static error(message: string, error?: Error | any) {
    logger.error(message, { error: error?.message, stack: error?.stack });
  }
  
  static warn(message: string, meta?: any) {
    logger.warn(message, meta);
  }
  
  static debug(message: string, meta?: any) {
    logger.debug(message, meta);
  }
  
  // Security logging
  static security(data: SecurityLogData) {
    logger.warn('Security Event', data);
  }
  
  // Performance logging
  static performance(data: PerformanceLogData) {
    const level = data.duration > 5000 ? 'warn' : 'info';
    logger.log(level, 'Performance Event', data);
  }
  
  // AI operations logging
  static ai(data: AILogData) {
    const level = data.type === 'ai_error' ? 'error' : 'info';
    logger.log(level, 'AI Event', data);
  }
  
  // HTTP request logging
  static request(req: any, res: any, duration: number) {
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id
    };
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request Error', logData);
    } else if (duration > 2000) {
      logger.warn('Slow HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  }
}

export default logger;