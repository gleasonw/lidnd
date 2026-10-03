import { ConvexError, v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { mutation, MutationCtx, query, QueryCtx } from "./_generated/server";
import { imageUrl } from "./files";
import {
  requireOwnedCampaign,
  requireOwnedCreature,
  requireUserId,
} from "./lib/auth";
import { creatureKind } from "./schema";

export async function withImageUrls(ctx: QueryCtx, creature: Doc<"creatures">) {
  return {
    ...creature,
    iconUrl: await imageUrl(ctx, creature.iconId),
    statBlockUrl: await imageUrl(ctx, creature.statBlockId),
  };
}

/** Heroes in the campaign's party. */
export async function partyHeroes(ctx: QueryCtx, campaignId: Id<"campaigns">) {
  const inCampaign = await ctx.db
    .query("creatures")
    .withIndex("by_campaignId", (q) => q.eq("campaignId", campaignId))
    .take(500);
  return inCampaign.filter((c) => c.kind === "hero");
}

/** Adversaries usable in a campaign: shared ones plus campaign-only ones. */
async function adversariesFor(ctx: QueryCtx, campaign: Doc<"campaigns">) {
  const all = await ctx.db
    .query("creatures")
    .withIndex("by_ownerId_and_system", (q) =>
      q.eq("ownerId", campaign.ownerId).eq("system", campaign.system),
    )
    .take(1000);
  return all.filter(
    (c) =>
      c.kind !== "hero" &&
      (c.campaignId === undefined || c.campaignId === campaign._id),
  );
}

export const listForCampaign = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    const campaign = await requireOwnedCampaign(ctx, campaignId);
    const heroes = await partyHeroes(ctx, campaignId);
    const adversaries = await adversariesFor(ctx, campaign);
    const byName = (a: Doc<"creatures">, b: Doc<"creatures">) =>
      a.name.localeCompare(b.name);
    return {
      heroes: await Promise.all(
        heroes.sort(byName).map((c) => withImageUrls(ctx, c)),
      ),
      adversaries: await Promise.all(
        adversaries.sort(byName).map((c) => withImageUrls(ctx, c)),
      ),
    };
  },
});

// Adversaries need a stat block to run them; heroes don't have one.
function validate(fields: {
  kind: Doc<"creatures">["kind"];
  name: string;
  challenge: number;
  maxHp: number;
  statBlockId?: Id<"_storage">;
}) {
  if (fields.name.trim() === "") throw new ConvexError("Name is required");
  if (fields.kind === "hero") return;
  if (fields.statBlockId === undefined) {
    throw new ConvexError("Add a stat block image for this adversary");
  }
  if (!(fields.challenge >= 0)) {
    throw new ConvexError("EV or CR can't be negative");
  }
  if (!Number.isInteger(fields.maxHp) || fields.maxHp < 1) {
    throw new ConvexError("Max HP must be a whole number of at least 1");
  }
}

const editableFields = {
  name: v.string(),
  challenge: v.number(),
  maxHp: v.number(),
  iconId: v.optional(v.id("_storage")),
  statBlockId: v.optional(v.id("_storage")),
  /** Adversaries only: keep within this campaign instead of sharing. */
  campaignOnly: v.boolean(),
};

export const create = mutation({
  args: {
    campaignId: v.id("campaigns"),
    kind: creatureKind,
    ...editableFields,
  },
  handler: async (ctx, { campaignId, campaignOnly, ...fields }) => {
    const campaign = await requireOwnedCampaign(ctx, campaignId);
    validate(fields);
    const isHero = fields.kind === "hero";
    return await ctx.db.insert("creatures", {
      ...fields,
      statBlockId: isHero ? undefined : fields.statBlockId,
      name: fields.name.trim(),
      challenge: isHero ? 0 : fields.challenge,
      maxHp: isHero ? 0 : fields.maxHp,
      ownerId: campaign.ownerId,
      system: campaign.system,
      campaignId: isHero || campaignOnly ? campaignId : undefined,
    });
  },
});

// Plans reference creatures, so edits flow to plans and future runs. Runs
// keep the values they started with.
export const update = mutation({
  args: {
    creatureId: v.id("creatures"),
    /** The campaign being edited from, for the campaign-only option. */
    campaignId: v.id("campaigns"),
    ...editableFields,
  },
  handler: async (ctx, { creatureId, campaignId, campaignOnly, ...fields }) => {
    const creature = await requireOwnedCreature(ctx, creatureId);
    await requireOwnedCampaign(ctx, campaignId);
    validate({ ...fields, kind: creature.kind });
    const isHero = creature.kind === "hero";
    await ctx.db.patch("creatures", creatureId, {
      ...fields,
      statBlockId: isHero ? undefined : fields.statBlockId,
      name: fields.name.trim(),
      challenge: isHero ? 0 : fields.challenge,
      maxHp: isHero ? 0 : fields.maxHp,
      campaignId: isHero || campaignOnly ? campaignId : undefined,
    });
  },
});

async function usage(ctx: QueryCtx, creatureId: Id<"creatures">) {
  const runParticipants = await ctx.db
    .query("runParticipants")
    .withIndex("by_creatureId", (q) => q.eq("creatureId", creatureId))
    .take(500);
  const runIds = [...new Set(runParticipants.map((p) => p.runId))];
  const runs = (
    await Promise.all(runIds.map((id) => ctx.db.get("runs", id)))
  ).filter((r) => r !== null);
  const planParticipants = await ctx.db
    .query("planParticipants")
    .withIndex("by_creatureId", (q) => q.eq("creatureId", creatureId))
    .take(500);
  const planIds = [...new Set(planParticipants.map((p) => p.planId))];
  return { runs, planIds, planParticipants };
}

export const getUsage = query({
  args: { creatureId: v.id("creatures") },
  handler: async (ctx, { creatureId }) => {
    await requireOwnedCreature(ctx, creatureId);
    const { runs, planIds } = await usage(ctx, creatureId);
    return {
      runs: runs.map((r) => ({
        _id: r._id,
        name: r.name,
        startedAt: r.startedAt,
      })),
      planCount: planIds.length,
    };
  },
});

// A creature used by any run can't be deleted. One used only by plans is
// removed from those plans.
export const remove = mutation({
  args: { creatureId: v.id("creatures") },
  handler: async (ctx, { creatureId }) => {
    await requireUserId(ctx);
    const creature = await requireOwnedCreature(ctx, creatureId);
    const { runs, planParticipants } = await usage(ctx, creatureId);
    if (runs.length > 0) {
      throw new ConvexError(
        `${creature.name} is used by ${runs.length} run${runs.length === 1 ? "" : "s"} and can't be deleted`,
      );
    }
    await deleteCreature(ctx, creatureId, planParticipants);
  },
});

/** Removes the creature from plans and deletes it. Callers check runs. */
export async function deleteCreature(
  ctx: MutationCtx,
  creatureId: Id<"creatures">,
  planParticipants?: Doc<"planParticipants">[],
) {
  for (const p of planParticipants ??
    (await usage(ctx, creatureId)).planParticipants) {
    await ctx.db.delete("planParticipants", p._id);
  }
  await ctx.db.delete("creatures", creatureId);
}

/** Sets a creature's stat block or icon (icons can be cleared) without opening the form. */
export const setImage = mutation({
  args: {
    creatureId: v.id("creatures"),
    kind: v.union(v.literal("statBlock"), v.literal("icon")),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { creatureId, kind, storageId }) => {
    const creature = await requireOwnedCreature(ctx, creatureId);
    if (kind === "statBlock") {
      if (creature.kind === "hero") {
        throw new ConvexError("Heroes don't have stat blocks");
      }
      if (storageId === undefined) {
        throw new ConvexError(
          "Adversaries need a stat block; replace it instead",
        );
      }
    }
    await ctx.db.patch("creatures", creatureId, {
      [kind === "statBlock" ? "statBlockId" : "iconId"]: storageId,
    });
  },
});
