import type { Config } from "drizzle-kit";

export default {
  schema: "./server/api/db/schema.ts",
  out: "./server/api/db/drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: "postgresql://postgres:wMxbvraQjVFtAeukhAcAYKkJXzQKfnrS@roundhouse.proxy.rlwy.net:27251/railway",
  },
} satisfies Config;
