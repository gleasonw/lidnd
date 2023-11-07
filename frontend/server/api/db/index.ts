import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const db_url = process.env.DATABASE_URL;
if (!db_url) {
  throw new Error("DATABASE_URL not set");
}

// for query purposes
export const queryClient = postgres(db_url);
export const db = drizzle(queryClient, { schema });
