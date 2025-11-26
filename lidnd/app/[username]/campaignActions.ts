"use server";

import { campaignInsertSchema } from "@/app/[username]/types";
import { LidndAuth } from "@/app/authentication";
import { db } from "@/server/db";
import { campaigns, type CampaignInsert } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function updateCampaign(campaign: CampaignInsert) {
  const user = await LidndAuth.getUser();
  if (!user) {
    console.error("No user found, cannot archive campaign");
    return { message: "No user found", status: 400 };
  }
  const validateResult = campaignInsertSchema
    .merge(z.object({ id: z.string() }))
    .safeParse(campaign);
  if (!validateResult.success) {
    console.error("Invalid campaign data", validateResult.error);
    return { message: "Invalid campaign data", status: 400 };
  }
  const validatedCampaign = validateResult.data;
  await db
    .update(campaigns)
    .set(validatedCampaign)
    .where(
      and(
        eq(campaigns.id, validatedCampaign.id),
        eq(campaigns.user_id, user.id)
      )
    );
  revalidatePath(`/`);
}
