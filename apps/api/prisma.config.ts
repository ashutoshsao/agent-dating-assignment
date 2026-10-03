import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // `prisma generate` runs at image build time without a database, so don't require the URL there
  datasource: { url: process.env.DATABASE_URL ?? "postgresql://build:build@localhost:5432/build" },
});
