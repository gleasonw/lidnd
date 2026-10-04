import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { Client, drawSteelPlan, setup } from "../testing/convexSetup";

async function getRun(gm: Client, runId: Id<"runs">) {
  const state = await gm.query(api.runs.get, { runId });
  if (!state) throw new Error("run not found");
  const byName = (name: string) => {
    const p = state.participants.find((p) => p.name === name);
    if (!p) throw new Error(`no ${name}`);
    return p;
  };
  return { ...state, byName };
}

describe("draw steel runs", () => {
  test("starting difficulty is preserved when victories, party level, or the roster change", async () => {
    const { alice } = await setup();
    const { planId } = await drawSteelPlan(alice);
    const runId = await alice.mutation(api.runs.start, { planId });
    const before = await getRun(alice, runId);
    expect(before.run.startingDifficulty).toBe("easy");
    await alice.mutation(api.runs.setVictories, { runId, victories: 8 });
    await alice.mutation(api.campaigns.update, {
      campaignId: before.campaign._id,
      partyLevel: 5,
    });
    await alice.mutation(api.runs.removeParticipant, {
      participantId: before.byName("Ogre")._id,
    });
    expect((await getRun(alice, runId)).run.startingDifficulty).toBe("easy");
  });

  test.each([0, 1, 2, 3])(
    "ending records an editable award of %i per hero",
    async (award) => {
      const { alice } = await setup();
      const { planId } = await drawSteelPlan(alice, { victories: 2 });
      const runId = await alice.mutation(api.runs.start, { planId });
      await alice.mutation(api.runs.end, { runId, victoriesAwarded: award });
      const ended = await getRun(alice, runId);
      expect(ended.run.victoriesAwarded).toBe(award);
      expect(ended.session?.victories).toBe(2 + award);
      await expect(
        alice.mutation(api.runs.end, { runId, victoriesAwarded: award }),
      ).rejects.toThrow("ended");
      expect((await getRun(alice, runId)).session?.victories).toBe(2 + award);
    },
  );

  test("invalid and unauthorized awards leave the run and session unchanged", async () => {
    const { alice, bob } = await setup();
    const { planId } = await drawSteelPlan(alice);
    const runId = await alice.mutation(api.runs.start, { planId });
    for (const award of [-1, 0.5]) {
      await expect(
        alice.mutation(api.runs.end, { runId, victoriesAwarded: award }),
      ).rejects.toThrow("whole number");
    }
    await expect(
      bob.mutation(api.runs.end, { runId, victoriesAwarded: 2 }),
    ).rejects.toThrow("Campaign not found");
    const state = await getRun(alice, runId);
    expect(state.run.endedAt).toBeUndefined();
    expect(state.session?.victories).toBe(0);
  });

  test("older runs can end with a manually chosen award", async () => {
    const { alice, t } = await setup();
    const { planId } = await drawSteelPlan(alice);
    const runId = await alice.mutation(api.runs.start, { planId });
    await t.run((ctx) =>
      ctx.db.patch("runs", runId, { startingDifficulty: undefined }),
    );
    await alice.mutation(api.runs.end, { runId, victoriesAwarded: 2 });
    const state = await getRun(alice, runId);
    expect(state.run.startingDifficulty).toBeUndefined();
    expect(state.run.victoriesAwarded).toBe(2);
    expect(state.session?.victories).toBe(2);
  });

  test("older clients ending a run do not implicitly award Victories", async () => {
    const { alice } = await setup();
    const { planId } = await drawSteelPlan(alice, { victories: 3 });
    const runId = await alice.mutation(api.runs.start, { planId });
    await alice.mutation(api.runs.end, { runId });
    const state = await getRun(alice, runId);
    expect(state.session?.victories).toBe(3);
    expect(state.run.victoriesAwarded).toBe(0);
  });

  test("5e runs have no Victory suggestion or award", async () => {
    const { alice, t } = await setup();
    const { planId, campaignId } = await drawSteelPlan(alice);
    await t.run((ctx) =>
      ctx.db.patch("campaigns", campaignId, { system: "dnd5e" }),
    );
    const runId = await alice.mutation(api.runs.start, { planId });
    expect((await getRun(alice, runId)).run.startingDifficulty).toBeUndefined();
    await expect(
      alice.mutation(api.runs.end, { runId, victoriesAwarded: 1 }),
    ).rejects.toThrow("only used in Draw Steel");
    await alice.mutation(api.runs.end, { runId });
    const state = await getRun(alice, runId);
    expect(state.run.victoriesAwarded).toBeUndefined();
    expect(state.session?.victories).toBe(0);
  });

  test("start snapshots the roster and sets initial malice", async () => {
    const { alice } = await setup();
    const { planId } = await drawSteelPlan(alice, { victories: 2 });
    const runId = await alice.mutation(api.runs.start, { planId });
    const run = await getRun(alice, runId);
    expect(run.run.round).toBe(1);
    // 3 heroes + 2 victories + 1
    expect(run.run.malice).toBe(6);
    // Four 4-Stamina goblins share a 16-Stamina pool.
    expect(run.byName("Goblin")).toMatchObject({ hp: 16, minionsAlive: 4 });
    expect(run.byName("Ogre").hp).toBe(40);
  });

  test("marking the last turn advances the round once", async () => {
    const { alice } = await setup();
    const { planId } = await drawSteelPlan(alice, { victories: 3 });
    const runId = await alice.mutation(api.runs.start, { planId });
    let run = await getRun(alice, runId);
    const ids = run.participants.map((p) => p._id);

    for (const id of ids.slice(0, -1)) {
      await alice.mutation(api.runs.toggleActed, { participantId: id });
    }
    // Correcting a marker within the round doesn't award malice.
    await alice.mutation(api.runs.toggleActed, { participantId: ids[0] });
    await alice.mutation(api.runs.toggleActed, { participantId: ids[0] });
    run = await getRun(alice, runId);
    expect(run.run.round).toBe(1);
    expect(run.run.malice).toBe(7);

    await alice.mutation(api.runs.toggleActed, { participantId: ids.at(-1)! });
    run = await getRun(alice, runId);
    expect(run.run.round).toBe(2);
    // 7 + (3 heroes + round 2); victories only count at the start.
    expect(run.run.malice).toBe(12);
    expect(run.participants.every((p) => !p.acted)).toBe(true);
  });

  test("defeated adversaries don't hold up the round", async () => {
    const { alice } = await setup();
    const { planId } = await drawSteelPlan(alice);
    const runId = await alice.mutation(api.runs.start, { planId });
    let run = await getRun(alice, runId);
    await alice.mutation(api.runs.damage, {
      participantId: run.byName("Ogre")._id,
      amount: 100,
    });
    for (const p of run.participants.filter((p) => p.name !== "Ogre")) {
      await alice.mutation(api.runs.toggleActed, { participantId: p._id });
    }
    run = await getRun(alice, runId);
    expect(run.run.round).toBe(2);
  });

  test("minion squads share a Stamina pool, with undo/redo", async () => {
    const { alice } = await setup();
    const { planId } = await drawSteelPlan(alice);
    const runId = await alice.mutation(api.runs.start, { planId });
    let run = await getRun(alice, runId);
    const goblin = run.byName("Goblin")._id;

    // 3 damage to a 16 pool (4 Stamina each) kills nobody.
    await alice.mutation(api.runs.damage, { participantId: goblin, amount: 3 });
    run = await getRun(alice, runId);
    expect(run.byName("Goblin")).toMatchObject({ hp: 13, minionsAlive: 4 });

    // A single 6-damage hit drops the pool to 7: two more die.
    await alice.mutation(api.runs.damage, { participantId: goblin, amount: 6 });
    run = await getRun(alice, runId);
    expect(run.byName("Goblin")).toMatchObject({ hp: 7, minionsAlive: 2 });
    expect(run.undoLabel).toBe("6 damage to Goblin (2 slain)");

    await alice.mutation(api.runs.undo, { runId });
    run = await getRun(alice, runId);
    expect(run.byName("Goblin").hp).toBe(13);

    await alice.mutation(api.runs.redo, { runId });
    run = await getRun(alice, runId);
    expect(run.byName("Goblin").hp).toBe(7);
  });

  test("area damage only hurts minions in the area", async () => {
    const { alice } = await setup();
    const { planId } = await drawSteelPlan(alice);
    const runId = await alice.mutation(api.runs.start, { planId });
    let run = await getRun(alice, runId);
    const goblin = run.byName("Goblin")._id;
    // 10 area damage to one goblin can kill only that goblin.
    await alice.mutation(api.runs.damage, {
      participantId: goblin,
      amount: 10,
      minionsInArea: 1,
    });
    run = await getRun(alice, runId);
    expect(run.byName("Goblin")).toMatchObject({ hp: 12, minionsAlive: 3 });
  });

  test("minions can't heal or gain temporary Stamina", async () => {
    const { alice } = await setup();
    const { planId } = await drawSteelPlan(alice);
    const runId = await alice.mutation(api.runs.start, { planId });
    const run = await getRun(alice, runId);
    const goblin = run.byName("Goblin")._id;
    await expect(
      alice.mutation(api.runs.heal, { participantId: goblin, amount: 2 }),
    ).rejects.toThrow("regain");
    await expect(
      alice.mutation(api.runs.gainTempHp, { participantId: goblin, amount: 2 }),
    ).rejects.toThrow("temporary");
  });

  test("temporary Stamina takes the greater amount; winded at half", async () => {
    const { alice } = await setup();
    const { planId } = await drawSteelPlan(alice);
    const runId = await alice.mutation(api.runs.start, { planId });
    let run = await getRun(alice, runId);
    const ogre = run.byName("Ogre")._id;
    await alice.mutation(api.runs.gainTempHp, {
      participantId: ogre,
      amount: 10,
    });
    await alice.mutation(api.runs.gainTempHp, {
      participantId: ogre,
      amount: 5,
    });
    run = await getRun(alice, runId);
    expect(run.byName("Ogre").tempHp).toBe(10);
    await alice.mutation(api.runs.damage, { participantId: ogre, amount: 30 });
    run = await getRun(alice, runId);
    expect(run.byName("Ogre")).toMatchObject({
      hp: 20,
      tempHp: 0,
      winded: true,
    });
  });

  test("undo restores a round advance and its malice in one step", async () => {
    const { alice } = await setup();
    const { planId } = await drawSteelPlan(alice);
    const runId = await alice.mutation(api.runs.start, { planId });
    await alice.mutation(api.runs.nextRound, { runId });
    let run = await getRun(alice, runId);
    expect(run.run.round).toBe(2);
    await alice.mutation(api.runs.undo, { runId });
    run = await getRun(alice, runId);
    expect(run.run.round).toBe(1);
    expect(run.run.malice).toBe(4);
  });

  test("undo brings back a removed participant and its effects", async () => {
    const { alice } = await setup();
    const { planId } = await drawSteelPlan(alice);
    const runId = await alice.mutation(api.runs.start, { planId });
    let run = await getRun(alice, runId);
    const ogre = run.byName("Ogre")._id;
    await alice.mutation(api.runs.addEffect, {
      participantId: ogre,
      name: "Slowed",
      duration: "EoT",
    });
    await alice.mutation(api.runs.removeParticipant, { participantId: ogre });
    run = await getRun(alice, runId);
    expect(run.participants.some((p) => p._id === ogre)).toBe(false);
    await alice.mutation(api.runs.undo, { runId });
    run = await getRun(alice, runId);
    expect(run.byName("Ogre").effects.map((e) => e.name)).toEqual(["Slowed"]);
  });

  test("a new action clears redo", async () => {
    const { alice } = await setup();
    const { planId } = await drawSteelPlan(alice);
    const runId = await alice.mutation(api.runs.start, { planId });
    await alice.mutation(api.runs.adjustMalice, { runId, delta: 2 });
    await alice.mutation(api.runs.undo, { runId });
    await alice.mutation(api.runs.adjustMalice, { runId, delta: 1 });
    const run = await getRun(alice, runId);
    expect(run.redoLabel).toBeNull();
    expect(run.run.malice).toBe(5);
  });

  test("damage uses temp HP first and heroes have no HP", async () => {
    const { alice } = await setup();
    const { planId } = await drawSteelPlan(alice);
    const runId = await alice.mutation(api.runs.start, { planId });
    let run = await getRun(alice, runId);
    const ogre = run.byName("Ogre")._id;
    await alice.mutation(api.runs.setHealth, {
      participantId: ogre,
      tempHp: 5,
    });
    await alice.mutation(api.runs.damage, { participantId: ogre, amount: 8 });
    run = await getRun(alice, runId);
    expect(run.byName("Ogre")).toMatchObject({ hp: 37, tempHp: 0 });
    await expect(
      alice.mutation(api.runs.damage, {
        participantId: run.byName("Ana")._id,
        amount: 1,
      }),
    ).rejects.toThrow("player-character HP");
  });

  test("ended runs keep their state and reject changes", async () => {
    const { alice } = await setup();
    const { planId } = await drawSteelPlan(alice);
    const runId = await alice.mutation(api.runs.start, { planId });
    await alice.mutation(api.runs.end, { runId });
    const run = await getRun(alice, runId);
    expect(run.run.endedAt).toBeDefined();
    await expect(
      alice.mutation(api.runs.adjustMalice, { runId, delta: 1 }),
    ).rejects.toThrow("ended");
  });

  test("runs are private", async () => {
    const { alice, bob } = await setup();
    const { planId } = await drawSteelPlan(alice);
    const runId = await alice.mutation(api.runs.start, { planId });
    await expect(bob.query(api.runs.get, { runId })).rejects.toThrow();
    await expect(
      bob.mutation(api.runs.adjustMalice, { runId, delta: 1 }),
    ).rejects.toThrow();
  });
});

describe("5e turns", () => {
  test("begin combat, cycle turns, and wrap rounds", async () => {
    const { alice, storeImage } = await setup();
    const campaignId = await alice.mutation(api.campaigns.create, {
      name: "Tomb",
      system: "dnd5e",
      partyLevel: 3,
    });
    await alice.mutation(api.creatures.create, {
      campaignId,
      kind: "hero",
      name: "Ana",
      challenge: 0,
      maxHp: 0,
      campaignOnly: false,
    });
    const orc = await alice.mutation(api.creatures.create, {
      campaignId,
      kind: "standard",
      name: "Orc",
      challenge: 0.5,
      maxHp: 15,
      campaignOnly: false,
      statBlockId: await storeImage(),
    });
    const planId = await alice.mutation(api.plans.create, {
      campaignId,
      name: "Gate",
    });
    await alice.mutation(api.plans.addParticipant, { planId, creatureId: orc });
    await alice.mutation(api.sessions.start, {
      campaignId,
      name: "S1",
      victories: 0,
    });
    const runId = await alice.mutation(api.runs.start, { planId });
    let run = await getRun(alice, runId);
    expect(run.run.round).toBe(0);
    await alice.mutation(api.runs.setInitiative, {
      participantId: run.byName("Orc")._id,
      initiative: 15,
    });
    await alice.mutation(api.runs.setInitiative, {
      participantId: run.byName("Ana")._id,
      initiative: 12,
    });
    await alice.mutation(api.runs.beginCombat, { runId });
    run = await getRun(alice, runId);
    expect(run.run.currentParticipantId).toBe(run.byName("Orc")._id);
    await alice.mutation(api.runs.nextTurn, { runId });
    await alice.mutation(api.runs.nextTurn, { runId });
    run = await getRun(alice, runId);
    expect(run.run.round).toBe(2);
    expect(run.run.currentParticipantId).toBe(run.byName("Orc")._id);
  });
});

describe("deletion guards", () => {
  test("plans, creatures, and sessions with runs can't be deleted", async () => {
    const { alice } = await setup();
    const { planId, sessionId, ogre, campaignId } = await drawSteelPlan(alice);
    await alice.mutation(api.runs.start, { planId });
    await expect(alice.mutation(api.plans.remove, { planId })).rejects.toThrow(
      "can't be deleted",
    );
    await expect(
      alice.mutation(api.creatures.remove, { creatureId: ogre }),
    ).rejects.toThrow("can't be deleted");
    await expect(
      alice.mutation(api.sessions.remove, { sessionId }),
    ).rejects.toThrow("can't be deleted");
    await expect(
      alice.mutation(api.campaigns.remove, { campaignId }),
    ).rejects.toThrow("can't be deleted");
  });

  test("a creature used only by plans is removed from them", async () => {
    const { alice } = await setup();
    const { planId, ogre } = await drawSteelPlan(alice);
    await alice.mutation(api.creatures.remove, { creatureId: ogre });
    const plan = await alice.query(api.plans.get, { planId });
    expect(plan!.participants.some((p) => p.creatureId === ogre)).toBe(false);
  });

  test("running needs an active session", async () => {
    const { alice } = await setup();
    const { planId, sessionId } = await drawSteelPlan(alice);
    await alice.mutation(api.sessions.end, { sessionId });
    await expect(alice.mutation(api.runs.start, { planId })).rejects.toThrow(
      "Start a session",
    );
  });
});

describe("stat blocks", () => {
  test("adversaries need one; heroes can't have one", async () => {
    const { alice, storeImage } = await setup();
    const { campaignId, ogre } = await drawSteelPlan(alice);
    await expect(
      alice.mutation(api.creatures.create, {
        campaignId,
        kind: "standard",
        name: "Wolf",
        challenge: 4,
        maxHp: 10,
        campaignOnly: false,
      }),
    ).rejects.toThrow("stat block");
    await expect(
      alice.mutation(api.creatures.setImage, {
        creatureId: ogre,
        kind: "statBlock",
      }),
    ).rejects.toThrow("need a stat block");
    const hero = await alice.mutation(api.creatures.create, {
      campaignId,
      kind: "hero",
      name: "Dee",
      challenge: 0,
      maxHp: 0,
      campaignOnly: false,
      statBlockId: await storeImage(),
    });
    const { heroes } = await alice.query(api.creatures.listForCampaign, {
      campaignId,
    });
    expect(heroes.find((h) => h._id === hero)?.statBlockId).toBeUndefined();
  });
});

describe("who goes first", () => {
  test("record the first side, undoably", async () => {
    const { alice } = await setup();
    const { planId } = await drawSteelPlan(alice);
    const runId = await alice.mutation(api.runs.start, { planId });
    await alice.mutation(api.runs.setFirstSide, {
      runId,
      side: "enemies",
      roll: 4,
    });
    let run = await getRun(alice, runId);
    expect(run.run).toMatchObject({ firstSide: "enemies", firstSideRoll: 4 });
    await expect(
      alice.mutation(api.runs.setFirstSide, {
        runId,
        side: "heroes",
        roll: 11,
      }),
    ).rejects.toThrow("1 to 10");
    await alice.mutation(api.runs.undo, { runId });
    run = await getRun(alice, runId);
    expect(run.run.firstSide).toBeUndefined();
  });
});
