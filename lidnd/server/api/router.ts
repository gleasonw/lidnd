import { createContext } from "@/server/api/context";
import { TRPCError, initTRPC } from "@trpc/server";
import {
  encounters,
  encounter_participant,
  creatures,
  settings,
} from "@/server/api/db/schema";
import { eq, and, sql, ilike } from "drizzle-orm";
import { db } from "@/server/api/db";
import superjson from "superjson";
import { ZodError, z } from "zod";
import {
  sortEncounterCreatures,
  updateTurnOrder,
} from "@/app/dashboard/encounters/utils";
import { createInsertSchema } from "drizzle-zod";
import {
  getEncounterParticipants,
  getIconAWSname,
  getStatBlockAWSname,
  getUserEncounter,
  mergeEncounterCreature,
  setActiveParticipant,
} from "@/server/api/utils";
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

export type EncounterCreature = EncounterParticipant & Creature;
export type EncounterWithParticipants = Encounter & {
  participants: EncounterCreature[];
};

export const insertParticipantSchema = createInsertSchema(
  encounter_participant
);
export const insertCreatureSchema = createInsertSchema(creatures);
export const insertSettingsSchema = createInsertSchema(settings);

export const creatureUploadSchema = insertCreatureSchema
  .extend({
    icon_image: z.instanceof(File),
    stat_block_image: z.instanceof(File),
    max_hp: z.coerce.number(),
    challenge_rating: z.coerce.number(),
    is_player: z.coerce.boolean(),
  })
  .omit({ user_id: true });

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
      .leftJoin(creatures, eq(encounter_participant.creature_id, creatures.id));

    const response = encounter.reduce<
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
    return Object.values(response)[0];
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
        name: z.string(),
        description: z.string(),
      })
    )
    .mutation(async (opts) => {
      const result = await db
        .insert(encounters)
        .values({
          name: opts.input.name,
          description: opts.input.description,
          user_id: opts.ctx.user.userId,
        })
        .returning();
      if (result.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create encounter",
        });
      }
      return result[0];
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
    .input(
      z.object({
        participant_id: z.string(),
        hp: z.number(),
        initiative: z.number(),
        encounter_id: z.string(),
      })
    )
    .mutation(async (opts) => {
      console.log(opts);
      const result = await db.transaction(async (tx) => {
        const [updatedParticipant, _] = await Promise.all([
          await tx
            .update(encounter_participant)
            .set({
              hp: opts.input.hp,
              initiative: opts.input.initiative,
            })
            .where(eq(encounter_participant.id, opts.input.participant_id))
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

  startEncounter: protectedProcedure
    .input(z.string())
    .mutation(async (opts) => {
      const result = await db.transaction(async (tx) => {
        const [encounter, encounterParticipants] = await Promise.all([
          getUserEncounter(opts.ctx.user.userId, opts.input, tx),
          getEncounterParticipants(opts.input, tx),
        ]);
        const sortedParticipants = encounterParticipants.sort(
          sortEncounterCreatures
        );
        const activeParticipant = sortedParticipants[0];
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
          getEncounterParticipants(opts.input.encounter_id, tx),
        ]);
        const updatedOrder = updateTurnOrder(
          opts.input.to,
          encounterParticipants
        );
        const newActive = updatedOrder?.find((c) => c.is_active);

        if (!newActive) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update turn",
          });
        }

        await setActiveParticipant(newActive.id, opts.input.encounter_id, tx);
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
      const [_, encounterParticipants] = await Promise.all([
        getUserEncounter(opts.ctx.user.userId, opts.input.encounter_id),
        getEncounterParticipants(opts.input.encounter_id),
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
        const updatedOrder = updateTurnOrder("next", encounterParticipants);
        const newActive = updatedOrder?.find((c) => c.is_active);

        if (!newActive) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "Failed to update turn: could not set new active participant",
          });
        }

        await setActiveParticipant(newActive.id, opts.input.encounter_id);
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
        filters.push(ilike(creatures.name, opts.input.name));
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
    .input(insertSettingsSchema.omit({ user_id: true }))
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
