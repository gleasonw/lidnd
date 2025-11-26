"use server";
import { LidndAuth } from "@/app/authentication";
import { t } from "@/server/api/base-trpc";
import { appRouter } from "@/server/api/router";
import { eq, and, exists } from "drizzle-orm";
import { db } from "@/server/db";
import {
  campaignCreatureLink,
  creatures,
  type CreatureInsert,
} from "@/server/db/schema";
import { revalidatePath } from "next/cache";

// TODO: abstract this a bit
export async function updateCreature(
  creature: CreatureInsert & { id: string }
) {
  const user = await LidndAuth.getUser();
  if (!user) {
    console.error("No user found, cannot update encounter");
    throw new Error("No user found");
  }
  const createCaller = t.createCallerFactory(appRouter);
  const trpcCaller = createCaller({ user });
  await trpcCaller.updateCreature(creature);
}

export async function removeCreatureFromCampaign({
  creatureId,
  campaignId,
}: {
  creatureId: string;
  campaignId: string;
}) {
  const user = await LidndAuth.getUser();
  if (!user) {
    console.error("No user found, cannot remove creature from campaign");
    throw new Error("No user found");
  }

  const res = await db
    .delete(campaignCreatureLink)
    .where(
      and(
        eq(campaignCreatureLink.campaign_id, campaignId),
        eq(campaignCreatureLink.creature_id, creatureId),
        exists(
          db
            .select()
            .from(creatures)
            .where(
              and(eq(creatures.id, creatureId), eq(creatures.user_id, user.id))
            )
        )
      )
    )
    .returning({ creatureId: campaignCreatureLink.creature_id });
  revalidatePath("/");
  return res;
}
