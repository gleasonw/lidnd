/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.ts");

export async function setup() {
  const t = convexTest(schema, modules);
  const signInAs = async (name: string) => {
    const userId = await t.run((ctx) => ctx.db.insert("users", { name }));
    // Convex Auth identities use a `userId|sessionId` subject.
    return t.withIdentity({ subject: `${userId}|session` });
  };
  storeImage = imageStorer(t);
  return {
    t,
    storeImage,
    alice: await signInAs("Alice"),
    bob: await signInAs("Bob"),
  };
}

export type Client = Awaited<ReturnType<typeof setup>>["alice"];

let storeImage: () => Promise<Id<"_storage">>;

/** Stores a placeholder image, standing in for an uploaded stat block. */
export function imageStorer(t: ReturnType<typeof convexTest>) {
  return () =>
    t.run((ctx) =>
      ctx.storage.store(new Blob(["stat block"], { type: "image/png" })),
    );
}

/** A Draw Steel campaign with a plan: 3 heroes, a standard adversary, minions. */
export async function drawSteelPlan(gm: Client, { victories = 0 } = {}) {
  const campaignId = await gm.mutation(api.campaigns.create, {
    name: "Ashes",
    system: "drawSteel",
    partyLevel: 1,
  });
  const creature = async (
    kind: "hero" | "standard" | "minion",
    name: string,
    challenge = 0,
    maxHp = 0,
  ) =>
    gm.mutation(api.creatures.create, {
      campaignId,
      kind,
      name,
      challenge,
      maxHp,
      campaignOnly: false,
      statBlockId: kind === "hero" ? undefined : await storeImage(),
    });
  for (const name of ["Ana", "Bo", "Cy"]) await creature("hero", name);
  const ogre = await creature("standard", "Ogre", 12, 40);
  const goblin = await creature("minion", "Goblin", 3, 4);
  const planId = await gm.mutation(api.plans.create, {
    campaignId,
    name: "Bridge ambush",
  });
  await gm.mutation(api.plans.addParticipant, { planId, creatureId: ogre });
  await gm.mutation(api.plans.addParticipant, { planId, creatureId: goblin });
  const sessionId = await gm.mutation(api.sessions.start, {
    campaignId,
    name: "Session 1",
    victories,
  });
  return { campaignId, planId, sessionId, ogre, goblin };
}
