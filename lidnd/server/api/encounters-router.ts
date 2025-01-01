import { protectedProcedure } from "@/server/api/base-trpc";
import { db } from "@/server/db";
import { encounters } from "@/server/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

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
};
