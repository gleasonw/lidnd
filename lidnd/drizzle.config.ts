import type { Config } from "drizzle-kit";

export default {
  schema: "./server/api/db/schema.ts",
  out: "./server/api/db/drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: "postgres://postgres:a2bg6AD44e1ebBc6GEbD1F4fcAdEFDe3@roundhouse.proxy.rlwy.net:22157/railway",
  },
} satisfies Config;
