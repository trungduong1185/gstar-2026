import path from "node:path";

const root = process.cwd();
const configuredDatabaseUrl = process.env.DATABASE_URL;

if (!configuredDatabaseUrl) {
  process.env.DATABASE_URL = `file:${path.join(root, "data", "gstar.db")}`;
} else if (configuredDatabaseUrl.startsWith("file:")) {
  const databasePath = configuredDatabaseUrl.slice("file:".length);
  if (!path.isAbsolute(databasePath)) {
    process.env.DATABASE_URL = `file:${path.resolve(root, databasePath)}`;
  }
}

process.env.HOSTNAME ||= "127.0.0.1";
process.env.PORT ||= "3010";

await import("../.next/standalone/server.js");
