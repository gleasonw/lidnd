import type { Config } from "drizzle-kit";
 
export default {
  schema: "./server/api/db/schema.ts",
  out: "./server/api/db/drizzle",
} satisfies Config;