import dotenv from 'dotenv';
dotenv.config();

import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import * as schema from './schema.ts';

const { Pool } = pg;

function isRealDbConfigured(): boolean {
  const user = process.env.SQL_USER?.trim() || process.env.SQL_ADMIN_USER?.trim();
  const password = process.env.SQL_PASSWORD?.trim() || process.env.SQL_ADMIN_PASSWORD?.trim();
  const host = process.env.SQL_HOST?.trim();
  const dbName = process.env.SQL_DB_NAME?.trim();
  const connectionString = process.env.DATABASE_URL?.trim();

  if (connectionString) return true;
  return Boolean(host && dbName && user && password);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 6, delay = 1000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errMsg = err.message || '';

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
        delay = Math.min(delay * 2, 8000);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

let dbInstance: any;
let pgliteInstance: PGlite | null = null;
let schemaInitPromise: Promise<void> | null = null;

if (isRealDbConfigured()) {
  console.log('[DB] Connecting to configured remote PostgreSQL database...');
  const user = process.env.SQL_USER?.trim() || process.env.SQL_ADMIN_USER?.trim();
  const password = process.env.SQL_PASSWORD?.trim() || process.env.SQL_ADMIN_PASSWORD?.trim();
  const useSSL = process.env.SQL_SSL === 'true' || (process.env.SQL_HOST && process.env.SQL_HOST.includes('azure.com'));
  const connectionString = process.env.DATABASE_URL?.trim();

  const config: any = connectionString
    ? {
      connectionString,
      ssl: useSSL ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 2000,
      max: 10,
      keepAlive: true,
      keepAliveInitialDelayMillis: 5000,
    }
    : {
      host: process.env.SQL_HOST,
      user,
      password,
      database: process.env.SQL_DB_NAME,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 2000,
      max: 10,
      keepAlive: true,
      keepAliveInitialDelayMillis: 5000,
      ssl: useSSL ? { rejectUnauthorized: false } : undefined,
    };

  const pool = new Pool(config);

  const originalQuery = pool.query;
  pool.query = function (this: any, ...args: any[]) {
    return retryWithBackoff(() => originalQuery.apply(this, args));
  } as any;

  const originalConnect = pool.connect;
  pool.connect = function (this: any, ...args: any[]) {
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

  pool.on('error', (err) => {
    console.error('Unexpected error on idle SQL pool client:', err);
  });

  dbInstance = drizzlePg(pool, { schema });
  schemaInitPromise = Promise.resolve();
} else {
  console.log('[DB Warning] Missing required database environment variables. Initializing in-memory PostgreSQL (PGlite) engine...');
  pgliteInstance = new PGlite();
  dbInstance = drizzlePglite(pgliteInstance, { schema });

  schemaInitPromise = (async () => {
    if (!pgliteInstance) return;
    try {
      await pgliteInstance.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT UNIQUE,
          mobile TEXT UNIQUE,
          email TEXT,
          pin TEXT,
          shop_name TEXT,
          dealer_commission DOUBLE PRECISION DEFAULT 0,
          status TEXT DEFAULT 'pending',
          role TEXT DEFAULT 'client',
          user_type TEXT DEFAULT 'Owner',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS uploads (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          filename TEXT,
          record_count INTEGER,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS records (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          upload_id INTEGER REFERENCES uploads(id),
          dealer_code TEXT,
          company_code TEXT,
          cost_price DOUBLE PRECISION DEFAULT 0,
          dealer_commission DOUBLE PRECISION DEFAULT 0,
          source TEXT DEFAULT 'Manual',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS published_tables (
          id TEXT PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          title TEXT,
          data TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          action TEXT,
          details TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS user_services (
          user_id INTEGER NOT NULL REFERENCES users(id),
          service_name TEXT NOT NULL,
          is_enabled INTEGER DEFAULT 0,
          PRIMARY KEY (user_id, service_name)
        );

        CREATE TABLE IF NOT EXISTS global_services (
          name TEXT PRIMARY KEY,
          is_published INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS clients (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          name TEXT NOT NULL,
          contact_number TEXT,
          address TEXT,
          interested_dealer_code TEXT,
          enquiry_date TEXT,
          bought_dealer_code TEXT,
          bought_date TEXT,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS client_purchases (
          id SERIAL PRIMARY KEY,
          client_id INTEGER REFERENCES clients(id),
          item_details TEXT,
          amount DOUBLE PRECISION,
          purchase_date TEXT,
          dealer_code TEXT
        );

        CREATE TABLE IF NOT EXISTS user_settings (
          user_id INTEGER PRIMARY KEY REFERENCES users(id),
          reminder_days INTEGER DEFAULT 7
        );

        CREATE TABLE IF NOT EXISTS invoices (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          client_id INTEGER REFERENCES clients(id),
          invoice_number TEXT,
          customer_name TEXT,
          customer_mobile TEXT,
          date TEXT,
          total_amount DOUBLE PRECISION DEFAULT 0,
          status TEXT DEFAULT 'pending',
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS invoice_items (
          id SERIAL PRIMARY KEY,
          invoice_id INTEGER REFERENCES invoices(id),
          description TEXT,
          quantity DOUBLE PRECISION DEFAULT 1,
          unit_price DOUBLE PRECISION DEFAULT 0,
          amount DOUBLE PRECISION DEFAULT 0
        );
      `);
      console.log('[DB] PGlite schema initialized successfully.');
    } catch (err) {
      console.error('[DB] Failed to initialize PGlite schema:', err);
    }
  })();
}

export const db = dbInstance;
export const ensureDbReady = async () => {
  if (schemaInitPromise) {
    await schemaInitPromise;
  }
};

