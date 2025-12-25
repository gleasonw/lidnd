import { protectedProcedure } from "@/server/api/base-trpc";
import { db } from "@/server/db";
import {
  encounters,
  encounterSelectSchema,
  participants,
  participantSchema,
  turnGroupSelectSchema,
} from "@/server/db/schema";
import { ServerEncounter } from "@/server/sdk/encounters";
import { ServerParticipants } from "@/server/sdk/participants";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { z } from "zod";
import * as ServerTurnGroup from "@/server/sdk/turnGroups";

export const encountersRouter = {
  removeEncountersFromSession: protectedProcedure
    .input(z.array(z.string()))
    .mutation(async (opts) => {
      await db
        .update(encounters)
        .set({
          label: "inactive",
        })
        .where(
          and(
            inArray(encounters.id, opts.input),
            eq(encounters.user_id, opts.ctx.user.id)
          )
        );
    }),

  /** if the client disconnected for a bit, for instance */
  syncClientEncounterStateToGlobal: protectedProcedure
    .input(
      z.object({
        encounter: encounterSelectSchema.extend({
          participants: z.array(participantSchema),
          turn_groups: z.array(turnGroupSelectSchema),
        }),
      })
    )
    .mutation(async (opts) => {
      // ensure ownership
      await ServerEncounter.encounterByIdThrows(
        opts.ctx,
        opts.input.encounter.id
      );
      await db.transaction(async (tx) => {
        await Promise.all([
          ServerEncounter.updateEncounter({
            encounter: opts.input.encounter,
            user_id: opts.ctx.user.id,
            dbObject: tx,
          }),
          ...opts.input.encounter.participants.map(async (p) => {
            if (p.encounter_id !== opts.input.encounter.id) {
              return;
            }
            await ServerParticipants.updateParticipant({
              participant: p,
              dbObject: tx,
            });
          }),
          ...opts.input.encounter.turn_groups.map(async (tg) => {
            if (tg.encounter_id !== opts.input.encounter.id) {
              return;
            }
            await ServerTurnGroup.updateTurnGroup(tg, tx);
          }),
        ]);
      });
      // remove participants that were deleted while offline
      const ghostParticipants = await db
        .delete(participants)
        .where(
          and(
            eq(participants.encounter_id, opts.input.encounter.id),
            notInArray(
              participants.id,
              opts.input.encounter.participants.map((p) => p.id)
            )
          )
        )
        .returning();
      console.log(`removed ghost participants: `, ghostParticipants);
    }),
};
