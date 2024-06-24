import { db } from "@/server/api/db";
import {
  reminders,
  encounters,
  participants,
  EncounterStatus,
} from "@/server/api/db/schema";
import { LidndContext, Participant } from "@/server/api/router";
import { TRPCError } from "@trpc/server";
import { eq, and, sql } from "drizzle-orm";

export const ServerEncounter = {
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
};

export type EncounterWithData = NonNullable<
  Awaited<ReturnType<typeof ServerEncounter.encounterById>>
>;

export type ObserveEncounter = NonNullable<
  Awaited<ReturnType<typeof ServerEncounter.encounterWithCampaign>>
>;
