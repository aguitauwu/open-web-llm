import { createApp } from '../server/index';

// Memoize app creation for cold start efficiency
let appPromise: Promise<{ app: any }> | null = null;

// Standard Vercel Node.js handler
export default async function handler(req: any, res: any) {
  // Initialize app only once and reuse across invocations
  if (!appPromise) {
    appPromise = createApp();
  }
  
  const { app } = await appPromise;
  return app(req, res);
}