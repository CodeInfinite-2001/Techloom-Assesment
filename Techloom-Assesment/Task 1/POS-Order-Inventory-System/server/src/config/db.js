const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const { PGlite } = require('@electric-sql/pglite');

let pool = null;
let pgliteInstance = null;
let isConnected = false;

/**
 * Connect to PostgreSQL:
 * 1. If DATABASE_URL or POSTGRES_URL is provided (Railway PostgreSQL, Neon, Supabase),
 *    connects using standard pg.Pool.
 * 2. Otherwise, starts embedded PGlite (WASM Postgres engine) with local persistence.
 */
async function connectDB() {
  const uri = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PG_URL;

  if (uri) {
    const masked = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
    console.log(`[DB] Connecting to PostgreSQL via connection string (${masked})...`);
    
    pool = new Pool({
      connectionString: uri,
      ssl: uri.includes('localhost') || uri.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    });

    // Test connection
    const client = await pool.connect();
    console.log('[DB] Connected successfully to remote PostgreSQL database.');
    client.release();
  } else {
    console.log('[DB] No DATABASE_URL found. Initializing embedded PostgreSQL (PGlite)...');
    const dataDir = process.env.DATA_DIR || path.join(__dirname, '../../../data/pos_pglite');
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      pgliteInstance = new PGlite(dataDir);
      console.log(`[DB] Embedded PostgreSQL ready with persistence at: ${dataDir}`);
    } catch (err) {
      console.warn('[DB] Persistent directory unavailable, starting in-memory PGlite:', err.message);
      pgliteInstance = new PGlite();
    }
  }

  isConnected = true;
  await initSchema();
}

/**
 * Execute a SQL query with parameter binding across remote or embedded Postgres
 */
async function query(text, params = []) {
  if (!isConnected) {
    throw new Error('Database not connected. Please call connectDB() first.');
  }

  if (pool) {
    return await pool.query(text, params);
  } else if (pgliteInstance) {
    return await pgliteInstance.query(text, params);
  }
}

/**
 * Execute multi-statement SQL script (DDL, tables, indexes)
 */
async function exec(text) {
  if (!isConnected) {
    throw new Error('Database not connected. Please call connectDB() first.');
  }

  if (pool) {
    return await pool.query(text);
  } else if (pgliteInstance) {
    return await pgliteInstance.exec(text);
  }
}

/**
 * Auto-initialize database tables and indexes on first startup
 */
async function initSchema() {
  console.log('[DB] Verifying and initializing database schema...');

  const schemaSql = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      name TEXT,
      salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT DEFAULT 'General',
      price NUMERIC(12, 2) NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      reserved_stock INTEGER NOT NULL DEFAULT 0,
      available_stock INTEGER NOT NULL DEFAULT 0,
      image_url TEXT DEFAULT '',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_products_sku ON products (sku);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      customer_name TEXT DEFAULT 'POS Customer',
      total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Reserved',
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      items JSONB NOT NULL,
      history JSONB DEFAULT '[]'::jsonb,
      payment_details JSONB DEFAULT NULL,
      idempotency_key TEXT,
      user_id TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id TEXT;

    CREATE INDEX IF NOT EXISTS idx_orders_status_expires ON orders (status, expires_at);
    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders (order_number);

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      idempotency_key TEXT UNIQUE NOT NULL,
      amount NUMERIC(12, 2) NOT NULL,
      payment_method TEXT DEFAULT 'Mock Gateway',
      gateway_outcome TEXT NOT NULL,
      status TEXT NOT NULL,
      transaction_id TEXT UNIQUE NOT NULL,
      error_message TEXT DEFAULT '',
      gateway_response JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_payments_idempotency ON payments (idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments (order_id);
  `;

  await exec(schemaSql);
  console.log('[DB] Database schema verified successfully (Users, Products, Orders, Payments).');
}

async function disconnectDB() {
  if (pool) {
    await pool.end();
    pool = null;
  }
  if (pgliteInstance) {
    await pgliteInstance.close();
    pgliteInstance = null;
  }
  isConnected = false;
  console.log('[DB] Disconnected from PostgreSQL database.');
}

module.exports = {
  connectDB,
  disconnectDB,
  query,
  exec,
};
