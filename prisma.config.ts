import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node ./prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
    // Only includes the property if the environment variable is actually defined
    ...(process.env.SHADOW_DATABASE_URL ? { shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL } : {}),
  },
});
