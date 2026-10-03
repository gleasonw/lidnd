import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { setup } from "../testing/convexSetup";

describe("campaigns", () => {
  test("owners can create, list, update, and delete", async () => {
    const { alice } = await setup();
    const campaignId = await alice.mutation(api.campaigns.create, {
      name: "  Ashes  ",
      system: "drawSteel",
      partyLevel: 3,
    });
    expect(await alice.query(api.campaigns.list)).toMatchObject([
      { name: "Ashes", system: "drawSteel", partyLevel: 3 },
    ]);

    await alice.mutation(api.campaigns.update, { campaignId, partyLevel: 4 });
    expect(await alice.query(api.campaigns.get, { campaignId })).toMatchObject({
      partyLevel: 4,
    });

    await alice.mutation(api.campaigns.remove, { campaignId });
    expect(await alice.query(api.campaigns.list)).toEqual([]);
  });

  test("other users can't see or change a campaign", async () => {
    const { alice, bob } = await setup();
    const campaignId = await alice.mutation(api.campaigns.create, {
      name: "Ashes",
      system: "dnd5e",
      partyLevel: 5,
    });

    expect(await bob.query(api.campaigns.list)).toEqual([]);
    expect(await bob.query(api.campaigns.get, { campaignId })).toBeNull();
    expect(
      await bob.query(api.campaigns.get, { campaignId: "not-an-id" }),
    ).toBeNull();
    await expect(
      bob.mutation(api.campaigns.update, { campaignId, name: "Mine" }),
    ).rejects.toThrow("Campaign not found");
    await expect(
      bob.mutation(api.campaigns.remove, { campaignId }),
    ).rejects.toThrow("Campaign not found");
  });

  test("signed-out callers are rejected", async () => {
    const { t } = await setup();
    await expect(t.query(api.campaigns.list)).rejects.toThrow("Not signed in");
  });

  test("party level is limited by game system", async () => {
    const { alice } = await setup();
    await expect(
      alice.mutation(api.campaigns.create, {
        name: "Ashes",
        system: "drawSteel",
        partyLevel: 11,
      }),
    ).rejects.toThrow("1 to 10");
    await alice.mutation(api.campaigns.create, {
      name: "Ashes",
      system: "dnd5e",
      partyLevel: 20,
    });
  });
});
