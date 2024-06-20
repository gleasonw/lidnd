import { LidndUserId } from "@/app/authentication";
import { db } from "@/server/api/db";
import {
  campaigns,
  campaignToPlayer,
  creatures,
  systems,
} from "@/server/api/db/schema";
import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";

export const ServerCampaign = {
  userCampaigns: async function (userId: LidndUserId) {
    return await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.user_id, userId));
  },

  campaignById: async function (campaignId: string, userId: LidndUserId) {
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
  },

  campaignByIdThrows: async function (campaignId: string, userId: LidndUserId) {
    const campaign = await this.campaignById(campaignId, userId);

    if (!campaign) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "No campaign found",
      });
    }

    return campaign;
  },

  playersInCampaign: async function (
    campaignId: string,
    userId: LidndUserId,
    dbObject = db
  ) {
    return await dbObject
      .select({
        campaign_id: campaignToPlayer.campaign_id,
        player: {
          id: campaignToPlayer.player_id,
          name: creatures.name,
        },
      })
      .from(campaignToPlayer)
      .where(eq(campaignToPlayer.campaign_id, campaignId))
      .leftJoin(
        creatures,
        and(
          eq(campaignToPlayer.player_id, creatures.id),
          eq(creatures.user_id, userId)
        )
      );
  },
};
