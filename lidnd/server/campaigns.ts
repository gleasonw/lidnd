import type { LidndContext } from "@/server/api/base-trpc";
import { db } from "@/server/api/db";
import { campaigns } from "@/server/api/db/schema";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { cache } from "react";

export const ServerCampaign = {
  userCampaigns: async function (ctx: LidndContext) {
    return await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.user_id, ctx.user.id));
  },

  campaignFromSlug: cache(async function (
    ctx: LidndContext,
    campaignSlug: string
  ) {
    return await db.query.campaigns.findFirst({
      where: (campaigns, { eq, and }) =>
        and(
          eq(campaigns.user_id, ctx.user.id),
          eq(campaigns.slug, campaignSlug)
        ),
      with: {
        encounters: true,
      },
    });
  }),

  campaignById: async function (
    ctx: LidndContext,
    campaignId: string,
    dbObject = db
  ) {
    return await dbObject.query.campaigns.findFirst({
      where: (campaigns, { eq, and }) =>
        and(eq(campaigns.id, campaignId), eq(campaigns.user_id, ctx.user.id)),

      with: {
        system: true,
        campaignToPlayers: {
          with: {
            player: true,
          },
        },
        encounters: true,
      },
    });
  },

  campaignByIdThrows: async function (
    ctx: LidndContext,
    campaignId: string,
    dbObject = db
  ) {
    const campaign = await this.campaignById(ctx, campaignId, dbObject);

    if (!campaign) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "No campaign found",
      });
    }

    return campaign;
  },
};
