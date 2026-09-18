import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { settings, users } from "@/server/db/schema";
import { DEV_USER } from "@/server/auth/dev-user";

const db_url = process.env.DATABASE_URL;
if (!db_url) {
  throw new Error("DATABASE_URL not set");
}

const sql = postgres(db_url, { max: 1 });
const db = drizzle(sql);

await db.insert(users).values(DEV_USER).onConflictDoNothing();

await db
  .insert(settings)
  .values({ user_id: DEV_USER.id })
  .onConflictDoNothing();

console.log(`Seeded dev user "${DEV_USER.username}" (id: ${DEV_USER.id})`);

await sql.end();
