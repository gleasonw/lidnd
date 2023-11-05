import { createContext } from "@/server/api/context";
import { TRPCError, initTRPC } from "@trpc/server";
import {
  encounters,
  encounter_participant,
  creatures,
  settings,
} from "@/server/api/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/server/api/db";
import superjson from "superjson";
import { ZodError, z } from "zod";
import {
  sortEncounterCreatures,
  updateTurnOrder,
} from "@/app/dashboard/encounters/utils";

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
type Creature = typeof creatures.$inferSelect;
export type EncounterParticipant = typeof encounter_participant.$inferSelect;

export type EncounterCreature = EncounterParticipant & Creature;
export type EncounterWithParticipants = Encounter & {
  participants: EncounterCreature[];
};

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
        const encounter = await tx
          .update(encounters)
          .set({
            started_at: new Date(),
          })
          .where(
            and(
              eq(encounters.id, opts.input),
              eq(encounters.user_id, opts.ctx.user.id)
            )
          )
          .returning();
        const encounterParticipants = await tx
          .select()
          .from(encounter_participant)
          .where(eq(encounter_participant.encounter_id, opts.input));
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
      if (result.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to start encounter",
        });
      }
      return result[0];
    }),

  updateTurn: protectedProcedure
    .input(z.literal("next").or(z.literal("previous")))
    .mutation(async (opts) => {
      const result = await db.transaction(async (tx) => {
        const encounter = await tx
          .select()
          .from(encounters)
          .where(and(eq(encounters.user_id, opts.ctx.user.id)));
        if (encounter.length === 0) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No encounter found",
          });
        }
        const encounterParticipants = await tx
          .select()
          .from(encounter_participant)
          .where(eq(encounter_participant.encounter_id, encounter[0].id));
        const updatedOrder = updateTurnOrder(opts.input, encounterParticipants);
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
          WHERE encounter_id = ${encounter[0].id}
          `
        );
        return encounter;
      });
      return result[0];
    }),

  removeParticipantFromEncounter: protectedProcedure
    .input(
      z.object({
        encounter_id: z.string(),
        participant_id: z.string(),
      })
    )
    .mutation(async (opts) => {
      const encounter = await db
        .select()
        .from(encounters)
        .where(
          and(
            eq(encounters.id, opts.input.encounter_id),
            eq(encounters.user_id, opts.ctx.user.id)
          )
        );
      if (encounter.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No encounter found",
        });
      }
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
});

// export type definition of API
export type AppRouter = typeof appRouter;
