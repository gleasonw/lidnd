import { LidndAuth } from "@/app/authentication";
import type { db } from "@/server/db";
import { participants, type ParticipantInsert } from "@/server/db/schema";
import { ServerEncounter } from "@/server/sdk/encounters";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

export const ServerParticipants = {
  updateParticipant: async (args: {
    participant: ParticipantInsert & { id: string };
    dbObject: typeof db;
  }) => {
    const { participant, dbObject } = args;
    const user = await LidndAuth.getUserThrows();
    await ServerEncounter.encounterByIdThrows(
      { user },
      participant.encounter_id
    );

    if (participant.hp !== undefined && participant.hp <= 0) {
      // just remove the participant
      const update = await dbObject
        .delete(participants)
        .where(eq(participants.id, participant.id))
        .returning();
      const updatedParticipant = update[0];

      if (!updatedParticipant) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update encounter participant",
        });
      }

      return updatedParticipant;
    }

    const update = await dbObject
      .update(participants)
      .set(participant)
      .where(eq(participants.id, participant.id))
      .returning();
    const updatedParticipant = update[0];

    if (!updatedParticipant) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update encounter participant",
      });
    }

    console.log({ input: participant, updatedParticipant });

    return updatedParticipant;
  },
};
