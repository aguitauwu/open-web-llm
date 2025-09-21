// Configuración centralizada para mayor seguridad y mantenibilidad
export const config = {
  // Base configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000'),
  
  // Database configuration
  database: {
    url: process.env.DATABASE_URL,
    maxConnections: 20,
    connectionTimeout: 30000,
  },
  
  // Authentication configuration
  auth: {
    sessionSecret: process.env.SESSION_SECRET,
    sessionTtl: 7 * 24 * 60 * 60 * 1000, // 1 week in milliseconds
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    },
  },
  
  // AI Models configuration
  ai: {
    geminiKey: process.env.GEMINI_API_KEY,
    mistralKey: process.env.MISTRAL_API_KEY,
    openRouterKey: process.env.OPENROUTER_API_KEY,
    defaultModel: 'gemini-2.5-flash',
    maxTokens: 8000,
    temperature: 0.7,
  },
  
  // Search APIs configuration
  search: {
    googleApiKey: process.env.GOOGLE_API_KEY,
    googleSearchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID,
    youtubeApiKey: process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY,
  },
  
  // Rate limiting configuration
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipSuccessfulRequests: false,
    aiLimitWindowMs: 60 * 1000, // 1 minute for AI requests
    aiMaxRequests: 10, // 10 AI requests per minute
  },
  
  // Storage configuration
  storage: {
    type: process.env.STORAGE_TYPE || 'database',
    mongoUrl: process.env.MONGODB_URL,
  },
  
  // Deployment configuration
  deployment: {
    vercelUrl: process.env.VERCEL_URL,
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  },
  
  // Validation limits
  validation: {
    maxPromptLength: 8000,
    maxTitleLength: 200,
    maxModelNameLength: 50,
    maxSearchQueryLength: 500,
  },
};

// Validar configuración crítica al inicializar
export function validateConfig() {
  const errors: string[] = [];
  
  if (!config.auth.sessionSecret) {
    errors.push('SESSION_SECRET is required');
  }
  
  if (config.auth.sessionSecret && config.auth.sessionSecret.length < 32) {
    errors.push('SESSION_SECRET must be at least 32 characters long');
  }
  
  if (!config.database.url && config.storage.type === 'database') {
    errors.push('DATABASE_URL is required when using database storage');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
  
  return true;
}