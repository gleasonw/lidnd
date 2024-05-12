"use server";

import { auth } from "@/server/api/auth/lucia";
import { createCreature, getPageSession } from "@/server/api/utils";
import { redirect } from "next/navigation";
import {
  campaigns,
  campaignsToPlayers,
  creatures,
} from "@/server/api/db/schema";
import { z } from "zod";
import { db } from "@/server/api/db";
import { parse } from "@conform-to/zod";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { campaignInsertSchema } from "@/app/dashboard/types";
import { and, eq } from "drizzle-orm";
import { creatureUploadSchema } from "@/server/api/router";
import { appRoutes } from "@/app/routes";

export async function logOut() {
  const session = await getPageSession();
  if (!session) return redirect("/login");
  await auth.invalidateSession(session?.sessionId);
  redirect("/login");
}

export async function createCampaign(formdata: FormData) {
  const campaign = parse(formdata, {
    schema: campaignInsertSchema.merge(
      z.object({
        user_id: z.optional(z.string()),
      }),
    ),
  });

  if (!campaign.value) {
    return { message: campaign.error, status: 400 };
  }

  const session = await getPageSession();

  if (!session) {
    console.log("user not logged in");
    return { message: "No session found.", status: 400 };
  }

  const user = session.user;

  await db
    .insert(campaigns)
    .values({
      ...campaign.value,
      user_id: user.userId,
    })
    .returning();

  revalidatePath("/campaigns");
}

export async function deleteCampaign(userId: string, id: string) {
  console.log("deleting campaign", userId, id);
  await db
    .delete(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.user_id, userId)))
    .returning();

  revalidatePath(appRoutes.dashboard);
  redirect(appRoutes.dashboard);
}

export async function createPlayerAndAddToCampaign(
  campaignId: string,
  form: FormData,
) {
  const session = await getPageSession();

  if (!session) {
    console.log("user not logged in");
    return NextResponse.json({ error: "No session found." }, { status: 400 });
  }

  const player = parse(form, {
    schema: creatureUploadSchema.merge(
      z.object({
        user_id: z.optional(z.string()),
      }),
    ),
  });

  console.log("player", player);

  await db.transaction(async (tx) => {
    if (!player.value) {
      return NextResponse.json({ error: player.error }, { status: 400 });
    }

    const newCreature = await createCreature(
      session.user.userId,
      player.value,
      tx,
    );

    await tx.insert(campaignsToPlayers).values({
      campaign_id: campaignId,
      player_id: newCreature.id,
    });
  });

  revalidatePath(appRoutes.dashboard);
}
