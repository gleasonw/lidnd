import { type LidndContext } from "@/server/api/base-trpc";
import { db } from "@/server/db";
import {
  campaigns,
  encounter_tags,
  encounter_to_tag,
  encounters,
  gameSessions,
} from "@/server/db/schema";
import { ServerEncounter } from "@/server/sdk/encounters";
import { TRPCError } from "@trpc/server";
import { and, eq, ilike, inArray, isNull } from "drizzle-orm";
import { cache } from "react";

export const ServerCampaign = {
  async getActiveSession({
    ctx,
    campaignId,
  }: {
    ctx: LidndContext;
    campaignId: string;
  }) {
    return (
      (await db.query.gameSessions.findFirst({
        where: and(
          isNull(gameSessions.ended_at),
          eq(gameSessions.user_id, ctx.user.id),
          eq(gameSessions.campaign_id, campaignId)
        ),
      })) ?? null
    );
  },
  userCampaigns: async function (ctx: LidndContext) {
    return await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.user_id, ctx.user.id));
  },

  addCreatureToAllEncounters: async function (
    ctx: LidndContext,
    args: { creatureId: string; campaign: { id: string } },
    dbObject = db
  ) {
    // add player to all encounters in campaign
    const campaignEncounters = await db.query.encounters.findMany({
      where: eq(encounters.campaign_id, args.campaign.id),
    });
    await Promise.all(
      campaignEncounters.map((e) =>
        ServerEncounter.addParticipant(
          ctx,
          {
            encounter_id: e.id,
            creature_id: args.creatureId,
          },
          dbObject
        )
      )
    );
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
        campaignToPlayers: {
          with: {
            player: true,
          },
        },
        legacySystem: true,
      },
    });
  }),

  sessionFromId: async function (
    ctx: LidndContext,
    gameSessionId: string,
    dbObject = db
  ) {
    return await dbObject.query.gameSessions.findFirst({
      where: (sessions, { eq, and }) =>
        and(eq(sessions.id, gameSessionId), eq(sessions.user_id, ctx.user.id)),
      with: {
        encounters: {
          with: {
            participants: {
              with: {
                creature: true,
                status_effects: {
                  with: {
                    effect: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  sessionsForCampaign: async function (
    ctx: LidndContext,
    campaignId: string,
    dbObject = db
  ) {
    return await dbObject.query.gameSessions.findMany({
      where: (sessions, { eq, and }) =>
        and(
          eq(sessions.campaign_id, campaignId),
          eq(sessions.user_id, ctx.user.id)
        ),
      with: {
        encounters: {
          with: {
            participants: {
              with: {
                creature: true,
              },
            },
          },
        },
      },
    });
  },

  encountersByTag: async function (
    ctx: LidndContext,
    filters: { campaignId: string; tagId?: string },
    dbObject = db
  ) {
    const filtersToApply = [
      eq(encounters.campaign_id, filters.campaignId),
      eq(encounters.user_id, ctx.user.id),
    ];
    if (filters.tagId) {
      filtersToApply.push(eq(encounter_to_tag.tag_id, filters.tagId));
    }

    const campaignTagQuery = await dbObject
      .select()
      .from(encounters)
      .innerJoin(
        encounter_to_tag,
        eq(encounters.id, encounter_to_tag.encounter_id)
      )
      .innerJoin(encounter_tags, eq(encounter_to_tag.tag_id, encounter_tags.id))
      .where(
        and(
          ...[...filtersToApply, eq(encounters.campaign_id, filters.campaignId)]
        )
      );
    const campaignTagIds = campaignTagQuery.map((t) => t.encounter_tags.id);
    return await dbObject.query.encounter_tags.findMany({
      where:
        campaignTagIds.length > 0
          ? inArray(encounter_tags.id, campaignTagIds)
          : undefined,
      with: {
        encounterLinks: {
          with: { encounter: true },
        },
      },
    });
  },

  encounters: async function (
    ctx: LidndContext,
    filters: { campaignId: string; matchName?: string },
    dbObject = db
  ) {
    const filtersToApply = [
      eq(encounters.campaign_id, filters.campaignId),
      eq(encounters.user_id, ctx.user.id),
    ];
    if (filters.matchName) {
      filtersToApply.push(ilike(encounters.name, `%${filters.matchName}%`));
    }
    return await dbObject.query.encounters.findMany({
      where: and(...filtersToApply),
      with: {
        tags: {
          with: {
            tag: true,
          },
        },
      },
    });
  },

  campaignById: async function (
    ctx: LidndContext,
    campaignId: string,
    dbObject = db
  ) {
    return await dbObject.query.campaigns.findFirst({
      where: (campaigns, { eq, and }) =>
        and(eq(campaigns.id, campaignId), eq(campaigns.user_id, ctx.user.id)),

      with: {
        legacySystem: true,
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

export type CampaignWithData = NonNullable<
  Awaited<ReturnType<typeof ServerCampaign.campaignFromSlug>>
>;
