import { Context, createContext } from "@/server/api/context";
import { TRPCError, initTRPC } from "@trpc/server";
import { encounters } from "@/server/api/db/schema";
import { eq } from "drizzle-orm";
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

export const appRouter = t.router({
  encounters: protectedProcedure.query((opts) => {
    return db
      .select()
      .from(encounters)
      .where(eq(encounters.user_id, opts.ctx.user.id));
  }),

  hello: publicProcedure.input(z.string()).query(async (opts) => {
    return `hello ${opts.input}`;
  }),
});

// export type definition of API
export type AppRouter = typeof appRouter;
