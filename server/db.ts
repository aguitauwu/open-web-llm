import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket constructor
neonConfig.webSocketConstructor = ws;

// Configure SSL settings - Use secure settings even in development
// Only allow insecure connections in development with explicit opt-in
if (process.env.NODE_ENV === 'development' && process.env.ALLOW_INSECURE_TLS === 'true') {
  console.warn('⚠️  WARNING: TLS certificate verification is disabled. This should only be used in local development.');
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
} else if (process.env.ALLOW_INSECURE_TLS === 'true') {
  console.error('❌ ERROR: ALLOW_INSECURE_TLS cannot be used in production. Ignoring setting.');
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });