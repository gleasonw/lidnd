import { ConvexError, v } from "convex/values";
import { deleteCreature } from "./creatures";
import { deletePlan } from "./plans";
import { mutation, query } from "./_generated/server";
import { requireOwnedCampaign, requireUserId } from "./lib/auth";
import { gameSystem } from "./schema";
import { GameSystem, SYSTEMS } from "./lib/systems";

function validateFields(
  system: GameSystem,
  fields: { name?: string; partyLevel?: number },
) {
  if (fields.name !== undefined && fields.name.trim() === "") {
    throw new ConvexError("Campaign name is required");
  }
  const level = fields.partyLevel;
  const { maxLevel } = SYSTEMS[system];
  if (
    level !== undefined &&
    (!Number.isInteger(level) || level < 1 || level > maxLevel)
  ) {
    throw new ConvexError(
      `Party level must be a whole number from 1 to ${maxLevel}`,
    );
  }
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("campaigns")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
      .order("desc")
      .take(200);
  },
});

// Takes a raw string because it comes from the URL. Returns null for
// malformed, missing, or not-owned ids so the page can show "not found".
export const get = query({
  args: { campaignId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const campaignId = ctx.db.normalizeId("campaigns", args.campaignId);
    const campaign = campaignId && (await ctx.db.get("campaigns", campaignId));
    return campaign && campaign.ownerId === userId ? campaign : null;
  },
});

export const create = mutation({
  args: { name: v.string(), system: gameSystem, partyLevel: v.number() },
  handler: async (ctx, { name, system, partyLevel }) => {
    const ownerId = await requireUserId(ctx);
    validateFields(system, { name, partyLevel });
    return await ctx.db.insert("campaigns", {
      ownerId,
      name: name.trim(),
      system,
      partyLevel,
    });
  },
});

// The game system is fixed at creation: creatures, plans, and runs depend on it.
export const update = mutation({
  args: {
    campaignId: v.id("campaigns"),
    name: v.optional(v.string()),
    partyLevel: v.optional(v.number()),
  },
  handler: async (ctx, { campaignId, name, partyLevel }) => {
    const campaign = await requireOwnedCampaign(ctx, campaignId);
    validateFields(campaign.system, { name, partyLevel });
    await ctx.db.patch("campaigns", campaignId, {
      ...(name !== undefined && { name: name.trim() }),
      ...(partyLevel !== undefined && { partyLevel }),
    });
  },
});

// A campaign with runs can't be deleted (spec §9 "Deleting campaigns" is
// still open; this is the conservative choice). Otherwise its plans,
// sessions, tags, party, and campaign-only adversaries go with it.
export const remove = mutation({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    const campaign = await requireOwnedCampaign(ctx, campaignId);
    const run = await ctx.db
      .query("runs")
      .withIndex("by_campaignId_and_endedAt", (q) =>
        q.eq("campaignId", campaignId),
      )
      .first();
    if (run !== null) {
      throw new ConvexError(
        `“${campaign.name}” has encounter runs and can't be deleted`,
      );
    }
    const plans = await ctx.db
      .query("plans")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", campaignId))
      .take(1000);
    for (const plan of plans) {
      await deletePlan(ctx, plan._id);
    }
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", campaignId))
      .take(1000);
    for (const session of sessions) {
      await ctx.db.delete("sessions", session._id);
    }
    const tags = await ctx.db
      .query("tags")
      .withIndex("by_campaignId_and_name", (q) =>
        q.eq("campaignId", campaignId),
      )
      .take(1000);
    for (const tag of tags) {
      await ctx.db.delete("tags", tag._id);
    }
    const creatures = await ctx.db
      .query("creatures")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", campaignId))
      .take(1000);
    for (const creature of creatures) {
      await deleteCreature(ctx, creature._id);
    }
    await ctx.db.delete("campaigns", campaignId);
  },
});
