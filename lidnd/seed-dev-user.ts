import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { campaigns, settings, users } from "@/server/db/schema";
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

const [existingCampaign] = await db
  .select()
  .from(campaigns)
  .where(eq(campaigns.user_id, DEV_USER.id))
  .limit(1);

const campaign =
  existingCampaign ??
  (
    await db
      .insert(campaigns)
      .values({
        name: "Dev Campaign",
        slug: "dev-campaign",
        system: "drawsteel",
        user_id: DEV_USER.id,
      })
      .returning()
  )[0];

if (!campaign) {
  throw new Error("Failed to seed dev campaign");
}

await db
  .update(settings)
  .set({ last_campaign_id: campaign.id })
  .where(eq(settings.user_id, DEV_USER.id));

console.log(`Seeded dev campaign "${campaign.name}" (id: ${campaign.id})`);

await sql.end();
