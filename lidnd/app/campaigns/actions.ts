"use server";

import { auth } from "@/server/api/auth/lucia";
import { getPageSession } from "@/server/api/utils";
import { redirect } from "next/navigation";
import { campaigns, creatures } from "@/server/api/db/schema";
import { z } from "zod";
import { db } from "@/server/api/db";
import { parse } from "@conform-to/zod";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { campaignInsertSchema } from "@/app/campaigns/types";

export async function logOut() {
  const session = await getPageSession();
  if (!session) return redirect("/login");
  await auth.invalidateSession(session?.sessionId);
  redirect("/login");
}

export async function updateSettings(form: FormData) {
  console.log(form);
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
    return NextResponse.json({ error: campaign.error }, { status: 400 });
  }

  const session = await getPageSession();

  if (!session) {
    console.log("user not logged in");
    return NextResponse.json({ error: "No session found." }, { status: 400 });
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
