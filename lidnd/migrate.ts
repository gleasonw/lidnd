import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

console.log(process.env.NODE_ENV);

const db_url =
  process.env.NODE_ENV === "production"
    ? process.env.DATABASE_URL
    : "postgresql://will:password@localhost:5432/dnd";
if (!db_url) {
  throw new Error("DATABASE_URL not set");
}

const sql = postgres(db_url, { max: 1 });
const db = drizzle(sql);

await migrate(db, { migrationsFolder: "server/api/db/drizzle" });

sql.end();
