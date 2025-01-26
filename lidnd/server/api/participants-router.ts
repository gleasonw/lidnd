import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { participant_status_effects, participants } from "../db/schema";
import { protectedProcedure } from "./base-trpc";
import { participantSchema } from "../db/schema";
import { getEncounterCreature } from "./utils";
import { ParticipantUtils } from "@/utils/participants";
import { z } from "zod";
import { ServerEncounter } from "../sdk/encounters";
import { participantCreateSchema } from "../db/schema";
import { ServerCreature } from "../sdk/creatures";

export const participantsRouter = {
  uploadParticipant: protectedProcedure
    .input(
      participantCreateSchema.extend({
        hasStatBlock: z.boolean(),
        hasIcon: z.boolean(),
      })
    )
    .mutation(async (opts) => {
      console.log(opts.input);
      await ServerEncounter.encounterByIdThrows(
        opts.ctx,
        opts.input.participant.encounter_id
      );
      const newCreature = await ServerCreature.create(
        opts.ctx,
        opts.input.creature,
        {
          hasStatBlock: opts.input.hasStatBlock,
          hasIcon: opts.input.hasIcon,
        }
      );
      console.log(newCreature);

      const newParticipant = await ServerEncounter.addParticipant(opts.ctx, {
        ...opts.input.participant,
        creature_id: newCreature.creature.id,
      });

      console.log(newParticipant);

      return {
        participant: newParticipant,
        creature: newCreature.creature,
        statBlockPresigned: newCreature.statBlockPresigned,
        iconPresigned: newCreature.iconPresigned,
      };
    }),

  updateEncounterMinionParticipant: protectedProcedure
    .input(
      participantSchema.merge(
        z.object({
          minion_count: z.number(),
          minions_in_overkill_range: z.number(),
          damage: z.number(),
        })
      )
    )
    .mutation(async (opts) => {
      const result = await db.transaction(async (tx) => {
        const participant = await getEncounterCreature(opts.input.id);
        if (!ParticipantUtils.isMinion(participant)) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Participant is not a minion; minion_count is not set",
          });
        }
        const updatedMinionCount = ParticipantUtils.updateMinionCount(
          participant,
          opts.input.minions_in_overkill_range,
          opts.input.damage
        );
        const [updatedParticipant, _] = await Promise.all([
          await tx
            .update(participants)
            .set({
              minion_count: updatedMinionCount,
              hp: ParticipantUtils.maxHp(participant),
            })
            .where(eq(participants.id, opts.input.id))
            .returning(),
          ServerEncounter.encounterById(opts.ctx, opts.input.encounter_id, tx),
        ]);
        if (updatedParticipant.length === 0) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update encounter participant",
          });
        }
        return updatedParticipant[0];
      });
      return result;
    }),

  updateEncounterParticipant: protectedProcedure
    .input(participantSchema)
    .mutation(async (opts) => {
      if (opts.input.hp <= 0) {
        // just remove the participant
        const result = await db.transaction(async (tx) => {
          const [update, _] = await Promise.all([
            await tx
              .delete(participants)
              .where(eq(participants.id, opts.input.id))
              .returning(),
            ServerEncounter.encounterByIdThrows(
              opts.ctx,
              opts.input.encounter_id,
              tx
            ),
          ]);
          const updatedParticipant = update[0];

          if (!updatedParticipant) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to update encounter participant",
            });
          }

          return updatedParticipant;
        });
        return result;
      }

      const result = await db.transaction(async (tx) => {
        const [update, _] = await Promise.all([
          await tx
            .update(participants)
            .set(opts.input)
            .where(eq(participants.id, opts.input.id))
            .returning(),
          ServerEncounter.encounterByIdThrows(
            opts.ctx,
            opts.input.encounter_id,
            tx
          ),
        ]);
        const updatedParticipant = update[0];

        if (!updatedParticipant) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update encounter participant",
          });
        }

        return updatedParticipant;
      });
      return result;
    }),

  removeStatusEffect: protectedProcedure
    .input(
      z.object({
        encounter_participant_id: z.string(),
        status_effect_id: z.string(),
      })
    )
    .mutation(async (opts) => {
      const result = await db
        .delete(participant_status_effects)
        .where(
          and(
            eq(
              participant_status_effects.encounter_participant_id,
              opts.input.encounter_participant_id
            ),
            eq(
              participant_status_effects.status_effect_id,
              opts.input.status_effect_id
            )
          )
        )
        .returning();
      if (result.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove status effect",
        });
      }
      return result[0];
    }),

  assignStatusEffect: protectedProcedure
    .input(
      z.object({
        encounter_participant_id: z.string(),
        status_effect_id: z.string(),
        duration: z.number().optional(),
        save_ends_dc: z.number().optional(),
      })
    )
    .mutation(async (opts) => {
      const result = await db
        .insert(participant_status_effects)
        .values({
          encounter_participant_id: opts.input.encounter_participant_id,
          status_effect_id: opts.input.status_effect_id,
          duration: opts.input.duration,
          save_ends_dc: opts.input.save_ends_dc,
        })
        .returning();
      if (result.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to assign status effect",
        });
      }
      return result[0];
    }),
};
