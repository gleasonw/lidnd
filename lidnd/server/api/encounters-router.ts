import { protectedProcedure } from "@/server/api/base-trpc";
import { db } from "@/server/db";
import {
  encounters,
  encounterSelectSchema,
  participants,
  participantSchema,
  turnGroupSelectSchema,
  encounter_tags,
  encounter_to_tag,
} from "@/server/db/schema";
import { ServerEncounter } from "@/server/sdk/encounters";
import { ServerParticipants } from "@/server/sdk/participants";
import { and, eq, ilike, inArray, notInArray } from "drizzle-orm";
import { z } from "zod";
import * as ServerTurnGroup from "@/server/sdk/turnGroups";
import { ServerCampaign } from "@/server/sdk/campaigns";
import { revalidatePath } from "next/cache";

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

  /** if the client disconnected for a bit, for instance */
  syncClientEncounterStateToGlobal: protectedProcedure
    .input(
      z.object({
        encounter: encounterSelectSchema.extend({
          participants: z.array(participantSchema),
          turn_groups: z.array(turnGroupSelectSchema),
        }),
      })
    )
    .mutation(async (opts) => {
      // ensure ownership
      await ServerEncounter.encounterByIdThrows(
        opts.ctx,
        opts.input.encounter.id
      );
      await db.transaction(async (tx) => {
        await Promise.all([
          ServerEncounter.updateEncounter({
            encounter: opts.input.encounter,
            user_id: opts.ctx.user.id,
            dbObject: tx,
          }),
          ...opts.input.encounter.participants.map(async (p) => {
            if (p.encounter_id !== opts.input.encounter.id) {
              return;
            }
            await ServerParticipants.updateParticipant({
              participant: p,
              dbObject: tx,
            });
          }),
          ...opts.input.encounter.turn_groups.map(async (tg) => {
            if (tg.encounter_id !== opts.input.encounter.id) {
              return;
            }
            await ServerTurnGroup.updateTurnGroup(tg, tx);
          }),
        ]);
      });
      // remove participants that were deleted while offline
      const ghostParticipants = await db
        .delete(participants)
        .where(
          and(
            eq(participants.encounter_id, opts.input.encounter.id),
            notInArray(
              participants.id,
              opts.input.encounter.participants.map((p) => p.id)
            )
          )
        )
        .returning();
      console.log(`removed ghost participants: `, ghostParticipants);
    }),

  getUserTags: protectedProcedure.query(async (opts) => {
    return await db.query.encounter_tags.findMany({
      where: (tag, { eq }) => eq(tag.user_id, opts.ctx.user.id),
      orderBy: (tag, { asc }) => [asc(tag.name)],
    });
  }),

  getCampaignTags: protectedProcedure
    .input(
      z.object({
        campaignId: z.string(),
      })
    )
    .query(async (opts) => {
      return await ServerCampaign.encountersByTag(opts.ctx, {
        campaignId: opts.input.campaignId,
      });
    }),

  createTag: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(256),
      })
    )
    .mutation(async (opts) => {
      const [tag] = await db
        .insert(encounter_tags)
        .values({
          name: opts.input.name,
          user_id: opts.ctx.user.id,
        })
        .returning();
      return tag;
    }),

  addTagToEncounter: protectedProcedure
    .input(
      z.object({
        encounter_id: z.string(),
        tag_id: z.string(),
      })
    )
    .mutation(async (opts) => {
      // Verify encounter ownership
      await ServerEncounter.encounterByIdThrows(
        opts.ctx,
        opts.input.encounter_id
      );

      // Check if tag belongs to user
      const tag = await db.query.encounter_tags.findFirst({
        where: (t, { eq, and }) =>
          and(eq(t.id, opts.input.tag_id), eq(t.user_id, opts.ctx.user.id)),
      });

      if (!tag) {
        throw new Error("Tag not found or does not belong to user");
      }

      // Check if relationship already exists
      const existing = await db.query.encounter_to_tag.findFirst({
        where: (ett, { eq, and }) =>
          and(
            eq(ett.encounter_id, opts.input.encounter_id),
            eq(ett.tag_id, opts.input.tag_id)
          ),
      });

      if (existing) {
        return existing;
      }

      const [relation] = await db
        .insert(encounter_to_tag)
        .values({
          encounter_id: opts.input.encounter_id,
          tag_id: opts.input.tag_id,
        })
        .returning();
      revalidatePath("/");

      return relation;
    }),

  removeTagFromEncounter: protectedProcedure
    .input(
      z.object({
        encounter_id: z.string(),
        tag_id: z.string(),
      })
    )
    .mutation(async (opts) => {
      // Verify encounter ownership
      await ServerEncounter.encounterByIdThrows(
        opts.ctx,
        opts.input.encounter_id
      );

      await db
        .delete(encounter_to_tag)
        .where(
          and(
            eq(encounter_to_tag.encounter_id, opts.input.encounter_id),
            eq(encounter_to_tag.tag_id, opts.input.tag_id)
          )
        );
      revalidatePath("/");
    }),

  getEncounters: protectedProcedure
    .input(
      z.object({
        campaignId: z.string(),
        matchName: z.string().optional(),
      })
    )
    .query(async (opts) => {
      return await db.query.encounters.findMany({
        where: and(
          eq(encounters.campaign_id, opts.input.campaignId),
          eq(encounters.user_id, opts.ctx.user.id),
          opts.input.matchName
            ? ilike(encounters.name, `%${opts.input.matchName}%`)
            : undefined
        ),
        with: {
          tags: {
            with: {
              tag: true,
            },
          },
        },
      });
    }),
};
