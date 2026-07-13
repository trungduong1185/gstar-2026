import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const defaultDatabasePath = path.join(process.cwd(), "data", "gstar.db");
const databaseUrl = process.env.DATABASE_URL || `file:${defaultDatabasePath}`;
const globalPrisma = globalThis as typeof globalThis & { gstarPrisma?: PrismaClient };

if (!process.env.DATABASE_URL) {
  fs.mkdirSync(path.dirname(defaultDatabasePath), { recursive: true });
  const sqlite = new Database(defaultDatabasePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.close();
  fs.chmodSync(defaultDatabasePath, 0o600);
}

export const prisma = globalPrisma.gstarPrisma ?? new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: databaseUrl })
});

if (process.env.NODE_ENV !== "production") globalPrisma.gstarPrisma = prisma;
