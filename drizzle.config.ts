import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "mysql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "mysql://lexnepal:lexnepal_local_dev@127.0.0.1:3306/lexnepal",
  },
  strict: true,
  verbose: true,
});
