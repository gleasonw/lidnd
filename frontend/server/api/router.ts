import { createContext } from "@/server/api/context";
import { TRPCError, initTRPC } from "@trpc/server";
import {
  encounters,
  encounter_participant,
  creatures,
} from "@/server/api/db/schema";
import { eq, and } from "drizzle-orm";
import { db } from "@/server/api/db";
import superjson from "superjson";
import { ZodError, z } from "zod";

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
type EncounterParticipant = typeof encounter_participant.$inferSelect;

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

  hello: protectedProcedure.input(z.string()).query(async (opts) => {
    return `hello ${opts.input}`;
  }),
});

// export type definition of API
export type AppRouter = typeof appRouter;
