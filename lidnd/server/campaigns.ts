import { db } from "@/server/api/db";
import { campaigns, systems } from "@/server/api/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function userCampaigns(userId: string) {
  return await db.select().from(campaigns).where(eq(campaigns.user_id, userId));
}

export async function campaignById(campaignId: string, userId: string) {
  const res = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      description: campaigns.description,
      started_at: campaigns.started_at,
      created_at: campaigns.created_at,
      user_id: campaigns.user_id,
      system: {
        id: systems.id,
        name: systems.name,
        initiative_type: systems.initiative_type,
      },
    })
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.user_id, userId)))
    .leftJoin(systems, eq(campaigns.system_id, systems.id));
  return res.at(0);
}
