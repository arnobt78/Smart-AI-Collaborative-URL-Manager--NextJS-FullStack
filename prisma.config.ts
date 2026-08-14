/**
 * Prisma CLI config (replaces deprecated package.json#prisma).
 * Seed: `npx prisma db seed` → tsx prisma/seed.ts
 */
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
