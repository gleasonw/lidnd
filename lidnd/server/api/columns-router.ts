import { protectedProcedure } from "@/server/api/base-trpc";
import { db } from "@/server/db";
import { participants, stat_columns } from "@/server/db/schema";
import { ServerEncounter } from "@/server/sdk/encounters";
import { StatColumnUtils } from "@/utils/stat-columns";
import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import * as R from "remeda";

const columnInsertSchema = createInsertSchema(stat_columns);
const columnSelectSchema = createSelectSchema(stat_columns);
export type StatColumn = typeof stat_columns.$inferSelect;

export const columnsRouter = {
  getColumns: protectedProcedure.input(z.string()).query(async (opts) => {
    const [columns, _] = await Promise.all([
      db.query.stat_columns.findMany({
        where: (columns, { eq }) => and(eq(columns.encounter_id, opts.input)),
      }),
      ServerEncounter.encounterByIdThrows(opts.ctx, opts.input),
    ]);
    return columns;
  }),
  createColumn: protectedProcedure
    .input(columnInsertSchema)
    .mutation(async (opts) => {
      const [_, encounterColumns] = await Promise.all([
        ServerEncounter.encounterByIdThrows(opts.ctx, opts.input.encounter_id),
        db.query.stat_columns.findMany({
          where: (columns, { eq }) =>
            eq(columns.encounter_id, opts.input.encounter_id),
        }),
      ]);
      const result = await db
        .insert(stat_columns)
        .values(opts.input)
        .returning();
      if (result.length === 0) {
        throw new Error("Failed to create column");
      }
      //TODO: i guess this could be a complex case statement to do it in one query, but eh
      const updatedColumns = StatColumnUtils.add(encounterColumns, result[0]!);
      //TODO: extract into a SDK function to dedupe with updateColumnBatch
      await db
        .insert(stat_columns)
        .values(updatedColumns)
        .onConflictDoUpdate({
          target: stat_columns.id,
          set: {
            percent_width: sql.raw(`excluded.percent_width`),
          },
        })
        .returning();

      if (result.length === 0) {
        throw new Error("Failed to update column");
      }
      return result;
    }),
  updateColumn: protectedProcedure
    .input(columnInsertSchema.extend({ id: z.string() }))
    .mutation(async (opts) => {
      await ServerEncounter.encounterByIdThrows(
        opts.ctx,
        opts.input.encounter_id
      );
      const result = await db
        .update(stat_columns)
        .set(opts.input)
        .where(
          and(
            eq(stat_columns.id, opts.input.id),
            eq(stat_columns.encounter_id, opts.input.encounter_id)
          )
        )
        .returning();
      if (result.length === 0) {
        throw new Error("Failed to update column");
      }
      return result[0];
    }),
  updateColumnBatch: protectedProcedure
    .input(
      z.object({
        columns: z.array(columnInsertSchema),
        encounter_id: z.string(),
      })
    )
    .mutation(async (opts) => {
      await ServerEncounter.encounterByIdThrows(
        opts.ctx,
        opts.input.encounter_id
      );
      const result = await db
        .insert(stat_columns)
        .values(opts.input.columns)
        .onConflictDoUpdate({
          target: stat_columns.id,
          set: {
            percent_width: sql.raw(`excluded.percent_width`),
          },
        })
        .returning();

      if (result.length === 0) {
        throw new Error("Failed to update column");
      }
      return result;
    }),
  deleteColumn: protectedProcedure
    .input(columnSelectSchema)
    .mutation(async (opts) => {
      const [_, encounterColumns] = await Promise.all([
        ServerEncounter.encounterByIdThrows(opts.ctx, opts.input.encounter_id),
        db.query.stat_columns.findMany({
          where: (columns, { eq }) =>
            eq(columns.encounter_id, opts.input.encounter_id),
          with: {
            participants: true,
          },
        }),
      ]);
      if (encounterColumns.length === 1) {
        throw new TRPCError({
          message: `cannot delete last column`,
          code: "INTERNAL_SERVER_ERROR",
        });
      }

      const columnToDelete = encounterColumns.find(
        (c) => c.id === opts.input.id
      );
      if (!columnToDelete) {
        throw new TRPCError({
          message: `unable to find column to delete? critical error, something is very wrong`,
          code: "INTERNAL_SERVER_ERROR",
        });
      }
      const result = await db
        .delete(stat_columns)
        .where(
          and(
            eq(stat_columns.id, opts.input.id),
            eq(stat_columns.encounter_id, opts.input.encounter_id)
          )
        )
        .returning();
      if (result[0] === undefined) {
        throw new TRPCError({
          message: `unable to delete column`,
          code: "INTERNAL_SERVER_ERROR",
        });
      }

      const operations: Array<Promise<any>> = [];

      if (columnToDelete.participants.length > 0) {
        // move all participants to the next column with the fewest
        const targetColumn = R.firstBy(
          encounterColumns,
          (c) => c.participants.length
        );
        if (!targetColumn) {
          throw new TRPCError({
            message: `no target column found to reassign participants`,
            code: "INTERNAL_SERVER_ERROR",
          });
        }
        operations.push(
          db
            .update(participants)
            .set({ column_id: targetColumn.id })
            .where(eq(participants.column_id, columnToDelete.id))
        );
      }

      // now update widths of remaining columns

      const updatedColumns = StatColumnUtils.remove(
        encounterColumns,
        result[0].id
      );
      if (updatedColumns.length > 0) {
        //TODO: extract into a SDK function to dedupe with updateColumnBatch
        operations.push(
          db
            .insert(stat_columns)
            .values(updatedColumns)
            .onConflictDoUpdate({
              target: stat_columns.id,
              set: {
                percent_width: sql.raw(`excluded.percent_width`),
              },
            })
            .returning()
        );
      }

      await Promise.all(operations);

      if (result.length === 0) {
        throw new Error("Failed to delete column");
      }
      return result;
    }),
  assignParticipantToColumn: protectedProcedure
    .input(
      z.object({
        participant_id: z.string(),
        column_id: z.string(),
        encounter_id: z.string(),
      })
    )
    .mutation(async (opts) => {
      await ServerEncounter.encounterByIdThrows(
        opts.ctx,
        opts.input.encounter_id
      );
      await db
        .update(participants)
        .set({ column_id: opts.input.column_id })
        .where(eq(participants.id, opts.input.participant_id));
    }),
};
