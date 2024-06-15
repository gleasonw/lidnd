import { db } from "@/server/api/db";
import { reminders, encounters } from "@/server/api/db/schema";
import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";

export const ServerEncounter = {
  encountersInCampaign: async function (user_id: string, campaign_id: string) {
    return await db.query.encounters.findMany({
      where: (encounter, { eq, and }) =>
        and(
          eq(encounter.user_id, user_id),
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

  encounterById: async function (
    user_id: string,
    encounter_id: string,
    dbObject = db
  ) {
    return await dbObject.query.encounters.findFirst({
      where: (encounter, { eq, and }) =>
        and(eq(encounter.id, encounter_id), eq(encounter.user_id, user_id)),
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
    user_id: string,
    encounter_id: string,
    dbObject = db
  ) {
    const encounter = await this.encounterById(user_id, encounter_id, dbObject);

    if (!encounter) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "User not allowed to access that encounter",
      });
    }

    return encounter;
  },

  encounterReminders: async function (
    user_id: string,
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
        and(eq(encounters.id, encounter_id), eq(encounters.user_id, user_id))
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
};

export type EncounterWithData = NonNullable<
  Awaited<ReturnType<typeof ServerEncounter.encounterById>>
>;

export type ObserveEncounter = NonNullable<
  Awaited<ReturnType<typeof ServerEncounter.encounterWithCampaign>>
>;
