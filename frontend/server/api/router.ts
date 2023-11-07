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
  createCreature,
  getIconAWSname,
  getStatBlockAWSname,
  getUserEncounter,
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
  })
  .omit({ user_id: true });

export const appRouter = t.router({
  encounters: protectedProcedure.query(async (opts) => {
    const encountersWithParticipants = await db
      .select()
      .from(encounters)
      .where(eq(encounters.user_id, opts.ctx.user.id))
      .leftJoin(
        encounter_participant,
        eq(encounters.id, encounter_participant.encounter_id)
      )
      .leftJoin(creatures, eq(encounter_participant.creature_id, creatures.id));

    const response = encountersWithParticipants.reduce<
      Record<string, EncounterWithParticipants>
    >((acc, row) => {
      const encounter = row["encounters-drizzle"];
      const participant = row["encounter_participant-drizzle"];
      const creature = row["creatures-drizzle"];
      if (!acc[encounter.id]) {
        acc[encounter.id] = {
          ...encounter,
          participants: [],
        };
      }
      if (!participant || !creature) return acc;
      acc[encounter.id].participants.push({
        ...participant,
        ...creature,
      });
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
          eq(encounters.user_id, opts.ctx.user.id),
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
      const encounter = row["encounters-drizzle"];
      const participant = row["encounter_participant-drizzle"];
      const creature = row["creatures-drizzle"];
      if (!acc[encounter.id]) {
        acc[encounter.id] = {
          ...encounter,
          participants: [],
        };
      }
      if (!participant || !creature) return acc;
      acc[encounter.id].participants.push({
        ...participant,
        ...creature,
      });
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
            eq(encounters.user_id, opts.ctx.user.id)
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
          user_id: opts.ctx.user.id,
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
            eq(encounters.user_id, opts.ctx.user.id)
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

  startEncounter: protectedProcedure
    .input(z.string())
    .mutation(async (opts) => {
      const result = await db.transaction(async (tx) => {
        const [encounter, encounterParticipants] = await Promise.all([
          getUserEncounter(opts.ctx.user.id, opts.input, tx),
          tx
            .select()
            .from(encounter_participant)
            .where(eq(encounter_participant.encounter_id, opts.input)),
        ]);
        const sortedParticipants = encounterParticipants.sort(
          sortEncounterCreatures
        );
        const activeParticipant = sortedParticipants[0];
        await tx
          .update(encounter_participant)
          .set({
            is_active: true,
          })
          .where(
            and(
              eq(encounter_participant.encounter_id, opts.input),
              eq(encounter_participant.id, activeParticipant.id)
            )
          );
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
          getUserEncounter(opts.ctx.user.id, opts.input.encounter_id, tx),
          tx
            .select()
            .from(encounter_participant)
            .where(
              eq(encounter_participant.encounter_id, opts.input.encounter_id)
            ),
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

        await tx.execute(
          sql`
          UPDATE encounter_participants
          SET is_active = CASE 
              WHEN id = ${newActive.id} THEN TRUE
              ELSE FALSE
          END
          WHERE encounter_id = ${encounter.id}
          `
        );
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
      await getUserEncounter(opts.ctx.user.id, opts.input.encounter_id);
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
              eq(creatures.user_id, opts.ctx.user.id)
            )
          ),
        getUserEncounter(opts.ctx.user.id, opts.input.encounter_id),
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

  createCreature: protectedProcedure
    .input(creatureUploadSchema)
    .mutation(async (opts) => {
      return createCreature(opts.ctx.user.id, opts.input);
    }),

  createCreatureAndAddToEncounter: protectedProcedure
    .input(
      z.object({
        creature: creatureUploadSchema,
        encounter_id: z.string(),
      })
    )
    .mutation(async (opts) => {
      const newParticipant = await db.transaction(async (tx) => {
        const [newCreature, _] = await Promise.all([
          createCreature(opts.ctx.user.id, opts.input.creature, tx),
          getUserEncounter(opts.ctx.user.id, opts.input.encounter_id, tx),
        ]);
        const encounterParticipant = await tx
          .insert(encounter_participant)
          .values({
            encounter_id: opts.input.encounter_id,
            creature_id: newCreature.id,
          })
          .returning();
        if (encounterParticipant.length === 0) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to add creature to encounter",
          });
        }
        return encounterParticipant;
      });
      return newParticipant[0];
    }),

  updateEncounterParticipant: protectedProcedure
    .input(insertParticipantSchema)
    .mutation(async (opts) => {
      if (!opts.input.id) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No participant id in reqquest",
        });
      }
      const [newParticipant, _] = await Promise.all([
        db
          .update(encounter_participant)
          .set(opts.input)
          .where(
            and(
              eq(encounter_participant.encounter_id, opts.input.encounter_id),
              eq(encounter_participant.id, opts.input.id)
            )
          )
          .returning(),
        getUserEncounter(opts.ctx.user.id, opts.input.encounter_id),
      ]);
      if (newParticipant.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update encounter participant",
        });
      }
      return newParticipant[0];
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
            eq(creatures.user_id, opts.ctx.user.id)
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
            eq(creatures.user_id, opts.ctx.user.id)
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
      const filters = [eq(creatures.user_id, opts.ctx.user.id)];
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
    opts.ctx.user.id;
    const userSettings = await db
      .select()
      .from(settings)
      .where(eq(settings.user_id, opts.ctx.user.id));
    if (userSettings.length === 0) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "No settings found",
      });
    }
    return userSettings[0];
  }),

  initSettings: protectedProcedure.mutation(async (opts) => {
    const result = await db
      .insert(settings)
      .values({
        user_id: opts.ctx.user.id,
      })
      .returning();
    if (result.length === 0) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create settings",
      });
    }
    return result[0];
  }),

  updateSettings: protectedProcedure
    .input(insertSettingsSchema.omit({ user_id: true }))
    .mutation(async (opts) => {
      const result = await db
        .update(settings)
        .set(opts.input)
        .where(eq(settings.user_id, opts.ctx.user.id))
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
