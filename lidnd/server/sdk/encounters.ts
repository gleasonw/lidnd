import type { LidndContext } from "@/server/api/base-trpc";
import { db } from "@/server/db";
import {
  reminders,
  encounters,
  participants,
  type EncounterStatus,
  stat_columns,
} from "@/server/db/schema";
import type { InsertParticipant, Participant } from "@/server/api/router";
import { TRPCError } from "@trpc/server";
import { eq, and, sql, inArray } from "drizzle-orm";
import * as R from "remeda";

// todo: allow callers to pass in an encounter they've already fetched
async function addParticipant(
  ctx: LidndContext,
  participant: InsertParticipant & { creature?: { is_player: boolean } },
  dbObject = db
) {
  return await dbObject.transaction(async (tx) => {
    const [newParticipant, e] = await Promise.all([
      tx.insert(participants).values(participant).returning(),
      ServerEncounter.encounterByIdThrows(ctx, participant.encounter_id, tx),
    ]);
    if (!newParticipant[0]) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to add participant",
      });
    }

    if (newParticipant[0].column_id) {
      return;
    }

    // don't add player creatures to columns
    if (participant.creature?.is_player) {
      return;
    }

    if (participant.creature?.is_player === undefined) {
      // fetch the creature to check if this is a player
      const creature = await tx.query.creatures.findFirst({
        where: (creatures, { eq }) => eq(creatures.id, participant.creature_id),
      });
      if (!creature) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add participant",
        });
      }
      if (creature.is_player) {
        return;
      }
    }

    const columnToAssign = R.firstBy(e.columns, (c) => c.participants.length);
    if (columnToAssign) {
      const pWithColumn = await tx
        .update(participants)
        .set({ column_id: columnToAssign.id })
        .where(eq(participants.id, newParticipant[0].id))
        .returning();
      if (!pWithColumn[0]) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to assign column",
        });
      }
      return pWithColumn[0];
    }
    // we need to create a new column for this new participant
    const newColumn = await tx
      .insert(stat_columns)
      .values({
        encounter_id: participant.encounter_id,
        percent_width: 100,
      })
      .returning();
    if (!newColumn[0]) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create column",
      });
    }
    await tx
      .update(participants)
      .set({ column_id: newColumn[0].id })
      .where(eq(participants.id, newParticipant[0].id));
    return newParticipant[0];
  });
}

async function getEncounters(ctx: LidndContext, encounterIds: string[]) {
  return await db.query.encounters.findMany({
    where: and(
      inArray(encounters.id, encounterIds),
      eq(encounters.user_id, ctx.user.id)
    ),
  });
}

export const ServerEncounter = {
  getEncounters,
  encountersInCampaign: async function (
    ctx: LidndContext,
    campaign_id: string
  ) {
    return await db.query.encounters.findMany({
      where: (encounter, { eq, and }) =>
        and(
          eq(encounter.user_id, ctx.user.id),
          eq(encounter.campaign_id, campaign_id)
        ),
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
            system: true,
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
};

export type EncounterWithData = NonNullable<
  Awaited<ReturnType<typeof ServerEncounter.encounterById>>
>;

export type ObserveEncounter = NonNullable<
  Awaited<ReturnType<typeof ServerEncounter.encounterWithCampaign>>
>;
