import { createContext } from "@/server/api/context";
import { TRPCError, initTRPC } from "@trpc/server";
import {
  encounters,
  encounter_participant,
  creatures,
  settings,
  channels,
  participant_status_effects,
  status_effects_5e,
} from "@/server/api/db/schema";
import { eq, and, sql, ilike } from "drizzle-orm";
import { db } from "@/server/api/db";
import superjson from "superjson";
import { ZodError, z } from "zod";
import {
  sortEncounterCreatures,
  updateTurnOrder,
} from "@/app/encounters/utils";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  getEncounterParticipants,
  getEncounterParticipantsWithCreatureData,
  getIconAWSname,
  getStatBlockAWSname,
  getUserEncounter,
  postEncounterToUserChannel,
  setActiveParticipant,
} from "@/server/api/utils";
import { mergeEncounterCreature } from "@/app/encounters/utils";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

const t = initTRPC.context<typeof createContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

const isAuthed = t.middleware((opts) => {
  const { ctx } = opts;
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not on the whitelist.",
    });
  }
  return opts.next({
    ctx: {
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);
export const publicProcedure = t.procedure;

export type Encounter = typeof encounters.$inferSelect;
export type Creature = typeof creatures.$inferSelect;
export type EncounterParticipant = typeof encounter_participant.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type StatusEffect = typeof status_effects_5e.$inferSelect;
export type ParticipantStatusEffect =
  typeof participant_status_effects.$inferSelect & {
    description: StatusEffect["description"];
    name: StatusEffect["name"];
  };

export type EncounterCreature = EncounterParticipant &
  Creature & {
    status_effects: ParticipantStatusEffect[];
  };
export type EncounterWithParticipants = Encounter & {
  participants: EncounterCreature[];
};

export const participantSchema = createSelectSchema(encounter_participant);
export const insertCreatureSchema = createInsertSchema(creatures);
export const insertSettingsSchema = createInsertSchema(settings);

const booleanSchema = z
  .union([z.boolean(), z.literal("true"), z.literal("false")])
  .transform((value) => value === true || value === "true");

export const creatureUploadSchema = insertCreatureSchema
  .extend({
    icon_image: z.any(),
    stat_block_image: z.unknown().optional(),
    max_hp: z.coerce.number(),
    challenge_rating: z.coerce.number(),
    is_player: booleanSchema,
  })
  .omit({ user_id: true });

export const updateSettingsSchema = insertSettingsSchema
  .omit({ user_id: true })
  .merge(
    z.object({
      show_health_in_discord: booleanSchema,
      show_icons_in_discord: booleanSchema,
      average_turn_seconds: z.coerce.number(),
      default_player_level: z.coerce.number(),
    })
  );

export const appRouter = t.router({
  encounters: protectedProcedure.query(async (opts) => {
    const encountersWithParticipants = await db
      .select()
      .from(encounters)
      .where(eq(encounters.user_id, opts.ctx.user.userId))
      .leftJoin(
        encounter_participant,
        eq(encounters.id, encounter_participant.encounter_id)
      )
      .leftJoin(creatures, eq(encounter_participant.creature_id, creatures.id));

    const response = encountersWithParticipants.reduce<
      Record<string, EncounterWithParticipants>
    >((acc, row) => {
      const encounter = row["encounters"];
      const participant = row["encounter_participant"];
      const creature = row["creatures"];
      if (!acc[encounter.id]) {
        acc[encounter.id] = {
          ...encounter,
          participants: [],
        };
      }
      if (!participant || !creature) return acc;
      acc[encounter.id].participants.push(
        mergeEncounterCreature(participant, creature)
      );
      return acc;
    }, {});
    return Object.values(response);
  }),

  statusEffects: publicProcedure.query(async () => {
    return await db.select().from(status_effects_5e);
  }),

  encounterById: protectedProcedure.input(z.string()).query(async (opts) => {
    const encounter = await db
      .select()
      .from(encounters)
      .where(
        and(
          eq(encounters.user_id, opts.ctx.user.userId),
          eq(encounters.id, opts.input)
        )
      )
      .leftJoin(
        encounter_participant,
        eq(encounters.id, encounter_participant.encounter_id)
      )
      .leftJoin(creatures, eq(encounter_participant.creature_id, creatures.id))
      .leftJoin(
        participant_status_effects,
        eq(
          encounter_participant.id,
          participant_status_effects.encounter_participant_id
        )
      )
      .leftJoin(
        status_effects_5e,
        eq(participant_status_effects.status_effect_id, status_effects_5e.id)
      );
    const response = encounter.reduce<Record<string, EncounterCreature>>(
      (acc, row) => {
        const participant = row["encounter_participant"];
        const creature = row["creatures"];
        const statusEffect = row["participant_status_effects"];
        const statusEffectData = row["status_effects_5e"];
        const finalStatusEffect = statusEffect
          ? {
              ...statusEffect,
              description: statusEffectData?.description ?? "",
              name: statusEffectData?.name ?? "",
            }
          : null;

        if (!participant || !creature) return acc;
        if (!acc[participant.id]) {
          acc[participant.id] = {
            ...mergeEncounterCreature(participant, creature),
            status_effects: finalStatusEffect ? [finalStatusEffect] : [],
          };
        } else {
          finalStatusEffect &&
            acc[participant.id].status_effects.push(finalStatusEffect);
        }
        return acc;
      },
      {}
    );
    const participants = Object.values(response);

    const encounterData = encounter.at(0)?.encounters;

    if (!encounterData) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "No encounter found",
      });
    }
    return {
      ...encounterData,
      participants: participants.sort(sortEncounterCreatures),
    };
  }),

  deleteEncounter: protectedProcedure
    .input(z.string())
    .mutation(async (opts) => {
      return await db
        .delete(encounters)
        .where(
          and(
            eq(encounters.id, opts.input),
            eq(encounters.user_id, opts.ctx.user.userId)
          )
        )
        .returning();
    }),

  createEncounter: protectedProcedure
    .input(
      z.object({
        name: z.string().nullable(),
        description: z.string().nullable(),
      })
    )
    .mutation(async (opts) => {
      return await db.transaction(async (tx) => {
        const [encounter, userPlayers] = await Promise.all([
          tx
            .insert(encounters)
            .values({
              name: opts.input.name,
              description: opts.input.description,
              user_id: opts.ctx.user.userId,
            })
            .returning(),
          tx
            .select()
            .from(creatures)
            .where(
              and(
                eq(creatures.user_id, opts.ctx.user.userId),
                eq(creatures.is_player, true)
              )
            ),
        ]);
        if (encounter.length === 0) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create encounter",
          });
        }
        if (userPlayers.length > 0) {
          await tx.insert(encounter_participant).values(
            userPlayers.map((player) => ({
              encounter_id: encounter[0].id,
              creature_id: player.id,
              hp: player.max_hp,
            }))
          );
        }

        return encounter[0];
      });
    }),

  updateEncounter: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
      })
    )
    .mutation(async (opts) => {
      const result = await db
        .update(encounters)
        .set({
          name: opts.input.name,
          description: opts.input.description,
        })
        .where(
          and(
            eq(encounters.id, opts.input.id),
            eq(encounters.user_id, opts.ctx.user.userId)
          )
        )
        .returning();
      if (result.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update encounter",
        });
      }
      return result[0];
    }),

  updateEncounterParticipant: protectedProcedure
    .input(participantSchema)
    .mutation(async (opts) => {
      const result = await db.transaction(async (tx) => {
        const [updatedParticipant, _] = await Promise.all([
          await tx
            .update(encounter_participant)
            .set(opts.input)
            .where(eq(encounter_participant.id, opts.input.id))
            .returning(),
          getUserEncounter(opts.ctx.user.userId, opts.input.encounter_id, tx),
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

  assignStatusEffect: protectedProcedure
    .input(
      z.object({
        encounter_participant_id: z.string(),
        status_effect_id: z.string(),
        duration: z.number().optional(),
        save_ends: z.boolean().optional(),
      })
    )
    .mutation(async (opts) => {
      const result = await db
        .insert(participant_status_effects)
        .values({
          encounter_participant_id: opts.input.encounter_participant_id,
          status_effect_id: opts.input.status_effect_id,
          duration: opts.input.duration,
          save_ends: opts.input.save_ends,
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

  startEncounter: protectedProcedure
    .input(z.string())
    .mutation(async (opts) => {
      const result = await db.transaction(async (tx) => {
        const [encounter, encounterParticipants] = await Promise.all([
          getUserEncounter(opts.ctx.user.userId, opts.input, tx),
          getEncounterParticipants(opts.input, tx),
        ]);

        const surpriseRoundExists = encounterParticipants.some(
          (p) => p.has_surprise
        );

        let activeParticipant: EncounterParticipant;
        if (surpriseRoundExists) {
          activeParticipant = encounterParticipants.find(
            (p) => p.has_surprise
          )!;
        } else {
          activeParticipant = encounterParticipants[0];
        }
        await Promise.all([
          tx
            .update(encounter_participant)
            .set({
              is_active: true,
            })
            .where(
              and(
                eq(encounter_participant.encounter_id, opts.input),
                eq(encounter_participant.id, activeParticipant.id)
              )
            ),
          tx
            .update(encounters)
            .set({
              started_at: new Date(),
              current_round: surpriseRoundExists ? 0 : 1,
            })
            .where(eq(encounters.id, opts.input)),
        ]);
        return encounter;
      });
      if (!result) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to start encounter",
        });
      }
      return result;
    }),

  updateTurn: protectedProcedure
    .input(
      z.object({
        to: z.literal("next").or(z.literal("previous")),
        encounter_id: z.string(),
      })
    )
    .mutation(async (opts) => {
      const result = await db.transaction(async (tx) => {
        const [encounter, encounterParticipants] = await Promise.all([
          getUserEncounter(opts.ctx.user.userId, opts.input.encounter_id, tx),
          getEncounterParticipantsWithCreatureData(opts.input.encounter_id, tx),
        ]);

        const {
          updatedParticipants,
          updatedRoundNumber,
          newlyActiveParticipant,
        } = updateTurnOrder(opts.input.to, encounterParticipants, encounter);

        await Promise.all([
          setActiveParticipant(
            newlyActiveParticipant.id,
            opts.input.encounter_id,
            tx
          ),
          tx
            .update(encounters)
            .set({
              current_round: updatedRoundNumber,
            })
            .where(eq(encounters.id, opts.input.encounter_id)),
        ]);
        return encounter;
      });
      return result;
    }),

  removeParticipantFromEncounter: protectedProcedure
    .input(
      z.object({
        encounter_id: z.string(),
        participant_id: z.string(),
      })
    )
    .mutation(async (opts) => {
      const [encounter, encounterParticipants] = await Promise.all([
        getUserEncounter(opts.ctx.user.userId, opts.input.encounter_id),
        getEncounterParticipantsWithCreatureData(opts.input.encounter_id),
      ]);
      const result = await db
        .delete(encounter_participant)
        .where(
          and(
            eq(encounter_participant.encounter_id, opts.input.encounter_id),
            eq(encounter_participant.id, opts.input.participant_id)
          )
        )
        .returning();

      if (result.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove participant from encounter",
        });
      }
      if (result[0].is_active) {
        const { newlyActiveParticipant } = updateTurnOrder(
          "next",
          encounterParticipants,
          encounter
        );

        await setActiveParticipant(
          newlyActiveParticipant.id,
          opts.input.encounter_id
        );
      }
      return result[0];
    }),

  addExistingCreatureToEncounter: protectedProcedure
    .input(
      z.object({
        encounter_id: z.string(),
        creature_id: z.string(),
      })
    )
    .mutation(async (opts) => {
      const [userCreature, _] = await Promise.all([
        db
          .select()
          .from(creatures)
          .where(
            and(
              eq(creatures.id, opts.input.creature_id),
              eq(creatures.user_id, opts.ctx.user.userId)
            )
          ),
        getUserEncounter(opts.ctx.user.userId, opts.input.encounter_id),
      ]);
      if (userCreature.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No creature found",
        });
      }
      const encounterParticipant = await db
        .insert(encounter_participant)
        .values({
          encounter_id: opts.input.encounter_id,
          creature_id: opts.input.creature_id,
          hp: userCreature[0].max_hp,
        })
        .returning();
      if (encounterParticipant.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add creature to encounter",
        });
      }
      return encounterParticipant[0];
    }),

  updateCreature: protectedProcedure
    .input(insertCreatureSchema.omit({ user_id: true }))
    .mutation(async (opts) => {
      if (!opts.input.id) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No creature id in reqquest",
        });
      }
      const result = await db
        .update(creatures)
        .set(opts.input)
        .where(
          and(
            eq(creatures.id, opts.input.id),
            eq(creatures.user_id, opts.ctx.user.userId)
          )
        )
        .returning();
      if (result.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update creature",
        });
      }
      return result[0];
    }),

  deleteCreature: protectedProcedure
    .input(z.string())
    .mutation(async (opts) => {
      const deletedCreature = await db
        .delete(creatures)
        .where(
          and(
            eq(creatures.id, opts.input),
            eq(creatures.user_id, opts.ctx.user.userId)
          )
        )
        .returning();
      if (deletedCreature.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete creature",
        });
      }
      const s3Client = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
      try {
        await Promise.all([
          s3Client.send(
            new DeleteObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME!,
              Key: getIconAWSname(deletedCreature[0].id),
            })
          ),
          s3Client.send(
            new DeleteObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME!,
              Key: getStatBlockAWSname(deletedCreature[0].id),
            })
          ),
        ]);
      } catch (e) {
        console.error(e);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete images",
        });
      }
      return deletedCreature[0];
    }),

  getUserCreatures: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        is_player: z.boolean().optional(),
      })
    )
    .query(async (opts) => {
      const filters = [eq(creatures.user_id, opts.ctx.user.userId)];
      if (opts.input.name) {
        filters.push(ilike(creatures.name, `%${opts.input.name}%`));
      }
      if (opts.input.is_player) {
        filters.push(eq(creatures.is_player, opts.input.is_player));
      }
      return await db
        .select()
        .from(creatures)
        .where(and(...filters));
    }),

  settings: protectedProcedure.query(async (opts) => {
    opts.ctx.user.userId;
    const userSettings = await db
      .select()
      .from(settings)
      .where(eq(settings.user_id, opts.ctx.user.userId));
    if (userSettings.length === 0) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "No settings found",
      });
    }
    return userSettings[0];
  }),

  updateSettings: protectedProcedure
    .input(updateSettingsSchema)
    .mutation(async (opts) => {
      const result = await db
        .update(settings)
        .set(opts.input)
        .where(eq(settings.user_id, opts.ctx.user.userId))
        .returning();
      if (result.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update settings",
        });
      }
      return result[0];
    }),
});

// export type definition of API
export type AppRouter = typeof appRouter;
