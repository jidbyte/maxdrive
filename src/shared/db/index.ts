import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
}

// The WebSocket (Pool) driver — unlike neon-http — supports interactive
// transactions, which checkout, stock movements, purchase receipts and work
// orders rely on (db.transaction(async (tx) => …)).
// Node 22+ ships a global WebSocket; fall back to `ws` for older runtimes.
if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

// Reuse one pool across hot reloads in dev.
const globalForDb = globalThis as unknown as { __maxdrivePool?: Pool };
const pool =
  globalForDb.__maxdrivePool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (process.env.NODE_ENV !== "production") globalForDb.__maxdrivePool = pool;

export const db = drizzle({ client: pool, schema });

export type Db = typeof db;
/** Either the root db or a transaction handle — for helpers usable in both. */
export type DbOrTx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];
