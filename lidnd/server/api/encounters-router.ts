import { protectedProcedure } from "@/server/api/base-trpc";
import { db } from "@/server/db";
import {
  encounters,
  encounterSelectSchema,
  participantSchema,
  turnGroupSelectSchema,
} from "@/server/db/schema";
import { ServerEncounter } from "@/server/sdk/encounters";
import { ServerParticipants } from "@/server/sdk/participants";
import { and, eq, inArray } from "drizzle-orm";
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
      console.log({ total_input: opts.input.encounter.participants });
      await db.transaction(async (tx) => {
        await ServerEncounter.updateEncounter({
          encounter: opts.input.encounter,
          user_id: opts.ctx.user.id,
          dbObject: tx,
        });
        await Promise.all(
          opts.input.encounter.participants.map(async (p) => {
            if (p.encounter_id !== opts.input.encounter.id) {
              return;
            }
            await ServerParticipants.updateParticipant({
              participant: p,
              dbObject: tx,
            });
          })
        );
        await Promise.all(
          opts.input.encounter.turn_groups.map(async (tg) => {
            if (tg.encounter_id !== opts.input.encounter.id) {
              return;
            }
            await ServerTurnGroup.updateTurnGroup(tg, tx);
          })
        );
      });
    }),
};
