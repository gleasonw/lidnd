import type { Config } from "drizzle-kit";

export default {
  schema: "./server/api/db/schema.ts",
  out: "./server/api/db/drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: "postgresql://postgres:postgres@localhost:5432/dnd",
  },
} satisfies Config;
