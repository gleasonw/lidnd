import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { drawSteelPlan, setup } from "../testing/convexSetup";

const page = {
  width: 1700,
  height: 2200,
  columns: 2 as const,
  content: { left: 0.07, top: 0.05, right: 0.92, bottom: 0.85 },
  split: [
    { left: 0.07, top: 0.05, right: 0.49, bottom: 0.85 },
    { left: 0.49, top: 0.05, right: 0.92, bottom: 0.7 },
  ],
};

describe("stat block layouts", () => {
  test("a measured layout reaches the run, and an override survives re-measuring", async () => {
    const { alice } = await setup();
    const { planId } = await drawSteelPlan(alice);
    const runId = await alice.mutation(api.runs.start, { planId });
    const ogre = async () =>
      (await alice.query(api.runs.get, { runId }))!.participants.find(
        (p) => p.name === "Ogre",
      )!;
    const storageId = (await ogre()).statBlockId!;
    expect((await ogre()).statBlockLayout).toBeNull();

    await alice.mutation(api.files.saveStatBlockLayout, { storageId, ...page });
    expect((await ogre()).statBlockLayout).toEqual(page);

    await alice.mutation(api.files.setStatBlockColumns, {
      storageId,
      columns: 1,
    });
    await alice.mutation(api.files.saveStatBlockLayout, { storageId, ...page });
    expect((await ogre()).statBlockLayout?.columns).toBe(1);

    // Setting it back to what was detected clears the override.
    await alice.mutation(api.files.setStatBlockColumns, {
      storageId,
      columns: 2,
    });
    expect((await ogre()).statBlockLayout?.columns).toBe(2);
  });

  test("layouts are per owner", async () => {
    const { alice, bob } = await setup();
    const { planId } = await drawSteelPlan(alice);
    const runId = await alice.mutation(api.runs.start, { planId });
    const run = await alice.query(api.runs.get, { runId });
    const storageId = run!.participants.find(
      (p) => p.name === "Ogre",
    )!.statBlockId!;
    await bob.mutation(api.files.saveStatBlockLayout, {
      storageId,
      ...page,
      columns: 1,
      split: undefined,
    });
    const after = await alice.query(api.runs.get, { runId });
    expect(
      after!.participants.find((p) => p.name === "Ogre")!.statBlockLayout,
    ).toBeNull();
    await expect(
      alice.mutation(api.files.setStatBlockColumns, { storageId, columns: 1 }),
    ).rejects.toThrow("measured");
  });
});
