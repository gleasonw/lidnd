import type { LidndUser } from "@/app/authentication";
import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import { createContext } from "@/server/api/context";
import superjson from "superjson";

export const t = initTRPC.context<typeof createContext>().create({
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

export type LidndContext = { user: LidndUser };

const isAuthed = t.middleware((opts) => {
  const { ctx } = opts;

  if (!ctx.user || !ctx) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not on the whitelist.",
    });
  }

  return opts.next({
    ctx: {
      user: ctx.user,
    } satisfies LidndContext,
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);
export const publicProcedure = t.procedure;
