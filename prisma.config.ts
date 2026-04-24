import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  // @ts-expect-error seed is valid at runtime but missing from Prisma v6 types
  seed: {
    run: "ts-node -P prisma/tsconfig.seed.json prisma/seed.ts",
  },
});
