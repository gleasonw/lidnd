import { ConvexError, v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query, QueryCtx } from "./_generated/server";
import { requireOwnedCampaign, requireOwnedSession } from "./lib/auth";

/** The campaign's session in progress, if any. Only one at a time. */
export async function activeSession(
  ctx: QueryCtx,
  campaignId: Id<"campaigns">,
) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_campaignId_and_endedAt", (q) =>
      q.eq("campaignId", campaignId).eq("endedAt", undefined),
    )
    .first();
}

async function runsInSession(ctx: QueryCtx, sessionId: Id<"sessions">) {
  return await ctx.db
    .query("runs")
    .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
    .take(200);
}

export const list = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    await requireOwnedCampaign(ctx, campaignId);
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", campaignId))
      .order("desc")
      .take(200);
    return await Promise.all(
      sessions.map(async (session) => ({
        ...session,
        runCount: (await runsInSession(ctx, session._id)).length,
      })),
    );
  },
});

export const active = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    await requireOwnedCampaign(ctx, campaignId);
    return await activeSession(ctx, campaignId);
  },
});

export const get = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const sessionId = ctx.db.normalizeId("sessions", args.sessionId);
    const session = sessionId && (await ctx.db.get("sessions", sessionId));
    if (!session) return null;
    const campaign = await requireOwnedCampaign(ctx, session.campaignId);
    return {
      session,
      campaign,
      runs: (await runsInSession(ctx, session._id)).sort(
        (a, b) => a.startedAt - b.startedAt,
      ),
    };
  },
});

/** Defaults for the start-session form. */
export const startDefaults = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    await requireOwnedCampaign(ctx, campaignId);
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", campaignId))
      .order("desc")
      .take(200);
    return {
      name: `Session ${sessions.length + 1}`,
      // Offer the previous session's final count.
      victories: sessions[0]?.victories ?? 0,
    };
  },
});

function validateVictories(victories: number) {
  if (!Number.isInteger(victories) || victories < 0) {
    throw new ConvexError("Victories must be a whole number, 0 or more");
  }
}

export const start = mutation({
  args: {
    campaignId: v.id("campaigns"),
    name: v.string(),
    victories: v.number(),
  },
  handler: async (ctx, { campaignId, name, victories }) => {
    const campaign = await requireOwnedCampaign(ctx, campaignId);
    if (name.trim() === "") throw new ConvexError("Name is required");
    validateVictories(victories);
    if (await activeSession(ctx, campaignId)) {
      throw new ConvexError("End the current session before starting another");
    }
    return await ctx.db.insert("sessions", {
      campaignId,
      name: name.trim(),
      startedAt: Date.now(),
      victories: campaign.system === "drawSteel" ? victories : 0,
    });
  },
});

export const end = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const { session } = await requireOwnedSession(ctx, sessionId);
    if (session.endedAt !== undefined) return;
    const unfinished = (await runsInSession(ctx, sessionId)).filter(
      (r) => r.endedAt === undefined,
    );
    if (unfinished.length > 0) {
      throw new ConvexError(
        `End “${unfinished[0].name}” before ending the session`,
      );
    }
    await ctx.db.patch("sessions", sessionId, { endedAt: Date.now() });
  },
});

export const update = mutation({
  args: {
    sessionId: v.id("sessions"),
    name: v.optional(v.string()),
    victories: v.optional(v.number()),
  },
  handler: async (ctx, { sessionId, name, victories }) => {
    await requireOwnedSession(ctx, sessionId);
    if (name !== undefined && name.trim() === "") {
      throw new ConvexError("Name is required");
    }
    if (victories !== undefined) validateVictories(victories);
    await ctx.db.patch("sessions", sessionId, {
      ...(name !== undefined && { name: name.trim() }),
      ...(victories !== undefined && { victories }),
    });
  },
});

// A session with any runs can't be deleted.
export const remove = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const { session } = await requireOwnedSession(ctx, sessionId);
    const runs = await runsInSession(ctx, sessionId);
    if (runs.length > 0) {
      throw new ConvexError(
        `“${session.name}” has ${runs.length} run${runs.length === 1 ? "" : "s"} and can't be deleted`,
      );
    }
    await ctx.db.delete("sessions", sessionId);
  },
});
