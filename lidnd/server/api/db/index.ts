import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let queryClient: ReturnType<typeof postgres>;

const db_url = process.env.DATABASE_URL;
if (!db_url) {
  throw new Error("DATABASE_URL not set");
}

if(process.env.NODE_ENV === "production"){
  queryClient = postgres(db_url);
}else{
  if(!global.queryClient){
    global.queryClient = postgres(db_url);
  }
  queryClient = global.queryClient;
}

// for query purposes
export const db = drizzle(queryClient, { schema });
export { queryClient };
