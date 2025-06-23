import { TRPCError } from "@trpc/server";
import { db } from "../db";
import { gameSessions, gameSessionSchema } from "../db/schema";
import { protectedProcedure } from "./base-trpc";

export const gameSessionRouter = {
  createGameSession: protectedProcedure
    .input(gameSessionSchema.omit({ user_id: true }))
    .mutation(async (opts) => {
      const session = await db
        .insert(gameSessions)
        .values({ ...opts.input, user_id: opts.ctx.user.id })
        .returning();
      if (!session || session.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create game session",
        });
      }
      return session[0];
    }),
};
