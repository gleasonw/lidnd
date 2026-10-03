import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { Id } from "../_generated/dataModel";
import { QueryCtx } from "../_generated/server";

export async function requireUserId(ctx: QueryCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new ConvexError("Not signed in");
  }
  return userId;
}

// Every function that touches campaign data goes through these checks.
// Missing and not-owned documents get the same error so ids can't be probed.
export async function requireOwnedCampaign(
  ctx: QueryCtx,
  campaignId: Id<"campaigns">,
) {
  const userId = await requireUserId(ctx);
  const campaign = await ctx.db.get("campaigns", campaignId);
  if (campaign === null || campaign.ownerId !== userId) {
    throw new ConvexError("Campaign not found");
  }
  return campaign;
}

export async function requireOwnedCreature(
  ctx: QueryCtx,
  creatureId: Id<"creatures">,
) {
  const userId = await requireUserId(ctx);
  const creature = await ctx.db.get("creatures", creatureId);
  if (creature === null || creature.ownerId !== userId) {
    throw new ConvexError("Creature not found");
  }
  return creature;
}

export async function requireOwnedPlan(ctx: QueryCtx, planId: Id<"plans">) {
  const plan = await ctx.db.get("plans", planId);
  if (plan === null) throw new ConvexError("Encounter not found");
  const campaign = await requireOwnedCampaign(ctx, plan.campaignId);
  return { plan, campaign };
}

export async function requireOwnedSession(
  ctx: QueryCtx,
  sessionId: Id<"sessions">,
) {
  const session = await ctx.db.get("sessions", sessionId);
  if (session === null) throw new ConvexError("Session not found");
  const campaign = await requireOwnedCampaign(ctx, session.campaignId);
  return { session, campaign };
}

export async function requireOwnedRun(ctx: QueryCtx, runId: Id<"runs">) {
  const run = await ctx.db.get("runs", runId);
  if (run === null) throw new ConvexError("Run not found");
  const campaign = await requireOwnedCampaign(ctx, run.campaignId);
  return { run, campaign };
}

/** Same as requireOwnedRun, but the run must still be in progress. */
export async function requireActiveRun(ctx: QueryCtx, runId: Id<"runs">) {
  const owned = await requireOwnedRun(ctx, runId);
  if (owned.run.endedAt !== undefined) {
    throw new ConvexError("This run has ended");
  }
  return owned;
}

export async function requireActiveRunParticipant(
  ctx: QueryCtx,
  participantId: Id<"runParticipants">,
) {
  const participant = await ctx.db.get("runParticipants", participantId);
  if (participant === null || participant.removed) {
    throw new ConvexError("Participant not found");
  }
  const owned = await requireActiveRun(ctx, participant.runId);
  return { participant, ...owned };
}
