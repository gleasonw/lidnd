import { ConvexError, v } from "convex/values";
import * as drawSteel from "../rules/drawSteel";
import { Id } from "./_generated/dataModel";
import { mutation, MutationCtx, query, QueryCtx } from "./_generated/server";
import { partyHeroes, withImageUrls } from "./creatures";
import { imageUrl } from "./files";
import {
  requireOwnedCampaign,
  requireOwnedCreature,
  requireOwnedPlan,
} from "./lib/auth";
import { activeSession } from "./sessions";
import { imageKind, side, targetDifficulty } from "./schema";

async function planTags(ctx: QueryCtx, planId: Id<"plans">) {
  const links = await ctx.db
    .query("planTags")
    .withIndex("by_planId", (q) => q.eq("planId", planId))
    .take(100);
  const tags = await Promise.all(links.map((l) => ctx.db.get("tags", l.tagId)));
  return tags
    .filter((t) => t !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function runsForPlan(ctx: QueryCtx, planId: Id<"plans">) {
  return await ctx.db
    .query("runs")
    .withIndex("by_planId", (q) => q.eq("planId", planId))
    .order("desc")
    .take(100);
}

export const list = query({
  args: {
    campaignId: v.id("campaigns"),
    search: v.string(),
    tagIds: v.array(v.id("tags")),
  },
  handler: async (ctx, { campaignId, search, tagIds }) => {
    await requireOwnedCampaign(ctx, campaignId);
    const plans =
      search.trim() === ""
        ? await ctx.db
            .query("plans")
            .withIndex("by_campaignId", (q) => q.eq("campaignId", campaignId))
            .order("desc")
            .take(500)
        : await ctx.db
            .query("plans")
            .withSearchIndex("search_name", (q) =>
              q.search("name", search).eq("campaignId", campaignId),
            )
            .take(100);
    const withTags = await Promise.all(
      plans.map(async (plan) => {
        const runs = await runsForPlan(ctx, plan._id);
        return {
          ...plan,
          tags: await planTags(ctx, plan._id),
          runCount: runs.length,
          lastRunAt: runs[0]?.startedAt,
        };
      }),
    );
    // A plan must have every selected tag.
    return withTags.filter((plan) =>
      tagIds.every((id) => plan.tags.some((t) => t._id === id)),
    );
  },
});

export const get = query({
  args: { planId: v.string() },
  handler: async (ctx, args) => {
    const planId = ctx.db.normalizeId("plans", args.planId);
    if (planId === null) return null;
    const plan = await ctx.db.get("plans", planId);
    if (plan === null) return null;
    const campaign = await requireOwnedCampaign(ctx, plan.campaignId);

    const rows = await ctx.db
      .query("planParticipants")
      .withIndex("by_planId", (q) => q.eq("planId", planId))
      .take(500);
    const participants = (
      await Promise.all(
        rows.map(async (row) => {
          const creature = await ctx.db.get("creatures", row.creatureId);
          return (
            creature && { ...row, creature: await withImageUrls(ctx, creature) }
          );
        }),
      )
    ).filter((p) => p !== null);

    const images = await ctx.db
      .query("planImages")
      .withIndex("by_planId", (q) => q.eq("planId", planId))
      .take(100);
    const runs = await runsForPlan(ctx, planId);
    const session = await activeSession(ctx, campaign._id);

    return {
      plan,
      campaign,
      participants,
      turnGroups: await ctx.db
        .query("turnGroups")
        .withIndex("by_planId", (q) => q.eq("planId", planId))
        .take(50),
      tags: await planTags(ctx, planId),
      images: await Promise.all(
        images.map(async (image) => ({
          ...image,
          url: await imageUrl(ctx, image.storageId),
        })),
      ),
      reminders: (
        await ctx.db
          .query("reminders")
          .withIndex("by_planId", (q) => q.eq("planId", planId))
          .take(100)
      ).sort((a, b) => a.round - b.round),
      runs: await Promise.all(
        runs.map(async (run) => ({
          ...run,
          sessionName: (await ctx.db.get("sessions", run.sessionId))?.name,
        })),
      ),
      activeSession: session,
    };
  },
});

export const create = mutation({
  args: { campaignId: v.id("campaigns"), name: v.string() },
  handler: async (ctx, { campaignId, name }) => {
    await requireOwnedCampaign(ctx, campaignId);
    if (name.trim() === "") throw new ConvexError("Name is required");
    const planId = await ctx.db.insert("plans", {
      campaignId,
      name: name.trim(),
      notes: "",
      targetDifficulty: "standard",
    });
    // Start with the whole party; the GM removes anyone who isn't playing.
    for (const hero of await partyHeroes(ctx, campaignId)) {
      await ctx.db.insert("planParticipants", {
        planId,
        creatureId: hero._id,
        side: "enemy",
      });
    }
    return planId;
  },
});

export const update = mutation({
  args: {
    planId: v.id("plans"),
    name: v.optional(v.string()),
    notes: v.optional(v.string()),
    targetDifficulty: v.optional(targetDifficulty),
  },
  handler: async (ctx, { planId, ...fields }) => {
    await requireOwnedPlan(ctx, planId);
    if (fields.name !== undefined && fields.name.trim() === "") {
      throw new ConvexError("Name is required");
    }
    await ctx.db.patch("plans", planId, {
      ...fields,
      ...(fields.name !== undefined && { name: fields.name.trim() }),
    });
  },
});

/** Deletes a plan and its prep data. Callers check that it has no runs. */
export async function deletePlan(ctx: MutationCtx, planId: Id<"plans">) {
  const tables = [
    "planParticipants",
    "turnGroups",
    "planTags",
    "planImages",
    "reminders",
  ] as const;
  for (const table of tables) {
    const rows = await ctx.db
      .query(table)
      .withIndex("by_planId", (q) => q.eq("planId", planId))
      .take(500);
    for (const row of rows) {
      await ctx.db.delete(table, row._id);
    }
  }
  await ctx.db.delete("plans", planId);
}

// A plan with any runs can't be deleted.
export const remove = mutation({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    const { plan } = await requireOwnedPlan(ctx, planId);
    const runs = await runsForPlan(ctx, planId);
    if (runs.length > 0) {
      throw new ConvexError(
        `“${plan.name}” has ${runs.length} run${runs.length === 1 ? "" : "s"} and can't be deleted`,
      );
    }
    await deletePlan(ctx, planId);
  },
});

// Roster

export const addParticipant = mutation({
  args: {
    planId: v.id("plans"),
    creatureId: v.id("creatures"),
    side: v.optional(side),
  },
  handler: async (ctx, { planId, creatureId, side }) => {
    const { campaign } = await requireOwnedPlan(ctx, planId);
    const creature = await requireOwnedCreature(ctx, creatureId);
    if (creature.system !== campaign.system) {
      throw new ConvexError("That creature is for a different game system");
    }
    return await ctx.db.insert("planParticipants", {
      planId,
      creatureId,
      side: creature.kind === "hero" ? "enemy" : (side ?? "enemy"),
      minionCount: creature.kind === "minion" ? 4 : undefined,
    });
  },
});

async function requireOwnedPlanParticipant(
  ctx: QueryCtx,
  participantId: Id<"planParticipants">,
) {
  const participant = await ctx.db.get("planParticipants", participantId);
  if (participant === null) throw new ConvexError("Participant not found");
  await requireOwnedPlan(ctx, participant.planId);
  return participant;
}

export const updateParticipant = mutation({
  args: {
    participantId: v.id("planParticipants"),
    side: v.optional(side),
    minionCount: v.optional(v.number()),
    /** null removes it from its initiative group. */
    turnGroupId: v.optional(v.union(v.id("turnGroups"), v.null())),
  },
  handler: async (ctx, { participantId, side, minionCount, turnGroupId }) => {
    const participant = await requireOwnedPlanParticipant(ctx, participantId);
    if (
      minionCount !== undefined &&
      (!Number.isInteger(minionCount) ||
        minionCount < 1 ||
        minionCount > drawSteel.MAX_SQUAD_SIZE)
    ) {
      throw new ConvexError(
        `A minion squad has 1 to ${drawSteel.MAX_SQUAD_SIZE} minions`,
      );
    }
    if (turnGroupId) {
      const group = await ctx.db.get("turnGroups", turnGroupId);
      if (group?.planId !== participant.planId) {
        throw new ConvexError("Initiative group not found");
      }
    }
    await ctx.db.patch("planParticipants", participantId, {
      ...(side !== undefined && { side }),
      ...(minionCount !== undefined && { minionCount }),
      ...(turnGroupId !== undefined && {
        turnGroupId: turnGroupId ?? undefined,
      }),
    });
  },
});

export const removeParticipant = mutation({
  args: { participantId: v.id("planParticipants") },
  handler: async (ctx, { participantId }) => {
    await requireOwnedPlanParticipant(ctx, participantId);
    await ctx.db.delete("planParticipants", participantId);
  },
});

// Initiative groups (Draw Steel)

export const addTurnGroup = mutation({
  args: { planId: v.id("plans"), name: v.string() },
  handler: async (ctx, { planId, name }) => {
    const { campaign } = await requireOwnedPlan(ctx, planId);
    if (campaign.system !== "drawSteel") {
      throw new ConvexError("Initiative groups are only for Draw Steel");
    }
    if (name.trim() === "") throw new ConvexError("Name is required");
    return await ctx.db.insert("turnGroups", { planId, name: name.trim() });
  },
});

async function requireOwnedTurnGroup(ctx: QueryCtx, groupId: Id<"turnGroups">) {
  const group = await ctx.db.get("turnGroups", groupId);
  if (group === null) throw new ConvexError("Initiative group not found");
  await requireOwnedPlan(ctx, group.planId);
  return group;
}

export const renameTurnGroup = mutation({
  args: { groupId: v.id("turnGroups"), name: v.string() },
  handler: async (ctx, { groupId, name }) => {
    await requireOwnedTurnGroup(ctx, groupId);
    if (name.trim() === "") throw new ConvexError("Name is required");
    await ctx.db.patch("turnGroups", groupId, { name: name.trim() });
  },
});

export const setTurnGroupColor = mutation({
  args: { groupId: v.id("turnGroups"), color: v.optional(v.string()) },
  handler: async (ctx, { groupId, color }) => {
    await requireOwnedTurnGroup(ctx, groupId);
    if (color !== undefined && !/^#[0-9a-f]{6}$/i.test(color)) {
      throw new ConvexError("Color must be a hex value like #3b82f6");
    }
    await ctx.db.patch("turnGroups", groupId, { color });
  },
});

export const removeTurnGroup = mutation({
  args: { groupId: v.id("turnGroups") },
  handler: async (ctx, { groupId }) => {
    const group = await requireOwnedTurnGroup(ctx, groupId);
    const members = await ctx.db
      .query("planParticipants")
      .withIndex("by_planId", (q) => q.eq("planId", group.planId))
      .take(500);
    for (const m of members.filter((m) => m.turnGroupId === groupId)) {
      await ctx.db.patch("planParticipants", m._id, { turnGroupId: undefined });
    }
    await ctx.db.delete("turnGroups", groupId);
  },
});

// Tags

export const listTags = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    await requireOwnedCampaign(ctx, campaignId);
    return await ctx.db
      .query("tags")
      .withIndex("by_campaignId_and_name", (q) =>
        q.eq("campaignId", campaignId),
      )
      .take(500);
  },
});

/** Attaches a tag by name, creating it in the campaign if it's new. */
export const addTag = mutation({
  args: { planId: v.id("plans"), name: v.string() },
  handler: async (ctx, { planId, name }) => {
    const { plan } = await requireOwnedPlan(ctx, planId);
    const trimmed = name.trim();
    if (trimmed === "") throw new ConvexError("Tag name is required");
    const existing = await ctx.db
      .query("tags")
      .withIndex("by_campaignId_and_name", (q) =>
        q.eq("campaignId", plan.campaignId).eq("name", trimmed),
      )
      .unique();
    const tagId =
      existing?._id ??
      (await ctx.db.insert("tags", {
        campaignId: plan.campaignId,
        name: trimmed,
      }));
    const links = await ctx.db
      .query("planTags")
      .withIndex("by_planId", (q) => q.eq("planId", planId))
      .take(100);
    if (!links.some((l) => l.tagId === tagId)) {
      await ctx.db.insert("planTags", { planId, tagId });
    }
  },
});

/** Detaches a tag, and deletes it if no other plan uses it. */
export const removeTag = mutation({
  args: { planId: v.id("plans"), tagId: v.id("tags") },
  handler: async (ctx, { planId, tagId }) => {
    await requireOwnedPlan(ctx, planId);
    const links = await ctx.db
      .query("planTags")
      .withIndex("by_tagId", (q) => q.eq("tagId", tagId))
      .take(500);
    for (const link of links.filter((l) => l.planId === planId)) {
      await ctx.db.delete("planTags", link._id);
    }
    if (links.every((l) => l.planId === planId)) {
      await ctx.db.delete("tags", tagId);
    }
  },
});

// Images

export const addImage = mutation({
  args: {
    planId: v.id("plans"),
    storageId: v.id("_storage"),
    kind: imageKind,
  },
  handler: async (ctx, args) => {
    await requireOwnedPlan(ctx, args.planId);
    return await ctx.db.insert("planImages", args);
  },
});

export const removeImage = mutation({
  args: { imageId: v.id("planImages") },
  handler: async (ctx, { imageId }) => {
    const image = await ctx.db.get("planImages", imageId);
    if (image === null) return;
    await requireOwnedPlan(ctx, image.planId);
    await ctx.db.delete("planImages", imageId);
  },
});

// Reminders

function validateReminder(text: string, round: number) {
  if (text.trim() === "") throw new ConvexError("Reminder text is required");
  if (!Number.isInteger(round) || round < 0) {
    throw new ConvexError("Round must be a whole number");
  }
}

export const addReminder = mutation({
  args: { planId: v.id("plans"), text: v.string(), round: v.number() },
  handler: async (ctx, { planId, text, round }) => {
    await requireOwnedPlan(ctx, planId);
    validateReminder(text, round);
    return await ctx.db.insert("reminders", {
      planId,
      text: text.trim(),
      round,
    });
  },
});

export const removeReminder = mutation({
  args: { reminderId: v.id("reminders") },
  handler: async (ctx, { reminderId }) => {
    const reminder = await ctx.db.get("reminders", reminderId);
    if (reminder === null) return;
    await requireOwnedPlan(ctx, reminder.planId);
    await ctx.db.delete("reminders", reminderId);
  },
});
