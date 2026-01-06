import { type LidndContext } from "@/server/api/base-trpc";
import { db } from "@/server/db";
import {
  reminders,
  encounters,
  participants,
  type EncounterStatus,
  stat_columns,
  type EncounterInsert,
  encounter_to_tag,
  type LidndImage,
  encounterAsset,
  type ParticipantPost,
  creatures,
} from "@/server/db/schema";
import type { Participant } from "@/server/api/router";
import { TRPCError } from "@trpc/server";
import { eq, and, sql, inArray, ilike, exists } from "drizzle-orm";
import _ from "lodash";
import { ServerCampaign } from "@/server/sdk/campaigns";
import { EncounterUtils } from "@/utils/encounters";
import { randomUUID } from "node:crypto";

export type EncountersInCampaign = Awaited<
  ReturnType<typeof ServerEncounter.encountersInCampaign>
>;

async function create(
  ctx: LidndContext,
  input: Omit<EncounterInsert, "id" | "created_at" | "user_id">
) {
  return await db.transaction(async (tx) => {
    const encountersInCampaign = await ServerEncounter.encountersInCampaign({
      ctx,
      campaign: { id: input.campaign_id },
    });

    const indexInCampaign = _.maxBy(
      encountersInCampaign,
      (e) => e.index_in_campaign
    );

    const currentMaxIndex = indexInCampaign
      ? indexInCampaign.index_in_campaign
      : 0;

    const newIndex = currentMaxIndex + 1;

    const [encounter, campaign] = await Promise.all([
      tx
        .insert(encounters)
        .values({
          ...input,
          name: input.name ?? "",
          user_id: ctx.user.id,
          index_in_campaign: newIndex,
          status: "prep",
        })
        .returning(),
      ServerCampaign.campaignByIdThrows(ctx, input.campaign_id, tx),
    ]);

    const encounterResult = encounter[0];

    if (encounterResult === undefined) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create encounter",
      });
    }
    const numberOfStartingColumns = 4;
    const initialColumnWidth = 100 / numberOfStartingColumns;
    await tx
      .insert(stat_columns)
      .values(
        Array.from({ length: numberOfStartingColumns }).map((_, i) => ({
          encounter_id: encounterResult.id,
          percent_width: initialColumnWidth,
          is_home_column: i === 0,
        }))
      )
      .returning();

    const { campaignToPlayers } = campaign;
    console.log({ campaignToPlayers });
    if (campaignToPlayers && campaignToPlayers.length > 0) {
      await Promise.all(
        campaignToPlayers.map(({ player: creature }) =>
          ServerEncounter.addParticipant({
            creature,
            participant: {
              encounter_id: encounterResult.id,
              creature_id: creature.id,
            },
            user: ctx.user,
            dbObject: tx,
          })
        )
      );
    }

    const result = encounter[0];

    if (result === undefined) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create encounter",
      });
    }

    return { encounter: encounterResult, campaign };
  });
}

// todo: allow callers to pass in an encounter they've already fetched
// todo: there are some mutations in here that optimistic updates aren't handling.
// we should define a "recipe" and then persist the results
async function addParticipant(args: {
  user: LidndContext["user"];
  creature: ParticipantPost["creature"];
  participant: ParticipantPost["participant"];
  dbObject?: typeof db;
}) {
  const { user, creature, participant, dbObject = db } = args;
  const encounter = await ServerEncounter.encounterByIdThrows(
    { user },
    participant.encounter_id,
    dbObject
  );

  // TODO: maybe in the future this would be easier if addParticipant also returned a log of the changes made, for server-side code.
  // for now we can just manually reconstruct the new encounter state.
  const tempId = randomUUID();
  const encounterWithNewParticipant = EncounterUtils.addParticipant({
    encounter,
    newParticipant: { id: tempId, ...participant },
    creatureForParticipant: creature,
  });
  const newParticipant = encounterWithNewParticipant.participants.find(
    (p) => p.id === tempId
  );
  if (!newParticipant) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to add participant",
    });
  }

  const maybeCreature = await db.query.creatures.findFirst({
    where: and(
      eq(creatures.id, newParticipant.creature_id),
      eq(creatures.user_id, user.id)
    ),
  });
  const mutationsToRun = [];
  if (maybeCreature === undefined) {
    mutationsToRun.push(
      dbObject.insert(creatures).values(newParticipant.creature)
    );
  }
  mutationsToRun.push(dbObject.insert(participants).values(newParticipant));
  await Promise.all(mutationsToRun);

  return newParticipant;
}

async function getEncounters(ctx: LidndContext, encounterIds: string[]) {
  return await db.query.encounters.findMany({
    where: and(
      inArray(encounters.id, encounterIds),
      eq(encounters.user_id, ctx.user.id)
    ),
  });
}

async function deleteEncounter(ctx: LidndContext, encounter: { id: string }) {
  return await db
    .delete(encounters)
    .where(
      and(eq(encounters.id, encounter.id), eq(encounters.user_id, ctx.user.id))
    );
}

export const ServerEncounter = {
  updateEncounter: async function (args: {
    encounter: EncounterInsert & { id: string };
    user_id: string;
    dbObject: typeof db;
  }) {
    return await args.dbObject
      .update(encounters)
      .set(args.encounter)
      .where(
        and(
          eq(encounters.id, args.encounter.id),
          eq(encounters.user_id, args.user_id)
        )
      )
      .returning();
  },
  deleteEncounter,
  create,
  getEncounters,
  encountersInCampaign: async function ({
    ctx,
    campaign,
    search,
    tagId,
  }: {
    ctx: LidndContext;
    campaign: { id: string };
    search?: string | undefined;
    tagId?: string | undefined;
  }) {
    const { user } = ctx;
    return await db.query.encounters.findMany({
      where: and(
        eq(encounters.campaign_id, campaign.id),
        eq(encounters.user_id, user.id),
        tagId
          ? exists(
              db
                .select()
                .from(encounter_to_tag)
                .where(
                  and(
                    eq(encounter_to_tag.encounter_id, encounters.id),
                    eq(encounter_to_tag.tag_id, tagId)
                  )
                )
            )
          : undefined,
        search ? ilike(encounters.name, `%${search}%`) : undefined
      ),
      with: {
        tags: {
          with: {
            tag: true,
          },
        },
        participants: {
          with: {
            creature: true,
          },
        },
      },
    });
  },

  updateStatus(
    ctx: LidndContext,
    encounter_id: string,
    status: EncounterStatus
  ) {
    return db
      .update(encounters)
      .set({
        status,
      })
      .where(
        and(
          eq(encounters.id, encounter_id),
          eq(encounters.user_id, ctx.user.id)
        )
      );
  },

  encounterFromCampaignAndIndex: async function (
    ctx: LidndContext,
    campaign_id: string,
    index_in_campaign: number
  ) {
    return await db.query.encounters.findFirst({
      where: (encounter, { eq, and }) =>
        and(
          eq(encounter.user_id, ctx.user.id),
          eq(encounter.campaign_id, campaign_id),
          eq(encounter.index_in_campaign, index_in_campaign)
        ),
    });
  },

  encounterById: async function (
    ctx: LidndContext,
    encounter_id: string,
    dbObject = db
  ) {
    return await dbObject.query.encounters.findFirst({
      where: (encounter, { eq, and }) =>
        and(eq(encounter.id, encounter_id), eq(encounter.user_id, ctx.user.id)),
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
        reminders: true,
        assets: {
          with: {
            image: true,
          },
        },
        columns: {
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
        turn_groups: {
          orderBy: (tg, { asc }) => [asc(tg.name)],
        },
        tags: {
          with: {
            tag: true,
          },
        },
      },
    });
  },

  encounterByIdThrows: async function (
    ctx: LidndContext,
    encounter_id: string,
    dbObject = db
  ) {
    const encounter = await this.encounterById(ctx, encounter_id, dbObject);

    if (!encounter) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "User not allowed to access that encounter",
      });
    }

    return encounter;
  },

  encounterReminders: async function (
    ctx: LidndContext,
    encounter_id: string,
    dbObject = db
  ) {
    return await dbObject
      .select({
        id: reminders.id,
        alert_after_round: reminders.alert_after_round,
        reminder: reminders.reminder,
        encounter_id: reminders.encounter_id,
      })
      .from(encounters)
      .where(
        and(
          eq(encounters.id, encounter_id),
          eq(encounters.user_id, ctx.user.id)
        )
      )
      .rightJoin(reminders, eq(encounters.id, reminders.encounter_id));
  },

  /**
   *
   * This route is for players observing a campaign. Should probably be protected in some way.
   * But view-only.
   */
  encounterWithCampaign: async function (encounter_id: string) {
    return await db.query.encounters.findFirst({
      where: (encounters, { eq }) => eq(encounters.id, encounter_id),
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
        campaigns: {
          with: {
            legacySystem: true,
          },
        },
        tags: {
          with: {
            tag: true,
          },
        },
      },
    });
  },

  setActiveParticipant: async function (
    participant_id: string,
    encounter_id: string,
    dbObject = db
  ) {
    await dbObject.execute(
      sql`
        UPDATE participants
        SET is_active = CASE
            WHEN id = ${participant_id} THEN TRUE
            ELSE FALSE
        END
        WHERE encounter_id = ${encounter_id}
    `
    );
  },

  updateParticipantHasPlayed: async function (
    participant: Participant,
    dbObject = db
  ) {
    return await dbObject
      .update(participants)
      .set({
        has_played_this_round: participant.has_played_this_round,
      })
      .where(eq(participants.id, participant.id));
  },

  updateTurnData: async function (
    encounter_id: string,
    updatedRoundNumber: number,
    updatedActiveParticipantId: string,
    dbObject = db
  ) {
    return await Promise.all([
      this.setActiveParticipant(
        updatedActiveParticipantId,
        encounter_id,
        dbObject
      ),
      dbObject
        .update(encounters)
        .set({
          current_round: updatedRoundNumber,
        })
        .where(eq(encounters.id, encounter_id)),
    ]);
  },
  addParticipant,
  async addTagToEncounter(
    ctx: LidndContext,
    input: {
      encounter_id: string;
      tag_id: string;
    },
    dbObject = db
  ) {
    // Verify encounter ownership
    await ServerEncounter.encounterByIdThrows(ctx, input.encounter_id);

    // Check if tag belongs to user
    const tag = await dbObject.query.encounter_tags.findFirst({
      where: (t, { eq, and }) =>
        and(eq(t.id, input.tag_id), eq(t.user_id, ctx.user.id)),
    });

    if (!tag) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tag not found or does not belong to user",
      });
    }

    // Check if relationship already exists
    const existing = await dbObject.query.encounter_to_tag.findFirst({
      where: (ett, { eq, and }) =>
        and(
          eq(ett.encounter_id, input.encounter_id),
          eq(ett.tag_id, input.tag_id)
        ),
    });

    if (existing) {
      return existing;
    }

    const [relation] = await dbObject
      .insert(encounter_to_tag)
      .values({
        encounter_id: input.encounter_id,
        tag_id: input.tag_id,
      })
      .returning();

    return relation;
  },
  async removeTagFromEncounter(
    ctx: LidndContext,
    input: {
      encounter_id: string;
      tag_id: string;
    },
    dbObject = db
  ) {
    // Verify encounter ownership
    await ServerEncounter.encounterByIdThrows(ctx, input.encounter_id);

    await dbObject
      .delete(encounter_to_tag)
      .where(
        and(
          eq(encounter_to_tag.encounter_id, input.encounter_id),
          eq(encounter_to_tag.tag_id, input.tag_id)
        )
      );
  },
  async addAsset(
    ctx: LidndContext,
    input: {
      encounterId: string;
      asset: LidndImage;
    }
  ) {
    const encounter = await ServerEncounter.encounterByIdThrows(
      ctx,
      input.encounterId
    );
    const suitableColumn = encounter.columns
      .slice()
      .filter((c) => !c.is_home_column)
      .sort((a, b) => {
        return a.participants.length - b.participants.length;
      })
      .at(0);
    const newEncounterAsset = await db
      .insert(encounterAsset)
      .values({
        encounter_id: encounter.id,
        asset_id: input.asset.id,
        stat_column_id: suitableColumn ? suitableColumn.id : null,
      })
      .returning();
    return newEncounterAsset[0];
  },
  async removeAsset(
    ctx: LidndContext,
    input: {
      encounterId: string;
      assetId: string;
    }
  ) {
    const encounter = await ServerEncounter.encounterByIdThrows(
      ctx,
      input.encounterId
    );
    const result = await db
      .delete(encounterAsset)
      .where(
        and(
          eq(encounterAsset.id, input.assetId),
          eq(encounterAsset.encounter_id, encounter.id)
        )
      )
      .returning();
    return result[0];
  },
};

export type EncounterWithData = NonNullable<
  Awaited<ReturnType<typeof ServerEncounter.encounterById>>
>;

export type ObserveEncounter = NonNullable<
  Awaited<ReturnType<typeof ServerEncounter.encounterWithCampaign>>
>;
