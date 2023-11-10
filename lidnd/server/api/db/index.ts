import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let queryClient: ReturnType<typeof postgres>;

const db_url = process.env.NODE_ENV === 'production' ? process.env.DATABASE_URL : 'postgresql://will:password@localhost:5432/dnd'
if (!db_url) {
  throw new Error("DATABASE_URL not set");
}

if (process.env.NODE_ENV === "production") {
  queryClient = postgres(db_url);
} else {
  // @ts-ignore
  if (!global.queryClient) {
      // @ts-ignore
    global.queryClient = postgres(db_url);
  }
  // @ts-ignore
  queryClient = global.queryClient;
}

// for query purposes
export const db = drizzle(queryClient, { schema });
export { queryClient };
