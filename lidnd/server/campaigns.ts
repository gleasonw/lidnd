import { db } from "@/server/api/db";
import {
  campaigns,
  campaignsToPlayers,
  creatures,
  systems,
} from "@/server/api/db/schema";
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

export async function playersInCampaign(
  campaignId: string,
  userId: string,
  dbObject = db
) {
  return await dbObject
    .select({
      campaign_id: campaignsToPlayers.campaign_id,
      player: {
        id: campaignsToPlayers.player_id,
        name: creatures.name,
      },
    })
    .from(campaignsToPlayers)
    .where(eq(campaignsToPlayers.campaign_id, campaignId))
    .leftJoin(
      creatures,
      and(
        eq(campaignsToPlayers.player_id, creatures.id),
        eq(creatures.user_id, userId)
      )
    );
}