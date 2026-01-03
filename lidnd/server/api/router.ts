import { TRPCError } from "@trpc/server";
import {
  participants,
  creatures,
  settings,
  participant_status_effects,
  status_effects,
  spells,
  reminders,
  campaigns,
  campaignToPlayer,
  creaturesSchema,
  reminderInsertSchema,
  updateCampaignSchema,
  updateEncounterSchema,
  updateSettingsSchema,
  creatureUploadSchema,
  encounters,
  campaignCreatureLink,
  images,
} from "@/server/db/schema";
import * as ServerTurnGroup from "@/server/sdk/turnGroups";
import {
  eq,
  and,
  ilike,
  lte,
  exists,
  isNull,
  ne,
  asc,
  desc,
} from "drizzle-orm";
import { db } from "@/server/db";
import { z } from "zod";
import { getIconAWSname, getStatBlockAWSname } from "@/server/api/utils";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  ServerEncounter,
  type EncounterWithData,
} from "@/server/sdk/encounters";
import { ServerCampaign } from "@/server/sdk/campaigns";
import { EncounterUtils } from "@/utils/encounters";
import { insertCreatureSchema, participantInsertSchema } from "../db/schema";
import _ from "lodash";
import { columnsRouter } from "@/server/api/columns-router";
import { protectedProcedure, publicProcedure, t } from "@/server/api/base-trpc";
import { encountersRouter } from "@/server/api/encounters-router";
import { participantsRouter } from "./participants-router";
import { ServerCreature } from "@/server/sdk/creatures";
import { gameSessionRouter } from "@/server/api/game-session-router";
import { revalidatePath } from "next/cache";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ImageUtils } from "@/utils/images";
import { CreatureUtils } from "@/utils/creatures";

export type Encounter = typeof encounters.$inferSelect;
export type Creature = typeof creatures.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type StatusEffect = typeof status_effects.$inferSelect;
export type ParticipantStatusEffect =
  typeof participant_status_effects.$inferSelect;

export type ParticipantWithData = EncounterWithData["participants"][number];
export type EncounterWithParticipants = Encounter & {
  participants: ParticipantWithData[];
};

export type InsertParticipant = typeof participants.$inferInsert;

export const appRouter = t.router({
  upload: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
        filetype: z.string(),
        width: z.number(),
        height: z.number(),
      })
    )
    .mutation(async (opts) => {
      const imageAsset = await db
        .insert(images)
        .values({
          name: opts.input.filename,
          user_id: opts.ctx.user.id,
          width: opts.input.width,
          height: opts.input.height,
        })
        .returning();

      if (imageAsset.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create image  asset",
        });
      }
      const image = imageAsset[0]!;
      const s3Client = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
      const signedUrl = await getSignedUrl(
        //@ts-expect-error weird aws type error. initialize not assignable to serialize?
        s3Client,
        new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME!,
          Key: ImageUtils.assetKey(image),
          ContentType: opts.input.filetype,
        }),
        { expiresIn: 3600 }
      );
      return {
        image,
        signedUrl,
      };
    }),

  spells: publicProcedure.input(z.string()).query(async (opts) => {
    return await db
      .select()
      .from(spells)
      .where(ilike(spells.name, `%${opts.input}%`))
      .limit(10);
  }),

  statusEffects: publicProcedure.query(async () => {
    return await db.select().from(status_effects);
  }),

  //#region Encounters

  ...encountersRouter,
  ...participantsRouter,
  ...gameSessionRouter,
  encounterById: protectedProcedure.input(z.string()).query(async (opts) => {
    const encounter = await ServerEncounter.encounterById(opts.ctx, opts.input);
    if (!encounter) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "No encounter found",
      });
    }
    return encounter;
  }),

  imageAssets: protectedProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async (opts) => {
      const search = opts.input?.search;
      // creatures with ref assets will have that asset pulled in plainAssets
      const [userCreaturesNoRefAsset, plainAssets] = await Promise.all([
        db
          .select()
          .from(creatures)
          .where(
            and(
              eq(creatures.user_id, opts.ctx.user.id),
              isNull(creatures.stat_block_asset),
              ne(creatures.type, "player"),
              search ? ilike(creatures.name, `%${search}%`) : undefined
            )
          ),
        db.query.images.findMany({
          where: (img, { eq, and, ilike: ilikeFn }) =>
            and(
              eq(img.user_id, opts.ctx.user.id),
              search ? ilikeFn(img.name, `%${search}%`) : undefined
            ),
        }),
      ]);
      const urlsForStatBlocks = userCreaturesNoRefAsset.map((c) => ({
        url: CreatureUtils.awsURL(c, "statBlock"),
        type: "statBlock" as const,
        baseModel: c,
      }));
      const urlsForPlainAssetes = plainAssets.map((i) => ({
        url: ImageUtils.url(i),
        type: "plain" as const,
        baseModel: i,
      }));
      return [...urlsForStatBlocks, ...urlsForPlainAssetes];
    }),

  encountersInCampaign: protectedProcedure
    .input(z.string())
    .query(async (opts) => {
      const campaignId = opts.input;

      return await ServerEncounter.encountersInCampaign(opts.ctx, campaignId);
    }),

  encounterFromCampaignIndex: protectedProcedure
    .input(
      z.object({
        campaign_id: z.string(),
        encounter_index: z.number(),
      })
    )
    .query(async (opts) => {
      const encounter = await ServerEncounter.encounterFromCampaignAndIndex(
        opts.ctx,
        opts.input.campaign_id,
        opts.input.encounter_index
      );

      if (!encounter) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No encounter found",
        });
      }

      return encounter;
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

  updateEncounter: protectedProcedure
    .input(
      updateEncounterSchema.merge(
        z.object({
          id: z.string(),
          user_id: z.string().optional(),
          index_in_campaign: z.number().optional(),
          name: z.string().optional(),
        })
      )
    )
    .mutation(async (opts) => {
      const result = await ServerEncounter.updateEncounter({
        encounter: opts.input,
        dbObject: db,
        user_id: opts.ctx.user.id,
      });
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
        const encounter = await ServerEncounter.encounterByIdThrows(
          opts.ctx,
          opts.input
        );
        const campaign = await ServerCampaign.campaignByIdThrows(
          opts.ctx,
          encounter.campaign_id!,
          tx
        );

        const updatedEncounter = EncounterUtils.start(encounter, campaign);
        const maybeActiveParticipant = updatedEncounter.participants.find(
          (p) => p.is_active
        );

        const updates = [];
        if (maybeActiveParticipant) {
          updates.push(
            tx
              .update(participants)
              .set({
                is_active: true,
              })
              .where(
                and(
                  eq(participants.encounter_id, opts.input),
                  eq(participants.id, maybeActiveParticipant.id)
                )
              )
          );
        }
        updates.push(
          tx
            .update(encounters)
            .set({
              ...updatedEncounter,
            })
            .where(eq(encounters.id, opts.input))
        );
        await Promise.all(updates);
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

  cycleNextTurn: protectedProcedure
    .input(
      z.object({
        encounter_id: z.string(),
      })
    )
    .mutation(async (opts) => {
      const result = await db.transaction(async (tx) => {
        const encounter = await ServerEncounter.encounterByIdThrows(
          opts.ctx,
          opts.input.encounter_id
        );

        const { newlyActiveParticipant, updatedEncounter } =
          EncounterUtils.cycleNextTurn(encounter);

        await ServerEncounter.updateTurnData(
          opts.input.encounter_id,
          updatedEncounter.current_round,
          newlyActiveParticipant.id,
          tx
        );
        return updatedEncounter;
      });
      return result;
    }),

  cyclePreviousTurn: protectedProcedure
    .input(
      z.object({
        encounter_id: z.string(),
      })
    )
    .mutation(async (opts) => {
      const result = await db.transaction(async (tx) => {
        const encounter = await ServerEncounter.encounterByIdThrows(
          opts.ctx,
          opts.input.encounter_id
        );

        const { updatedEncounter, newlyActiveParticipant } =
          EncounterUtils.cyclePreviousTurn(encounter);

        await ServerEncounter.updateTurnData(
          opts.input.encounter_id,
          updatedEncounter.current_round,
          newlyActiveParticipant.id,
          tx
        );
        return updatedEncounter;
      });
      return result;
    }),

  updateGroupTurn: protectedProcedure
    .input(
      z.object({
        encounter_id: z.string(),
        participant_id: z.string(),
      })
    )
    .mutation(async (opts) => {
      const result = await db.transaction(async (tx) => {
        const encounter = await ServerEncounter.encounterByIdThrows(
          opts.ctx,
          opts.input.encounter_id,
          tx
        );

        const { updatedEncounter } = EncounterUtils.toggleGroupTurn(
          opts.input.participant_id,
          encounter
        );

        await Promise.all([
          ...updatedEncounter.participants.map((p) =>
            ServerEncounter.updateParticipantHasPlayed(p, tx)
          ),
          ...updatedEncounter.turn_groups.map((tg) =>
            ServerTurnGroup.updateTurnGroup(tg, tx)
          ),
          tx
            .update(encounters)
            .set({
              current_round: updatedEncounter.current_round,
              malice: updatedEncounter.malice,
            })
            .where(eq(encounters.id, opts.input.encounter_id)),
        ]);
        return updatedEncounter;
      });
      return result;
    }),

  addEncounterReminder: protectedProcedure
    .input(reminderInsertSchema)
    .mutation(async (opts) => {
      await ServerEncounter.encounterByIdThrows(
        opts.ctx,
        opts.input.encounter_id
      );

      await db.insert(reminders).values(opts.input);
    }),

  removeEncounterReminder: protectedProcedure
    .input(z.object({ reminder_id: z.string(), encounter_id: z.string() }))
    .mutation(async (opts) => {
      const encounter = await ServerEncounter.encounterByIdThrows(
        opts.ctx,
        opts.input.encounter_id
      );

      await db
        .delete(reminders)
        .where(
          and(
            eq(reminders.id, opts.input.reminder_id),
            eq(reminders.encounter_id, encounter.id)
          )
        );
    }),

  removeParticipantFromEncounter: protectedProcedure
    .input(
      z.object({
        encounter_id: z.string(),
        participant_id: z.string(),
      })
    )
    .mutation(async (opts) => {
      const encounter = await ServerEncounter.encounterByIdThrows(
        opts.ctx,
        opts.input.encounter_id
      );

      const result = await db
        .delete(participants)
        .where(
          and(
            eq(participants.encounter_id, opts.input.encounter_id),
            eq(participants.id, opts.input.participant_id)
          )
        )
        .returning();

      if (result.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove participant from encounter",
        });
      }

      if (result[0]?.is_active) {
        const { newlyActiveParticipant } =
          EncounterUtils.cycleNextTurn(encounter);

        ServerEncounter.setActiveParticipant(
          newlyActiveParticipant.id,
          opts.input.encounter_id
        );
      }
      return result[0];
    }),

  addExistingCreatureAsParticipant: protectedProcedure
    .input(
      participantInsertSchema.extend({
        creature_id: z.string(),
        encounter_id: z.string(),
      })
    )
    .mutation(async (opts) => {
      const [userCreature, encounter] = await Promise.all([
        db
          .select()
          .from(creatures)
          .where(
            and(
              eq(creatures.id, opts.input.creature_id),
              eq(creatures.user_id, opts.ctx.user.id)
            )
          ),
        ServerEncounter.encounterByIdThrows(opts.ctx, opts.input.encounter_id),
      ]);
      if (userCreature.length === 0 || !userCreature[0]) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No creature found",
        });
      }
      if (encounter.campaign_id) {
        await db.insert(campaignCreatureLink).values({
          campaign_id: encounter.campaign_id,
          creature_id: userCreature[0].id,
        });
      }
      const newP = await ServerEncounter.addParticipant(opts.ctx, {
        hp: userCreature[0].max_hp,
        ...opts.input,
      });
      revalidatePath("/");
      return newP;
    }),
  //#endregion

  //#region Campaigns

  campaignFromUrl: protectedProcedure
    .input(
      z.object({
        campaign_name: z.string(),
      })
    )
    .query(async (opts) => {
      const campaign = await ServerCampaign.campaignFromSlug(
        opts.ctx,
        opts.input.campaign_name
      );
      if (!campaign) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No campaign found",
        });
      }
      return campaign;
    }),

  userCampaigns: protectedProcedure.query(async (opts) => {
    return await ServerCampaign.userCampaigns(opts.ctx);
  }),

  campaignById: protectedProcedure.input(z.string()).query(async (opts) => {
    return await ServerCampaign.campaignByIdThrows(opts.ctx, opts.input);
  }),

  sessionsForCampaign: protectedProcedure
    .input(z.string())
    .query(async (opts) => {
      return await ServerCampaign.sessionsForCampaign(opts.ctx, opts.input);
    }),

  updateCampaign: protectedProcedure
    .input(updateCampaignSchema.merge(z.object({ id: z.string() })))
    .mutation(async (opts) => {
      const result = await db
        .update(campaigns)
        .set(opts.input)
        .where(
          and(
            eq(campaigns.id, opts.input.id),
            eq(campaigns.user_id, opts.ctx.user.id)
          )
        )
        .returning();
      if (result.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update campaign",
        });
      }
      return result[0];
    }),

  removeFromParty: protectedProcedure
    .input(
      z.object({
        campaign_id: z.string(),
        player_id: z.string(),
      })
    )
    .mutation(async (opts) => {
      await db.transaction(async (tx) => {
        // ensure ownership
        const campaign = await ServerCampaign.campaignByIdThrows(
          opts.ctx,
          opts.input.campaign_id,
          tx
        );
        await tx
          .delete(campaignToPlayer)
          .where(
            and(
              eq(campaignToPlayer.campaign_id, campaign.id),
              eq(campaignToPlayer.player_id, opts.input.player_id)
            )
          );
        await tx
          .delete(participants)
          .where(eq(participants.creature_id, opts.input.player_id));
        revalidatePath(`/`);
      });
    }),

  createCreatureAndAddToParty: protectedProcedure
    .input(
      z.object({
        creature: creatureUploadSchema,
        campaign_id: z.string(),
        hasStatBlock: z.boolean(),
        hasIcon: z.boolean(),
      })
    )
    .mutation(async (opts) => {
      return await db.transaction(async (tx) => {
        const campaign = await ServerCampaign.campaignByIdThrows(
          opts.ctx,
          opts.input.campaign_id,
          tx
        );

        const { creature, statBlockPresigned, iconPresigned } =
          await ServerCreature.create(opts.ctx, opts.input.creature, {
            hasStatBlock: opts.input.hasStatBlock,
            hasIcon: opts.input.hasIcon,
          });
        if (!creature) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create creature",
          });
        }
        await Promise.all([
          tx.insert(campaignToPlayer).values({
            campaign_id: campaign.id,
            player_id: creature.id,
          }),
          ServerCampaign.addCreatureToAllEncounters(
            opts.ctx,
            { creatureId: creature.id, campaign },
            tx
          ),
        ]);
        revalidatePath(`/`);

        return {
          newPartyMember: creature,
          statBlockPresigned,
          iconPresigned,
        };
      });
    }),

  /**we take a full creature here just to make the optimistic update on the client
   * work
   */
  addExistingCreatureToParty: protectedProcedure
    .input(
      z.object({
        campaign_id: z.string(),
        creature: creaturesSchema,
      })
    )
    .mutation(async (opts) => {
      await db.transaction(async (tx) => {
        const campaign = await ServerCampaign.campaignByIdThrows(
          opts.ctx,
          opts.input.campaign_id,
          tx
        );
        const creature = await tx.query.creatures.findFirst({
          where: eq(creatures.id, opts.input.creature.id),
        });
        if (!creature) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No creature found",
          });
        }

        await Promise.all([
          tx.insert(campaignToPlayer).values({
            campaign_id: campaign.id,
            player_id: opts.input.creature.id,
          }),
          ServerCampaign.addCreatureToAllEncounters(
            opts.ctx,
            { creatureId: opts.input.creature.id, campaign },
            tx
          ),
        ]);
      });
    }),

  //#endregion

  //#region Creatures

  updateCreature: protectedProcedure
    .input(insertCreatureSchema.omit({ user_id: true }))
    .mutation(async (opts) => {
      if (!opts.input.id) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No creature id in request",
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
      revalidatePath("/");
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
        const dc = deletedCreature[0];

        if (!dc) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete creature",
          });
        }

        await Promise.all([
          s3Client.send(
            new DeleteObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME!,
              Key: getIconAWSname(dc.id),
            })
          ),
          s3Client.send(
            new DeleteObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME!,
              Key: getStatBlockAWSname(dc.id),
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
      z
        .object({
          name: z.string().optional(),
          maxCR: z.number().optional(),
          includePlayers: z.boolean().optional(),
          campaignId: z.string().optional(),
          crSortOrder: z.enum(["asc", "desc"]).optional(),
        })
        .merge(creatureUploadSchema.pick({ type: true }))
    )
    .query(async (opts) => {
      const filters = [eq(creatures.user_id, opts.ctx.user.id)];
      if (opts.input.name) {
        filters.push(ilike(creatures.name, `%${opts.input.name}%`));
      }
      if (opts.input.type !== undefined) {
        filters.push(eq(creatures.type, opts.input.type));
      }
      if (opts.input.maxCR !== undefined) {
        filters.push(lte(creatures.challenge_rating, opts.input.maxCR));
      }
      if (opts.input.campaignId) {
        filters.push(
          exists(
            db
              .select()
              .from(campaignCreatureLink)
              .where(
                and(
                  eq(campaignCreatureLink.campaign_id, opts.input.campaignId),
                  eq(campaignCreatureLink.creature_id, creatures.id)
                )
              )
          )
        );
      }
      return await db
        .select()
        .from(creatures)
        .where(and(...filters))
        .orderBy(
          opts.input.crSortOrder === "asc"
            ? asc(creatures.challenge_rating)
            : opts.input.crSortOrder === "desc"
            ? desc(creatures.challenge_rating)
            : desc(creatures.created_at)
        );
    }),

  //#endregion

  //#region Settings

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

  updateSettings: protectedProcedure
    .input(updateSettingsSchema)
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
  ...columnsRouter,

  //#endregion
});

// export type definition of API
export type AppRouter = typeof appRouter;
