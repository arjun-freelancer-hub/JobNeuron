import dotenv from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// IMPORTANT: Load environment variables BEFORE importing Worker
// This ensures process.env.API_URL is set before worker.ts evaluates the constant

// Determine the .env file path
// When running `npm run dev` from automation directory, process.cwd() is the automation folder
// __dirname will be the src folder when compiled, but with ts-node it might be different
// So we try multiple locations

let envPath: string | undefined;

// Try 1: Current working directory (most common when running npm scripts)
const cwdEnvPath = resolve(process.cwd(), '.env');
if (existsSync(cwdEnvPath)) {
  envPath = cwdEnvPath;
} else {
  // Try 2: Parent of __dirname (if __dirname is src/)
  const parentEnvPath = resolve(__dirname, '..', '.env');
  if (existsSync(parentEnvPath)) {
    envPath = parentEnvPath;
  } else {
    // Try 3: Just use cwd as fallback
    envPath = cwdEnvPath;
  }
}

// Load .env file FIRST, before any other imports that depend on env vars
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn(`[Worker] ⚠️  Could not load .env file from ${envPath}`);
  console.warn(`[Worker] ⚠️  Error: ${result.error.message}`);
  console.warn(`[Worker] ⚠️  Current working directory: ${process.cwd()}`);
  console.warn(`[Worker] ⚠️  __dirname: ${__dirname}`);
  console.warn(`[Worker] ⚠️  Using default values or system environment variables`);
} else {
  console.log(`[Worker] ✓ Loaded .env file from: ${envPath}`);
}

// Log environment variables for debugging
console.log('[Worker] ========================================');
console.log('[Worker] Environment Variables:');
console.log(`[Worker]   API_URL: ${process.env.API_URL || 'NOT SET (using default: http://localhost:3001)'}`);
console.log(`[Worker]   WORKER_POLL_INTERVAL: ${process.env.WORKER_POLL_INTERVAL || 'NOT SET (using default: 5000ms)'}`);
console.log(`[Worker]   MAX_CONCURRENT_JOBS: ${process.env.MAX_CONCURRENT_JOBS || 'NOT SET (using default: 1)'}`);
console.log(`[Worker]   HEADLESS: ${process.env.HEADLESS || 'NOT SET (using default: true)'}`);
console.log(`[Worker]   BROWSER_TIMEOUT: ${process.env.BROWSER_TIMEOUT || 'NOT SET (using default: 30000ms)'}`);
console.log(`[Worker]   MAX_RETRIES: ${process.env.MAX_RETRIES || 'NOT SET (using default: 3)'}`);
console.log(`[Worker]   RETRY_DELAY: ${process.env.RETRY_DELAY || 'NOT SET (using default: 5000ms)'}`);
console.log(`[Worker]   LOG_LEVEL: ${process.env.LOG_LEVEL || 'NOT SET (using default: info)'}`);
console.log('[Worker] ========================================');

// NOW import Worker after env vars are loaded
import { Worker } from './workers/worker';

async function main() {
  const worker = new Worker();
  await worker.start();
}

main().catch(console.error);
