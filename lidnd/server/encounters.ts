import { db } from "@/server/api/db";
import { reminders, encounters } from "@/server/api/db/schema";
import { eq, and } from "drizzle-orm";

export async function encountersInCampaign(
  user_id: string,
  campaign_id: string
) {
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
}

export type EncounterWithData = NonNullable<
  Awaited<ReturnType<typeof encounterById>>
>;

export async function encounterById(
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
}

export async function encounterReminders(
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
}

export type ObserveEncounter = NonNullable<
  Awaited<ReturnType<typeof encounterWithCampaign>>
>;

/**
 *
 * This route is for players observing a campaign. Should probably be protected in some way.
 * But view-only.
 */
export async function encounterWithCampaign(encounter_id: string) {
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
}
