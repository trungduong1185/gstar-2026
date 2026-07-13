import { defineConfig } from "prisma/config";
import path from "node:path";

const databaseUrl = process.env.DATABASE_URL || `file:${path.join(process.cwd(), "data", "gstar.db")}`;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    url: databaseUrl
  }
});
