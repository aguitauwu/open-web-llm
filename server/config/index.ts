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
  
  // Validation limits (configurable via environment variables)
  validation: {
    maxPromptLength: parseInt(process.env.MAX_PROMPT_LENGTH || '8000'),
    maxTitleLength: parseInt(process.env.MAX_TITLE_LENGTH || '200'),
    maxModelNameLength: parseInt(process.env.MAX_MODEL_NAME_LENGTH || '50'),
    maxSearchQueryLength: parseInt(process.env.MAX_SEARCH_QUERY_LENGTH || '500'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
    maxConversationsPerUser: parseInt(process.env.MAX_CONVERSATIONS_PER_USER || '100'),
    maxMessagesPerConversation: parseInt(process.env.MAX_MESSAGES_PER_CONVERSATION || '1000'),
  },
};

// Validar configuración crítica al inicializar
export function validateConfig() {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validación crítica (causará fallo de inicialización solo si auth está habilitada)
  const isAuthEnabled = config.auth.google.clientId && config.auth.google.clientSecret;
  
  if (isAuthEnabled && !config.auth.sessionSecret) {
    errors.push('SESSION_SECRET is required when authentication is enabled');
  }
  
  if (config.auth.sessionSecret && config.auth.sessionSecret.length < 32) {
    errors.push('SESSION_SECRET must be at least 32 characters long for security');
  }
  
  if (!config.database.url && config.storage.type === 'database') {
    errors.push('DATABASE_URL is required when using database storage. Please provision a database.');
  }
  
  // Validación de APIs (causará warnings)
  if (!config.ai.geminiKey && !config.ai.mistralKey && !config.ai.openRouterKey) {
    warnings.push('No AI API keys configured. AI functionality will not work. Set GEMINI_API_KEY, MISTRAL_API_KEY, or OPENROUTER_API_KEY');
  }
  
  if (!config.auth.google.clientId || !config.auth.google.clientSecret) {
    warnings.push('Google OAuth not configured. Users won\'t be able to log in with Google. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
  }
  
  if (!config.search.googleApiKey || !config.search.googleSearchEngineId) {
    warnings.push('Google Search API not configured. Web search functionality will be limited. Set GOOGLE_API_KEY and GOOGLE_SEARCH_ENGINE_ID');
  }
  
  if (!config.search.youtubeApiKey) {
    warnings.push('YouTube API not configured. Video search functionality will not work. Set YOUTUBE_API_KEY');
  }
  
  // Validación de formato de API keys
  if (config.ai.geminiKey && !isValidApiKeyFormat(config.ai.geminiKey, 'gemini')) {
    warnings.push('GEMINI_API_KEY appears to have invalid format');
  }
  
  if (config.auth.google.clientId && !isValidGoogleClientId(config.auth.google.clientId)) {
    warnings.push('GOOGLE_CLIENT_ID appears to have invalid format');
  }
  
  // Log warnings
  if (warnings.length > 0) {
    console.warn('\n⚠️  Configuration warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
    console.warn('');
  }
  
  // Throw errors
  if (errors.length > 0) {
    throw new Error(`❌ Configuration validation failed:\n${errors.map(e => `   - ${e}`).join('\n')}`);
  }
  
  return true;
}

// Helper functions for API key validation
function isValidApiKeyFormat(key: string, provider: string): boolean {
  switch (provider) {
    case 'gemini':
      return key.startsWith('AI') && key.length > 20;
    default:
      return key.length > 10; // Basic length check
  }
}

function isValidGoogleClientId(clientId: string): boolean {
  return clientId.includes('.googleusercontent.com') || clientId.includes('.apps.googleusercontent.com');
}