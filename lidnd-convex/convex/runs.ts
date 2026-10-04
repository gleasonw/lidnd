import { ConvexError, v } from "convex/values";
import * as drawSteel from "../rules/drawSteel";
import * as dnd5e from "../rules/dnd5e";
import {
  applyDamage,
  applyHealing,
  gainTemporary,
  isDefeated,
  isWinded,
} from "../rules/hp";
import { Doc, Id } from "./_generated/dataModel";
import { mutation, MutationCtx, query, QueryCtx } from "./_generated/server";
import { imageUrl, statBlockLayout } from "./files";
import {
  requireActiveRun,
  requireActiveRunParticipant,
  requireOwnedCampaign,
  requireOwnedCreature,
  requireOwnedPlan,
} from "./lib/auth";
import { applyChanges, Change, deleteRunLog, RunLog } from "./lib/runLog";
import { combatSide, side } from "./schema";
import { activeSession } from "./sessions";

// Loading

async function runParticipants(ctx: QueryCtx, runId: Id<"runs">) {
  const rows = await ctx.db
    .query("runParticipants")
    .withIndex("by_runId", (q) => q.eq("runId", runId))
    .take(500);
  return rows.filter((p) => !p.removed);
}

async function runTurnGroups(ctx: QueryCtx, runId: Id<"runs">) {
  return await ctx.db
    .query("runTurnGroups")
    .withIndex("by_runId", (q) => q.eq("runId", runId))
    .take(100);
}

const heroCount = (participants: Doc<"runParticipants">[]) =>
  participants.filter((p) => p.kind === "hero").length;

const toInitiative = (p: Doc<"runParticipants">) => ({
  id: p._id as string,
  initiative: p.initiative,
  createdAt: p._creationTime,
  defeated: isDefeated(p),
});

export const get = query({
  args: { runId: v.string() },
  handler: async (ctx, args) => {
    const runId = ctx.db.normalizeId("runs", args.runId);
    const run = runId && (await ctx.db.get("runs", runId));
    if (!run) return null;
    const campaign = await requireOwnedCampaign(ctx, run.campaignId);

    const effects = (
      await ctx.db
        .query("runEffects")
        .withIndex("by_runId", (q) => q.eq("runId", run._id))
        .take(500)
    ).filter((e) => !e.removed);
    const participants = await Promise.all(
      (await runParticipants(ctx, run._id)).map(async (p) => ({
        ...p,
        defeated: isDefeated(p),
        winded: isWinded(p),
        minionsAlive:
          p.kind === "minion"
            ? drawSteel.minionsAlive(p.hp, p.maxHp)
            : undefined,
        effects: effects.filter((e) => e.participantId === p._id),
        iconUrl: await imageUrl(ctx, p.iconId),
        statBlockUrl: await imageUrl(ctx, p.statBlockId),
        statBlockLayout: await statBlockLayout(
          ctx,
          campaign.ownerId,
          p.statBlockId,
        ),
      })),
    );
    const images = await ctx.db
      .query("planImages")
      .withIndex("by_planId", (q) => q.eq("planId", run.planId))
      .take(100);
    const lastDone = await ctx.db
      .query("runActions")
      .withIndex("by_runId_and_undone", (q) =>
        q.eq("runId", run._id).eq("undone", false),
      )
      .order("desc")
      .first();
    const nextRedo = await ctx.db
      .query("runActions")
      .withIndex("by_runId_and_undone", (q) =>
        q.eq("runId", run._id).eq("undone", true),
      )
      .first();

    return {
      run,
      campaign,
      session: await ctx.db.get("sessions", run.sessionId),
      participants,
      turnGroups: await runTurnGroups(ctx, run._id),
      reminders: (
        await ctx.db
          .query("runReminders")
          .withIndex("by_runId", (q) => q.eq("runId", run._id))
          .take(100)
      ).sort((a, b) => a.round - b.round),
      images: await Promise.all(
        images.map(async (image) => ({
          ...image,
          url: await imageUrl(ctx, image.storageId),
          layout:
            image.kind === "statBlock"
              ? await statBlockLayout(ctx, campaign.ownerId, image.storageId)
              : null,
        })),
      ),
      undoLabel: lastDone?.label ?? null,
      redoLabel: nextRedo?.label ?? null,
    };
  },
});

/** Runs still in progress in a campaign, for resuming. */
export const listUnfinished = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    await requireOwnedCampaign(ctx, campaignId);
    return await ctx.db
      .query("runs")
      .withIndex("by_campaignId_and_endedAt", (q) =>
        q.eq("campaignId", campaignId).eq("endedAt", undefined),
      )
      .take(20);
  },
});

// Starting and ending

function snapshot(
  creature: Doc<"creatures">,
  fields: {
    runId: Id<"runs">;
    side: Doc<"runParticipants">["side"];
    name: string;
    minionCount?: number;
    turnGroupId?: Id<"runTurnGroups">;
  },
) {
  const { minionCount, ...rest } = fields;
  return {
    ...rest,
    creatureId: creature._id,
    kind: creature.kind,
    challenge: creature.challenge,
    // For minion squads, maxHp is Stamina per minion and hp is the shared pool.
    maxHp: creature.maxHp,
    hp:
      creature.kind === "minion"
        ? drawSteel.squadPool(minionCount ?? 0, creature.maxHp)
        : creature.maxHp,
    tempHp: 0,
    plannedMinionCount: minionCount,
    initiative: 0,
    acted: false,
    iconId: creature.iconId,
    statBlockId: creature.statBlockId,
  };
}

/** "Goblin 1", "Goblin 2" when a plan has several of the same creature. */
function instanceNames(rows: { creatureId: string; name: string }[]) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.creatureId, (totals.get(row.creatureId) ?? 0) + 1);
  }
  const seen = new Map<string, number>();
  return rows.map((row) => {
    if (totals.get(row.creatureId) === 1) return row.name;
    const n = (seen.get(row.creatureId) ?? 0) + 1;
    seen.set(row.creatureId, n);
    return `${row.name} ${n}`;
  });
}

export const start = mutation({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    const { plan, campaign } = await requireOwnedPlan(ctx, planId);
    const session = await activeSession(ctx, campaign._id);
    if (session === null) {
      throw new ConvexError("Start a session before running an encounter");
    }

    const rows = await ctx.db
      .query("planParticipants")
      .withIndex("by_planId", (q) => q.eq("planId", planId))
      .take(500);
    const withCreatures = (
      await Promise.all(
        rows.map(async (row) => {
          const creature = await ctx.db.get("creatures", row.creatureId);
          return creature && { row, creature };
        }),
      )
    ).filter((x) => x !== null);
    if (withCreatures.length === 0) {
      throw new ConvexError("Add someone to the roster first");
    }

    const isDrawSteel = campaign.system === "drawSteel";
    const heroes = withCreatures.filter((x) => x.creature.kind === "hero");
    const startingBudget = isDrawSteel
      ? drawSteel.budget({
          level: campaign.partyLevel,
          heroCount: heroes.length,
          allyCount: withCreatures.filter(
            ({ row, creature }) =>
              creature.kind !== "hero" && row.side === "ally",
          ).length,
          victories: session.victories,
        })
      : null;
    const startingDifficulty = startingBudget
      ? drawSteel.difficulty(
          drawSteel.totalEV(
            withCreatures.map(({ row, creature }) => ({
              kind: creature.kind,
              side: row.side,
              ev: creature.challenge,
              minionCount: row.minionCount,
              creatureId: creature._id,
            })),
          ),
          startingBudget,
        )
      : undefined;
    const runId = await ctx.db.insert("runs", {
      campaignId: campaign._id,
      planId,
      sessionId: session._id,
      name: plan.name,
      notes: plan.notes,
      ...(startingDifficulty !== undefined && { startingDifficulty }),
      startedAt: Date.now(),
      // 5e starts in initiative setup (round 0).
      round: isDrawSteel ? 1 : 0,
      malice: isDrawSteel
        ? drawSteel.initialMalice(heroes.length, session.victories)
        : 0,
    });

    const groupIds = new Map<string, Id<"runTurnGroups">>();
    if (isDrawSteel) {
      const groups = await ctx.db
        .query("turnGroups")
        .withIndex("by_planId", (q) => q.eq("planId", planId))
        .take(50);
      for (const group of groups) {
        groupIds.set(
          group._id,
          await ctx.db.insert("runTurnGroups", {
            runId,
            name: group.name,
            color: group.color,
            acted: false,
          }),
        );
      }
    }

    const names = instanceNames(
      withCreatures.map(({ creature }) => ({
        creatureId: creature._id,
        name: creature.name,
      })),
    );
    for (const [i, { row, creature }] of withCreatures.entries()) {
      await ctx.db.insert("runParticipants", {
        ...snapshot(creature, {
          runId,
          side: row.side,
          name: names[i],
          minionCount: creature.kind === "minion" ? row.minionCount : undefined,
          turnGroupId: row.turnGroupId && groupIds.get(row.turnGroupId),
        }),
        removed: false,
      });
    }

    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_planId", (q) => q.eq("planId", planId))
      .take(100);
    for (const r of reminders) {
      await ctx.db.insert("runReminders", {
        runId,
        text: r.text,
        round: r.round,
      });
    }
    return runId;
  },
});

// Undo history isn't kept after the run ends; the final state is.
export const end = mutation({
  args: { runId: v.id("runs"), victoriesAwarded: v.optional(v.number()) },
  handler: async (ctx, { runId, victoriesAwarded }) => {
    const { run, campaign } = await requireActiveRun(ctx, runId);
    const isDrawSteel = campaign.system === "drawSteel";
    if (victoriesAwarded !== undefined) {
      if (!isDrawSteel)
        throw new ConvexError("Victories are only used in Draw Steel");
      if (!Number.isSafeInteger(victoriesAwarded) || victoriesAwarded < 0) {
        throw new ConvexError(
          "Victory award must be a non-negative whole number",
        );
      }
    }
    // Older clients may omit the award. Ending alone never implies success.
    const award = victoriesAwarded ?? 0;
    if (isDrawSteel) {
      const session = await ctx.db.get("sessions", run.sessionId);
      if (session === null || session.endedAt !== undefined) {
        throw new ConvexError("This run's session is no longer active");
      }
      if (!Number.isSafeInteger(session.victories + award)) {
        throw new ConvexError("Victory total is too large");
      }
      await ctx.db.patch("sessions", session._id, {
        victories: session.victories + award,
      });
    }
    await ctx.db.patch("runs", runId, {
      endedAt: Date.now(),
      ...(isDrawSteel && { victoriesAwarded: award }),
    });
    await deleteRunLog(ctx, runId);
  },
});

export const updateNotes = mutation({
  args: { runId: v.id("runs"), notes: v.string() },
  handler: async (ctx, { runId, notes }) => {
    await requireActiveRun(ctx, runId);
    await ctx.db.patch("runs", runId, { notes });
  },
});

// Undo and redo

export const undo = mutation({
  args: { runId: v.id("runs") },
  handler: async (ctx, { runId }) => {
    await requireActiveRun(ctx, runId);
    const action = await ctx.db
      .query("runActions")
      .withIndex("by_runId_and_undone", (q) =>
        q.eq("runId", runId).eq("undone", false),
      )
      .order("desc")
      .first();
    if (action === null) return null;
    await applyChanges(ctx, action.changes as Change[], "before");
    await ctx.db.patch("runActions", action._id, { undone: true });
    return action.label;
  },
});

export const redo = mutation({
  args: { runId: v.id("runs") },
  handler: async (ctx, { runId }) => {
    await requireActiveRun(ctx, runId);
    // New actions clear the redo stack, so undone actions are always the
    // most recent ones; redo the oldest of them.
    const action = await ctx.db
      .query("runActions")
      .withIndex("by_runId_and_undone", (q) =>
        q.eq("runId", runId).eq("undone", true),
      )
      .first();
    if (action === null) return null;
    await applyChanges(ctx, action.changes as Change[], "after");
    await ctx.db.patch("runActions", action._id, { undone: false });
    return action.label;
  },
});

// HP

function requireTracked(p: Doc<"runParticipants">) {
  if (p.kind === "hero") {
    throw new ConvexError("LiDnD doesn't track player-character HP");
  }
}

function validateAmount(amount: number) {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new ConvexError("Enter a whole number, 0 or more");
  }
}

export const damage = mutation({
  args: {
    participantId: v.id("runParticipants"),
    amount: v.number(),
    /** Minion squads only: how many minions an area effect hit. */
    minionsInArea: v.optional(v.number()),
  },
  handler: async (ctx, { participantId, amount, minionsInArea }) => {
    const { participant: p, run } = await requireActiveRunParticipant(
      ctx,
      participantId,
    );
    requireTracked(p);
    validateAmount(amount);
    const log = new RunLog(ctx, run._id);
    if (p.kind !== "minion") {
      await log.patch("runParticipants", p._id, applyDamage(p, amount));
      await log.commit(`${amount} damage to ${p.name}`);
      return;
    }
    if (minionsInArea !== undefined) validateAmount(minionsInArea);
    const pool = drawSteel.damageSquad({
      pool: p.hp,
      staminaPerMinion: p.maxHp,
      damage: amount,
      minionsInArea,
    });
    const slain =
      drawSteel.minionsAlive(p.hp, p.maxHp) -
      drawSteel.minionsAlive(pool, p.maxHp);
    await log.patch("runParticipants", p._id, { hp: pool });
    await log.commit(
      `${amount} ${minionsInArea !== undefined ? "area " : ""}damage to ${p.name} (${slain} slain)`,
    );
  },
});

export const heal = mutation({
  args: { participantId: v.id("runParticipants"), amount: v.number() },
  handler: async (ctx, { participantId, amount }) => {
    const { participant: p, run } = await requireActiveRunParticipant(
      ctx,
      participantId,
    );
    requireTracked(p);
    validateAmount(amount);
    if (p.kind === "minion") {
      throw new ConvexError("Minions can't regain Stamina");
    }
    const log = new RunLog(ctx, run._id);
    await log.patch("runParticipants", p._id, {
      hp: applyHealing(p.hp, p.maxHp, amount),
    });
    await log.commit(`Heal ${p.name} ${amount}`);
  },
});

/**
 * Temporary Stamina: a new grant gives the greater of the current and new
 * amounts. Minions can't gain temporary Stamina.
 */
export const gainTempHp = mutation({
  args: { participantId: v.id("runParticipants"), amount: v.number() },
  handler: async (ctx, { participantId, amount }) => {
    const { participant: p, run } = await requireActiveRunParticipant(
      ctx,
      participantId,
    );
    requireTracked(p);
    validateAmount(amount);
    if (p.kind === "minion") {
      throw new ConvexError("Minions can't gain temporary Stamina");
    }
    const log = new RunLog(ctx, run._id);
    await log.patch("runParticipants", p._id, {
      tempHp: gainTemporary(p.tempHp, amount),
    });
    await log.commit(`${p.name} gains ${amount} temporary Stamina`);
  },
});

/**
 * Direct corrections. For minion squads, `hp` is the shared pool and
 * `minionCount` resets the pool to that many full-Stamina minions.
 */
export const setHealth = mutation({
  args: {
    participantId: v.id("runParticipants"),
    hp: v.optional(v.number()),
    tempHp: v.optional(v.number()),
    minionCount: v.optional(v.number()),
  },
  handler: async (ctx, { participantId, hp, tempHp, minionCount }) => {
    const { participant: p, run } = await requireActiveRunParticipant(
      ctx,
      participantId,
    );
    requireTracked(p);
    for (const value of [hp, tempHp, minionCount]) {
      if (value !== undefined) validateAmount(value);
    }
    const isMinion = p.kind === "minion";
    if (isMinion && tempHp !== undefined) {
      throw new ConvexError("Minions can't gain temporary Stamina");
    }
    const maxPool = drawSteel.squadPool(drawSteel.MAX_SQUAD_SIZE, p.maxHp);
    const log = new RunLog(ctx, run._id);
    await log.patch("runParticipants", p._id, {
      ...(hp !== undefined && {
        hp: Math.min(hp, isMinion ? maxPool : p.maxHp),
      }),
      ...(tempHp !== undefined && { tempHp }),
      ...(isMinion &&
        minionCount !== undefined && {
          hp: drawSteel.squadPool(
            Math.min(minionCount, drawSteel.MAX_SQUAD_SIZE),
            p.maxHp,
          ),
        }),
    });
    await log.commit(`Set ${p.name}'s Stamina`);
  },
});

// Effects

export const addEffect = mutation({
  args: {
    participantId: v.id("runParticipants"),
    name: v.string(),
    duration: v.string(),
    saveDc: v.optional(v.number()),
  },
  handler: async (ctx, { participantId, name, duration, saveDc }) => {
    const { participant, run, campaign } = await requireActiveRunParticipant(
      ctx,
      participantId,
    );
    if (name.trim() === "") throw new ConvexError("Effect name is required");
    const log = new RunLog(ctx, run._id);
    await log.insert("runEffects", {
      runId: run._id,
      participantId,
      name: name.trim(),
      duration: duration.trim(),
      saveDc: campaign.system === "dnd5e" ? saveDc : undefined,
    });
    await log.commit(`${name.trim()} on ${participant.name}`);
  },
});

export const removeEffect = mutation({
  args: { effectId: v.id("runEffects") },
  handler: async (ctx, { effectId }) => {
    const effect = await ctx.db.get("runEffects", effectId);
    if (effect === null || effect.removed) return;
    const { participant, run } = await requireActiveRunParticipant(
      ctx,
      effect.participantId,
    );
    const log = new RunLog(ctx, run._id);
    await log.patch("runEffects", effectId, { removed: true });
    await log.commit(`Remove ${effect.name} from ${participant.name}`);
  },
});

// Draw Steel turns, rounds, malice, and victories

async function advanceRound(ctx: MutationCtx, log: RunLog, run: Doc<"runs">) {
  const participants = await runParticipants(ctx, run._id);
  for (const p of participants.filter((p) => p.acted)) {
    await log.patch("runParticipants", p._id, { acted: false });
  }
  for (const g of (await runTurnGroups(ctx, run._id)).filter((g) => g.acted)) {
    await log.patch("runTurnGroups", g._id, { acted: false });
  }
  const round = run.round + 1;
  await log.patch("runs", run._id, {
    round,
    malice: run.malice + drawSteel.roundMalice(heroCount(participants), round),
  });
  return round;
}

/** Toggles an acted marker; marking the last one starts the next round. */
export const toggleActed = mutation({
  args: { participantId: v.id("runParticipants") },
  handler: async (ctx, { participantId }) => {
    const { participant, run, campaign } = await requireActiveRunParticipant(
      ctx,
      participantId,
    );
    if (campaign.system !== "drawSteel") {
      throw new ConvexError("Acted markers are for Draw Steel");
    }
    const log = new RunLog(ctx, run._id);
    const group = participant.turnGroupId
      ? await ctx.db.get("runTurnGroups", participant.turnGroupId)
      : null;
    const acted = !(group ? group.acted : participant.acted);
    if (group) {
      await log.patch("runTurnGroups", group._id, { acted });
    } else {
      await log.patch("runParticipants", participant._id, { acted });
    }
    const who = group?.name ?? participant.name;

    const participants = await runParticipants(ctx, run._id);
    const groups = await runTurnGroups(ctx, run._id);
    const roundOver = drawSteel.allActed(
      participants.map((p) => ({
        id: p._id,
        acted: p.acted,
        turnGroupId: p.turnGroupId,
        defeated: isDefeated(p),
      })),
      groups.map((g) => ({ id: g._id, acted: g.acted })),
    );
    if (acted && roundOver) {
      const round = await advanceRound(ctx, log, run);
      await log.commit(`${who} acted · round ${round}`);
    } else {
      await log.commit(acted ? `${who} acted` : `${who} hasn't acted`);
    }
  },
});

export const nextRound = mutation({
  args: { runId: v.id("runs") },
  handler: async (ctx, { runId }) => {
    const { run, campaign } = await requireActiveRun(ctx, runId);
    if (campaign.system !== "drawSteel") {
      throw new ConvexError("Use next turn in D&D 5e");
    }
    const log = new RunLog(ctx, runId);
    const round = await advanceRound(ctx, log, run);
    await log.commit(`Start round ${round}`);
  },
});

/**
 * Records who goes first (Heroes, "Determine Who Goes First"). The side that
 * acts first in round 1 goes first every round. Undoable.
 */
export const setFirstSide = mutation({
  args: {
    runId: v.id("runs"),
    side: combatSide,
    /** The d10 roll, if one was made (none when a side is surprised). */
    roll: v.optional(v.number()),
  },
  handler: async (ctx, { runId, side, roll }) => {
    const { campaign } = await requireActiveRun(ctx, runId);
    if (campaign.system !== "drawSteel") {
      throw new ConvexError("Who goes first is a Draw Steel rule");
    }
    if (
      roll !== undefined &&
      (!Number.isInteger(roll) || roll < 1 || roll > 10)
    ) {
      throw new ConvexError("A d10 roll is 1 to 10");
    }
    const log = new RunLog(ctx, runId);
    await log.patch("runs", runId, { firstSide: side, firstSideRoll: roll });
    await log.commit(
      side === "heroes" ? "Heroes go first" : "Enemies go first",
    );
  },
});

export const adjustMalice = mutation({
  args: { runId: v.id("runs"), delta: v.number() },
  handler: async (ctx, { runId, delta }) => {
    const { run } = await requireActiveRun(ctx, runId);
    if (!Number.isInteger(delta)) throw new ConvexError("Enter a whole number");
    const log = new RunLog(ctx, runId);
    const malice = Math.max(0, run.malice + delta);
    await log.patch("runs", runId, { malice });
    await log.commit(`Malice ${malice}`);
  },
});

export const setVictories = mutation({
  args: { runId: v.id("runs"), victories: v.number() },
  handler: async (ctx, { runId, victories }) => {
    const { run } = await requireActiveRun(ctx, runId);
    if (!Number.isInteger(victories) || victories < 0) {
      throw new ConvexError("Victories must be a whole number, 0 or more");
    }
    const log = new RunLog(ctx, runId);
    await log.patch("sessions", run.sessionId, { victories });
    await log.commit(`Victories ${victories}`);
  },
});

// 5e initiative and turns

export const setInitiative = mutation({
  args: { participantId: v.id("runParticipants"), initiative: v.number() },
  handler: async (ctx, { participantId, initiative }) => {
    const { participant, run } = await requireActiveRunParticipant(
      ctx,
      participantId,
    );
    if (!Number.isFinite(initiative)) throw new ConvexError("Enter a number");
    const log = new RunLog(ctx, run._id);
    await log.patch("runParticipants", participantId, { initiative });
    await log.commit(`${participant.name}'s initiative ${initiative}`);
  },
});

export const beginCombat = mutation({
  args: { runId: v.id("runs") },
  handler: async (ctx, { runId }) => {
    const { run } = await requireActiveRun(ctx, runId);
    if (run.round !== 0) return;
    const order = dnd5e.initiativeOrder(
      (await runParticipants(ctx, runId)).map(toInitiative),
    );
    const first = order.find((p) => !p.defeated) ?? order[0];
    if (!first) throw new ConvexError("Add someone to the roster first");
    const log = new RunLog(ctx, runId);
    await log.patch("runs", runId, {
      round: 1,
      currentParticipantId: first.id as Id<"runParticipants">,
    });
    await log.commit("Begin combat");
  },
});

async function moveTurn(
  ctx: MutationCtx,
  runId: Id<"runs">,
  direction: "next" | "previous",
) {
  const { run } = await requireActiveRun(ctx, runId);
  if (run.round === 0) throw new ConvexError("Begin combat first");
  const participants = (await runParticipants(ctx, runId)).map(toInitiative);
  const move = direction === "next" ? dnd5e.nextTurn : dnd5e.previousTurn;
  const turn = move(participants, {
    currentId: run.currentParticipantId,
    round: run.round,
  });
  const log = new RunLog(ctx, runId);
  await log.patch("runs", runId, {
    round: turn.round,
    currentParticipantId: turn.currentId as Id<"runParticipants">,
  });
  const name = (
    await ctx.db.get("runParticipants", turn.currentId as Id<"runParticipants">)
  )?.name;
  await log.commit(`${name}'s turn`);
}

export const nextTurn = mutation({
  args: { runId: v.id("runs") },
  handler: async (ctx, { runId }) => moveTurn(ctx, runId, "next"),
});

export const previousTurn = mutation({
  args: { runId: v.id("runs") },
  handler: async (ctx, { runId }) => moveTurn(ctx, runId, "previous"),
});

export const setCurrent = mutation({
  args: { participantId: v.id("runParticipants") },
  handler: async (ctx, { participantId }) => {
    const { participant, run } = await requireActiveRunParticipant(
      ctx,
      participantId,
    );
    if (run.round === 0) throw new ConvexError("Begin combat first");
    const log = new RunLog(ctx, run._id);
    await log.patch("runs", run._id, { currentParticipantId: participantId });
    await log.commit(`${participant.name}'s turn`);
  },
});

// Roster changes during a run (never touch the plan)

export const addParticipant = mutation({
  args: {
    runId: v.id("runs"),
    creatureId: v.id("creatures"),
    side: v.optional(side),
    minionCount: v.optional(v.number()),
  },
  handler: async (ctx, { runId, creatureId, side, minionCount }) => {
    const { campaign } = await requireActiveRun(ctx, runId);
    const creature = await requireOwnedCreature(ctx, creatureId);
    if (creature.system !== campaign.system) {
      throw new ConvexError("That creature is for a different game system");
    }
    const sameCreature = (await runParticipants(ctx, runId)).filter(
      (p) => p.creatureId === creatureId,
    ).length;
    const log = new RunLog(ctx, runId);
    await log.insert(
      "runParticipants",
      snapshot(creature, {
        runId,
        side: creature.kind === "hero" ? "enemy" : (side ?? "enemy"),
        name:
          sameCreature > 0 && creature.kind !== "hero"
            ? `${creature.name} ${sameCreature + 1}`
            : creature.name,
        minionCount:
          creature.kind === "minion"
            ? Math.min(drawSteel.MAX_SQUAD_SIZE, Math.max(1, minionCount ?? 4))
            : undefined,
      }),
    );
    await log.commit(`Add ${creature.name}`);
  },
});

export const removeParticipant = mutation({
  args: { participantId: v.id("runParticipants") },
  handler: async (ctx, { participantId }) => {
    const { participant, run } = await requireActiveRunParticipant(
      ctx,
      participantId,
    );
    const log = new RunLog(ctx, run._id);
    if (run.currentParticipantId === participantId) {
      const others = (await runParticipants(ctx, run._id)).map(toInitiative);
      const turn = dnd5e.nextTurn(others, {
        currentId: participantId,
        round: run.round,
      });
      await log.patch("runs", run._id, {
        currentParticipantId:
          turn.currentId === participantId
            ? undefined
            : (turn.currentId as Id<"runParticipants">),
        round: turn.round,
      });
    }
    await log.patch("runParticipants", participantId, { removed: true });
    await log.commit(`Remove ${participant.name}`);
  },
});

// Reminders

export const dismissReminder = mutation({
  args: { reminderId: v.id("runReminders") },
  handler: async (ctx, { reminderId }) => {
    const reminder = await ctx.db.get("runReminders", reminderId);
    if (reminder === null) throw new ConvexError("Reminder not found");
    const { run } = await requireActiveRun(ctx, reminder.runId);
    const log = new RunLog(ctx, run._id);
    await log.patch("runReminders", reminderId, { dismissedRound: run.round });
    await log.commit("Dismiss reminder");
  },
});

// Stat blocks are prep data, not combat state: adding one mid-run also sets
// it on the creature so later runs have it. Not part of undo.
export const setStatBlock = mutation({
  args: {
    runId: v.id("runs"),
    creatureId: v.id("creatures"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { runId, creatureId, storageId }) => {
    await requireActiveRun(ctx, runId);
    const creature = await requireOwnedCreature(ctx, creatureId);
    if (creature.kind === "hero") {
      throw new ConvexError("Heroes don't have stat blocks");
    }
    await ctx.db.patch("creatures", creatureId, { statBlockId: storageId });
    for (const p of await runParticipants(ctx, runId)) {
      if (p.creatureId === creatureId) {
        await ctx.db.patch("runParticipants", p._id, {
          statBlockId: storageId,
        });
      }
    }
  },
});
