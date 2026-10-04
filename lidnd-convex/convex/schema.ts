import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export const gameSystem = v.union(v.literal("drawSteel"), v.literal("dnd5e"));
export const creatureKind = v.union(
  v.literal("hero"),
  v.literal("standard"),
  v.literal("minion"),
);
export const side = v.union(v.literal("enemy"), v.literal("ally"));
export const combatSide = v.union(v.literal("heroes"), v.literal("enemies"));
export const targetDifficulty = v.union(
  v.literal("easy"),
  v.literal("standard"),
  v.literal("hard"),
);
export const imageKind = v.union(
  v.literal("reference"),
  v.literal("statBlock"),
);

export default defineSchema({
  ...authTables,

  campaigns: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    system: gameSystem,
    partyLevel: v.number(),
  }).index("by_ownerId", ["ownerId"]),

  // Heroes always belong to one campaign (the party). Adversaries are shared
  // across the owner's campaigns of the same system unless `campaignId` is set.
  creatures: defineTable({
    ownerId: v.id("users"),
    system: gameSystem,
    campaignId: v.optional(v.id("campaigns")),
    kind: creatureKind,
    name: v.string(),
    /** Draw Steel EV (for minions, per group of four) or 5e CR. */
    challenge: v.number(),
    /** Max HP; for minions, HP per minion. Unused for heroes. */
    maxHp: v.number(),
    iconId: v.optional(v.id("_storage")),
    statBlockId: v.optional(v.id("_storage")),
  })
    .index("by_ownerId_and_system", ["ownerId", "system"])
    .index("by_campaignId", ["campaignId"]),

  plans: defineTable({
    campaignId: v.id("campaigns"),
    name: v.string(),
    notes: v.string(),
    targetDifficulty,
  })
    .index("by_campaignId", ["campaignId"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["campaignId"],
    }),

  planParticipants: defineTable({
    planId: v.id("plans"),
    creatureId: v.id("creatures"),
    side,
    /** Planned minion count; only for minion creatures. */
    minionCount: v.optional(v.number()),
    turnGroupId: v.optional(v.id("turnGroups")),
  })
    .index("by_planId", ["planId"])
    .index("by_creatureId", ["creatureId"]),

  turnGroups: defineTable({
    planId: v.id("plans"),
    name: v.string(),
    /** Optional label color (hex); always shown alongside the name. */
    color: v.optional(v.string()),
  }).index("by_planId", ["planId"]),

  tags: defineTable({
    campaignId: v.id("campaigns"),
    name: v.string(),
  }).index("by_campaignId_and_name", ["campaignId", "name"]),

  planTags: defineTable({
    planId: v.id("plans"),
    tagId: v.id("tags"),
  })
    .index("by_planId", ["planId"])
    .index("by_tagId", ["tagId"]),

  planImages: defineTable({
    planId: v.id("plans"),
    storageId: v.id("_storage"),
    kind: imageKind,
  }).index("by_planId", ["planId"]),

  reminders: defineTable({
    planId: v.id("plans"),
    text: v.string(),
    /** Round to show on; 0 means every round. */
    round: v.number(),
  }).index("by_planId", ["planId"]),

  sessions: defineTable({
    campaignId: v.id("campaigns"),
    name: v.string(),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    /** Draw Steel victories. */
    victories: v.number(),
  })
    .index("by_campaignId", ["campaignId"])
    .index("by_campaignId_and_endedAt", ["campaignId", "endedAt"]),

  runs: defineTable({
    campaignId: v.id("campaigns"),
    planId: v.id("plans"),
    sessionId: v.id("sessions"),
    /** Plan name when the run started. */
    name: v.string(),
    notes: v.string(),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    /** 0 is 5e's initiative setup before the first turn. */
    round: v.number(),
    /** Draw Steel. */
    malice: v.number(),
    /** Draw Steel difficulty when the run started; absent on older runs. */
    startingDifficulty: v.optional(
      v.union(
        v.literal("trivial"),
        v.literal("easy"),
        v.literal("standard"),
        v.literal("hard"),
        v.literal("extreme"),
      ),
    ),
    /** Draw Steel Victories awarded per hero when ending the run. */
    victoriesAwarded: v.optional(v.number()),
    /** Draw Steel: the side that goes first, every round. Unset until chosen. */
    firstSide: v.optional(combatSide),
    /** Draw Steel: the d10 rolled to decide who chooses the first side. */
    firstSideRoll: v.optional(v.number()),
    /** 5e. */
    currentParticipantId: v.optional(v.id("runParticipants")),
  })
    .index("by_planId", ["planId"])
    .index("by_sessionId", ["sessionId"])
    .index("by_campaignId_and_endedAt", ["campaignId", "endedAt"]),

  // Run tables snapshot creature values when the run starts. Rows are
  // soft-removed so undo can restore them with the same id.
  runParticipants: defineTable({
    runId: v.id("runs"),
    creatureId: v.id("creatures"),
    removed: v.boolean(),
    name: v.string(),
    kind: creatureKind,
    side,
    challenge: v.number(),
    maxHp: v.number(),
    /** For minion squads, the shared Stamina pool. */
    hp: v.number(),
    tempHp: v.number(),
    plannedMinionCount: v.optional(v.number()),
    initiative: v.number(),
    acted: v.boolean(),
    turnGroupId: v.optional(v.id("runTurnGroups")),
    iconId: v.optional(v.id("_storage")),
    statBlockId: v.optional(v.id("_storage")),
  })
    .index("by_runId", ["runId"])
    .index("by_creatureId", ["creatureId"]),

  runTurnGroups: defineTable({
    runId: v.id("runs"),
    name: v.string(),
    color: v.optional(v.string()),
    acted: v.boolean(),
  }).index("by_runId", ["runId"]),

  runEffects: defineTable({
    runId: v.id("runs"),
    participantId: v.id("runParticipants"),
    removed: v.boolean(),
    name: v.string(),
    duration: v.string(),
    saveDc: v.optional(v.number()),
  }).index("by_runId", ["runId"]),

  runReminders: defineTable({
    runId: v.id("runs"),
    text: v.string(),
    round: v.number(),
    /** The round it was last dismissed in. */
    dismissedRound: v.optional(v.number()),
  }).index("by_runId", ["runId"]),

  // Undo log for the active run. Each entry records the fields it changed on
  // each document, before and after. Undone entries are the redo stack.
  runActions: defineTable({
    runId: v.id("runs"),
    label: v.string(),
    changes: v.array(
      v.object({
        table: v.string(),
        id: v.string(),
        before: v.any(),
        after: v.any(),
      }),
    ),
    undone: v.boolean(),
  }).index("by_runId_and_undone", ["runId", "undone"]),
});
