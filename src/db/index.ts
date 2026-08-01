import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';

const { Pool } = pg;

// Helper to delay execution
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Retry helper for async database/connection operations
async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 6, delay = 1000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errMsg = err.message || '';
      
      // Check for common connection issues, unexpected termination, etc.
      const isConnectionError = 
        errMsg.includes('Connection terminated unexpectedly') ||
        errMsg.includes('terminate') ||
        errMsg.includes('closed') ||
        errMsg.includes('connection') ||
        errMsg.includes('timeout') ||
        errMsg.includes('ECONNRESET') ||
        errMsg.includes('EPIPE');

      if (isConnectionError) {
        console.warn(`[DB Connection Warning] Query failed due to connection issue (attempt ${i + 1}/${retries}). Retrying in ${delay}ms... Error: ${errMsg}`);
        await sleep(delay);
        delay = Math.min(delay * 2, 8000); // Exponential backoff with capped delay at 8s
        continue;
      }
      throw err; // For non-connection errors (like syntax error, schema error), fail immediately
    }
  }
  throw lastError;
}

export const createPool = () => {
  const useSSL = process.env.SQL_SSL === 'true' || (process.env.SQL_HOST && process.env.SQL_HOST.includes('azure.com'));
  const p = new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 2000, // short idle timeout to prune dead connections quickly
    max: 10,
    ssl: useSSL ? { rejectUnauthorized: false } : undefined,
    keepAlive: true,
    keepAliveInitialDelayMillis: 5000,
  });

  // Wrap pool.query to support automatic retries on connection failure
  const originalQuery = p.query;
  p.query = function (this: any, ...args: any[]) {
    return retryWithBackoff(() => originalQuery.apply(this, args));
  } as any;

  // Wrap pool.connect to support automatic retries on connection failure
  const originalConnect = p.connect;
  p.connect = function (this: any, ...args: any[]) {
    const callback = typeof args[0] === 'function' ? args[0] : null;
    if (callback) {
      return originalConnect.call(this, (err: any, client: any, done: any) => {
        callback(err, client, done);
      });
    }

    return retryWithBackoff(async () => {
      return await originalConnect.apply(this, args);
    });
  } as any;

  return p;
};

const pool = createPool();

pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

export const db = drizzle(pool, { schema });
