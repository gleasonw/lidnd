import { createContext } from "@/server/api/context";
import { TRPCError, initTRPC } from "@trpc/server";
import {
  encounters,
  participants,
  creatures,
  settings,
  participant_status_effects,
  status_effects,
  spells,
  reminders,
  campaigns,
  campaignToPlayer,
} from "@/server/api/db/schema";
import { eq, and, ilike } from "drizzle-orm";
import { db } from "@/server/api/db";
import superjson from "superjson";
import { ZodError, z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  getEncounterCreature,
  getIconAWSname,
  getStatBlockAWSname,
} from "@/server/api/utils";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ServerEncounter, type EncounterWithData } from "@/server/encounters";
import { ServerCampaign } from "@/server/campaigns";
import { booleanSchema } from "@/app/[username]/utils";
import { ParticipantUtils } from "@/utils/participants";
import { EncounterUtils } from "@/utils/encounters";
import { insertCreatureSchema } from "@/app/[username]/[campaign_slug]/encounter/types";
import _ from "lodash";
import type { LidndUser } from "@/app/authentication";

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

export const participantSchema = createSelectSchema(participants);
export const insertSettingsSchema = createInsertSchema(settings);
export const updateEncounterSchema = createInsertSchema(encounters);
const updateCampaignSchema = createInsertSchema(campaigns);
export const encounterInsertSchema = createInsertSchema(encounters);
export const reminderInsertSchema = createInsertSchema(reminders);
export const creaturesSchema = createSelectSchema(creatures);

export const updateSettingsSchema = insertSettingsSchema
  .omit({ user_id: true })
  .merge(
    z.object({
      show_health_in_discord: booleanSchema,
      show_icons_in_discord: booleanSchema,
      average_turn_seconds: z.coerce.number(),
    })
  );

export const appRouter = t.router({
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

  encounters: protectedProcedure.input(z.string()).query(async (opts) => {
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

  createEncounter: protectedProcedure
    .input(
      encounterInsertSchema.merge(
        z.object({
          user_id: z.string().optional(),
          index_in_campaign: z.number().optional(),
        })
      )
    )
    .mutation(async (opts) => {
      return await db.transaction(async (tx) => {
        const encountersInCampaign = await ServerEncounter.encountersInCampaign(
          opts.ctx,
          opts.input.campaign_id
        );

        const indexInCampaign = _.maxBy(
          encountersInCampaign,
          (e) => e.index_in_campaign
        );

        const currentMaxIndex = indexInCampaign
          ? indexInCampaign.index_in_campaign
          : 0;

        const newIndex = currentMaxIndex + 1;

        const [encounter, { campaignToPlayers }] = await Promise.all([
          tx
            .insert(encounters)
            .values({
              ...opts.input,
              user_id: opts.ctx.user.id,
              index_in_campaign: newIndex,
            })
            .returning(),
          ServerCampaign.campaignByIdThrows(
            opts.ctx,
            opts.input.campaign_id,
            tx
          ),
        ]);

        const encounterResult = encounter[0];

        if (encounterResult === undefined) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create encounter",
          });
        }

        if (campaignToPlayers) {
          await tx.insert(participants).values(
            campaignToPlayers.map(({ player: creature }) => ({
              encounter_id: encounterResult.id,
              creature_id: creature.id,
              is_ally: !creature.is_player,
              hp: creature.is_player ? 1 : creature.max_hp,
            }))
          );
        }

        const result = encounter[0];

        if (result === undefined) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create encounter",
          });
        }

        return result;
      });
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
      const result = await db
        .update(encounters)
        .set(opts.input)
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
        const encounter = await ServerEncounter.encounterByIdThrows(
          opts.ctx,
          opts.input
        );

        const [activeParticipant, firstRoundNumber] =
          EncounterUtils.firstActiveAndRoundNumber(encounter);

        await Promise.all([
          tx
            .update(participants)
            .set({
              is_active: true,
            })
            .where(
              and(
                eq(participants.encounter_id, opts.input),
                eq(participants.id, activeParticipant.id)
              )
            ),
          tx
            .update(encounters)
            .set({
              started_at: new Date(),
              current_round: firstRoundNumber,
              status: "run",
            })
            .where(eq(encounters.id, opts.input)),
        ]);
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

        const { newlyActiveParticipant, updatedRoundNumber } =
          EncounterUtils.cycleNextTurn(encounter);

        await ServerEncounter.updateTurnData(
          opts.input.encounter_id,
          updatedRoundNumber,
          newlyActiveParticipant.id,
          tx
        );
        return encounter;
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

        const { newlyActiveParticipant, updatedRoundNumber } =
          EncounterUtils.cyclePreviousTurn(encounter);

        await ServerEncounter.updateTurnData(
          opts.input.encounter_id,
          updatedRoundNumber,
          newlyActiveParticipant.id,
          tx
        );
        return encounter;
      });
      return result;
    }),

  updateGroupTurn: protectedProcedure
    .input(
      z.object({
        encounter_id: z.string(),
        participant_id: z.string(),
        has_played_this_round: z.boolean(),
      })
    )
    .mutation(async (opts) => {
      const result = await db.transaction(async (tx) => {
        const encounter = await ServerEncounter.encounterByIdThrows(
          opts.ctx,
          opts.input.encounter_id,
          tx
        );

        const { updatedParticipants, updatedRoundNumber } =
          EncounterUtils.updateGroupTurn(
            opts.input.participant_id,
            opts.input.has_played_this_round,
            encounter
          );

        await Promise.all([
          ...updatedParticipants.map((p) =>
            ServerEncounter.updateParticipantHasPlayed(p, tx)
          ),
          tx
            .update(encounters)
            .set({
              current_round: updatedRoundNumber,
            })
            .where(eq(encounters.id, opts.input.encounter_id)),
        ]);
        return encounter;
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

  addExistingCreatureToEncounter: protectedProcedure
    .input(
      z.object({
        encounter_id: z.string(),
        creature_id: z.string(),
        is_ally: booleanSchema,
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
        ServerEncounter.encounterByIdThrows(opts.ctx, opts.input.encounter_id),
      ]);
      if (userCreature.length === 0 || !userCreature[0]) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No creature found",
        });
      }
      const encounterParticipant = await db
        .insert(participants)
        .values({
          encounter_id: opts.input.encounter_id,
          creature_id: opts.input.creature_id,
          hp: userCreature[0].max_hp,
          is_ally: opts.input.is_ally,
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
  //#endregion

  //#region Encounter Participants

  updateEncounterMinionParticipant: protectedProcedure
    .input(
      participantSchema.merge(
        z.object({
          minion_count: z.number(),
          minions_in_overkill_range: z.number(),
          damage: z.number(),
        })
      )
    )
    .mutation(async (opts) => {
      const result = await db.transaction(async (tx) => {
        const participant = await getEncounterCreature(opts.input.id);
        if (!ParticipantUtils.isMinion(participant)) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Participant is not a minion; minion_count is not set",
          });
        }
        const updatedMinionCount = ParticipantUtils.updateMinionCount(
          participant,
          opts.input.minions_in_overkill_range,
          opts.input.damage
        );
        const [updatedParticipant, _] = await Promise.all([
          await tx
            .update(participants)
            .set({
              minion_count: updatedMinionCount,
              hp: ParticipantUtils.maxHp(participant),
            })
            .where(eq(participants.id, opts.input.id))
            .returning(),
          ServerEncounter.encounterById(opts.ctx, opts.input.encounter_id, tx),
        ]);
        if (updatedParticipant.length === 0) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update encounter participant",
          });
        }
        return updatedParticipant[0];
      });
      return result;
    }),

  updateEncounterParticipant: protectedProcedure
    .input(participantSchema)
    .mutation(async (opts) => {
      if (opts.input.hp <= 0) {
        // just remove the participant
        const result = await db.transaction(async (tx) => {
          const [update, _] = await Promise.all([
            await tx
              .delete(participants)
              .where(eq(participants.id, opts.input.id))
              .returning(),
            ServerEncounter.encounterByIdThrows(
              opts.ctx,
              opts.input.encounter_id,
              tx
            ),
          ]);
          const updatedParticipant = update[0];

          if (!updatedParticipant) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to update encounter participant",
            });
          }

          return updatedParticipant;
        });
        return result;
      }

      const result = await db.transaction(async (tx) => {
        const [update, _] = await Promise.all([
          await tx
            .update(participants)
            .set(opts.input)
            .where(eq(participants.id, opts.input.id))
            .returning(),
          ServerEncounter.encounterByIdThrows(
            opts.ctx,
            opts.input.encounter_id,
            tx
          ),
        ]);
        const updatedParticipant = update[0];

        if (!updatedParticipant) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update encounter participant",
          });
        }

        return updatedParticipant;
      });
      return result;
    }),

  removeStatusEffect: protectedProcedure
    .input(
      z.object({
        encounter_participant_id: z.string(),
        status_effect_id: z.string(),
      })
    )
    .mutation(async (opts) => {
      const result = await db
        .delete(participant_status_effects)
        .where(
          and(
            eq(
              participant_status_effects.encounter_participant_id,
              opts.input.encounter_participant_id
            ),
            eq(
              participant_status_effects.status_effect_id,
              opts.input.status_effect_id
            )
          )
        )
        .returning();
      if (result.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove status effect",
        });
      }
      return result[0];
    }),

  assignStatusEffect: protectedProcedure
    .input(
      z.object({
        encounter_participant_id: z.string(),
        status_effect_id: z.string(),
        duration: z.number().optional(),
        save_ends_dc: z.number().optional(),
      })
    )
    .mutation(async (opts) => {
      const result = await db
        .insert(participant_status_effects)
        .values({
          encounter_participant_id: opts.input.encounter_participant_id,
          status_effect_id: opts.input.status_effect_id,
          duration: opts.input.duration,
          save_ends_dc: opts.input.save_ends_dc,
        })
        .returning();
      if (result.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to assign status effect",
        });
      }
      return result[0];
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
      db.transaction(async (tx) => {
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
      });
    }),

  addToParty: protectedProcedure
    .input(
      z.object({
        campaign_id: z.string(),
        player: creaturesSchema,
      })
    )
    .mutation(async (opts) => {
      db.transaction(async (tx) => {
        const campaign = await ServerCampaign.campaignByIdThrows(
          opts.ctx,
          opts.input.campaign_id,
          tx
        );
        await tx.insert(campaignToPlayer).values({
          campaign_id: campaign.id,
          player_id: opts.input.player.id,
        });
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
      z.object({
        name: z.string().optional(),
        is_player: z.boolean().optional(),
      })
    )
    .query(async (opts) => {
      const filters = [eq(creatures.user_id, opts.ctx.user.id)];
      if (opts.input.name) {
        filters.push(ilike(creatures.name, `%${opts.input.name}%`));
      }
      if (opts.input.is_player !== undefined) {
        filters.push(eq(creatures.is_player, opts.input.is_player));
      }
      return await db
        .select()
        .from(creatures)
        .where(and(...filters));
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

  //#endregion
});

// export type definition of API
export type AppRouter = typeof appRouter;
