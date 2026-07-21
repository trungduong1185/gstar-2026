import path from "node:path";
import fs from "node:fs";

const root = process.cwd();

// In standalone mode, process.cwd() is .next/standalone/. The real data dir is
// two levels up. Detect it so uploads land in the project's data/ directory.
const standaloneData = path.join(root, "data");
const projectData = path.join(root, "..", "..", "data");
const dataDir = fs.existsSync(projectData) ? projectData : standaloneData;
process.env.GSTAR_DATA_DIR = dataDir;

const configuredDatabaseUrl = process.env.DATABASE_URL;

if (!configuredDatabaseUrl) {
  process.env.DATABASE_URL = `file:${path.join(dataDir, "gstar.db")}`;
} else if (configuredDatabaseUrl.startsWith("file:")) {
  const databasePath = configuredDatabaseUrl.slice("file:".length);
  if (!path.isAbsolute(databasePath)) {
    process.env.DATABASE_URL = `file:${path.resolve(root, databasePath)}`;
  }
}

process.env.HOSTNAME ||= "127.0.0.1";
process.env.PORT ||= "3010";

await import("../.next/standalone/server.js");
