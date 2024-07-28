import { db } from "@/server/api/db";
import { campaigns, systems } from "@/server/api/db/schema";
import { eq } from "drizzle-orm";
import { Participant } from "@/server/api/router";
import { TRPCError } from "@trpc/server";
import { ParticipantUtils } from "@/utils/participants";
import { LidndAuth } from "@/app/authentication";
import { ServerCreature } from "@/server/creatures";
import { CreatureUtils } from "@/utils/creatures";

export async function getUserCampaigns(user_id: string) {
  return await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.user_id, user_id));
}

export async function getSystems() {
  return await db.select().from(systems);
}

// @deprecated
export const createCreature = ServerCreature.create;

export async function getEncounterCreature(id: string) {
  const participant = await db.query.participants.findFirst({
    where: (participants, { eq }) => eq(participants.id, id),
    with: {
      creature: true,
    },
  });

  if (!participant) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "No encounter found",
    });
  }

  return participant;
}

/**
 *
 * @deprecated - use CreatureUtils.awsIconUrl
 */
export function getIconAWSname(creature_id: string) {
  return CreatureUtils.iconKey({ id: creature_id });
}

/**
 *
 * @deprecated - use CreatureUtils.awsStatBlockUrl
 */
export function getStatBlockAWSname(creature_id: string) {
  return CreatureUtils.statBlockKey({ id: creature_id });
}

/**
 * @deprecated
 *
 * just use LidndAuth.getUser()
 */
export async function getPageSession(): Promise<{
  user: {
    userId: string;
  };
  sessionId: string;
} | null> {
  const result = await LidndAuth.getUserSession();

  if (!result) {
    return null;
  }

  return {
    user: {
      userId: result.user.id,
    },
    sessionId: result.session.id,
  };
}

export async function allEncounterParticipants(
  encounter_id: string,
  dbObject = db
): Promise<Participant[]> {
  const participants = await dbObject.query.participants.findMany({
    where: (participants, { eq }) =>
      eq(participants.encounter_id, encounter_id),
    with: {
      creature: true,
    },
  });
  return participants.sort(ParticipantUtils.sortLinearly);
}
