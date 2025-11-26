"use server";

import { getPageSession } from "@/server/api/utils";
import { redirect } from "next/navigation";
import {
  campaigns,
  encounterInsertSchema,
  encounters,
  type EncounterInsert,
} from "@/server/db/schema";
import { z } from "zod";
import { db } from "@/server/db";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { campaignInsertSchema } from "@/app/[username]/types";
import { and, eq } from "drizzle-orm";
import { appRoutes } from "@/app/routes";
import { LidndAuth } from "@/app/authentication";
import _ from "lodash";
import { ServerEncounter } from "@/server/sdk/encounters";
import { parseWithZod } from "@conform-to/zod";

export async function removeEncounter({
  encounterId,
  campaignId,
}: {
  encounterId: string;
  campaignId: string;
}) {
  "use server";

  const user = await LidndAuth.getUser();
  if (!user) {
    console.error("No user found, cannot delete encounter");
    throw new Error("No user found");
  }
  const campaign = await db.query.campaigns.findFirst({
    where: and(eq(campaigns.id, campaignId), eq(campaigns.user_id, user.id)),
  });
  if (!campaign) {
    throw new Error(
      "Campaign not found or you do not have permission to modify it"
    );
  }

  if (!encounterId) {
    throw new Error("Encounter id is required");
  }

  await deleteEncounter({ id: encounterId });
  revalidatePath(appRoutes.campaign({ campaign, user }));
}

export async function createEncounter(encounter: EncounterInsert) {
  const user = await LidndAuth.getUser();
  if (!user) {
    console.error("No user found, cannot create encounter");
    return { message: "No user found", status: 400 };
  }
  const encounterInput = encounterInsertSchema
    .omit({ user_id: true })
    .safeParse(encounter);
  if (!encounterInput.success) {
    console.error("Encounter input parsing failed", encounterInput.error);
    return { message: "Invalid input", status: 400 };
  }
  const newEncounter = await ServerEncounter.create(
    { user },
    encounterInput.data
  );
  revalidatePath(`/`);
  return newEncounter;
}

export async function deleteEncounter(encounter: { id: string }) {
  const user = await LidndAuth.getUser();
  if (!user) {
    console.error("No user found, cannot delete encounter");
    return { message: "No user found", status: 400 };
  }
  const deletedEncounter = await ServerEncounter.deleteEncounter(
    { user },
    encounter
  );
  revalidatePath(`/`);
  return deletedEncounter;
}

export async function logOut() {
  const session = await getPageSession();
  if (!session) return redirect("/login");
  await LidndAuth.invalidateSession(session?.sessionId);
  redirect("/login");
}

export async function createCampaign(formdata: FormData) {
  const campaign = parseWithZod(formdata, {
    schema: campaignInsertSchema.merge(
      z.object({
        user_id: z.optional(z.string()),
        slug: z.optional(z.string()),
      })
    ),
  });

  if (campaign.status !== "success") {
    console.error(campaign.error);
    throw new Error(`Invalid form data: ${campaign.error}`);
  }

  const user = await LidndAuth.getUser();

  if (!user) {
    console.log("user not logged in");
    throw new Error("No session found.");
  }

  const campaignSlug = _.kebabCase(campaign.value.name);

  const createdCampaign = await db
    .insert(campaigns)
    .values({
      ...campaign.value,
      user_id: user.id,
      slug: campaignSlug,
    })
    .returning();

  if (createdCampaign.length === 0 || !createdCampaign[0]) {
    throw new Error("Failed to create campaign");
  }

  revalidatePath("/campaigns");
  redirect(appRoutes.campaign({ campaign: createdCampaign[0], user }));
}

export async function deleteCampaign(formData: FormData) {
  const user = await LidndAuth.getUser();

  if (!user) {
    console.error("No user found, cannot delete campaign");
    throw new Error("No user found");
  }

  const campaignId = formData.get("campaign_id");

  if (typeof campaignId !== "string" || campaignId.length === 0) {
    throw new Error("Campaign id is required");
  }

  await db
    .delete(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.user_id, user.id)))
    .returning();

  revalidatePath(appRoutes.dashboard(user));
}

export async function updateEncounterDescription(
  id: string,
  formData: FormData
) {
  const user = await LidndAuth.getUser();

  if (!user) {
    console.log("user not logged in");
    return NextResponse.json({ error: "No session found." }, { status: 400 });
  }

  const parsedForm = parseWithZod(formData, {
    schema: z.object({ description: z.string().optional() }),
  });

  if (parsedForm.status !== "success") {
    return { message: parsedForm.error, status: 400 };
  }

  const { description: parsedDescription } = parsedForm.value;

  await db
    .update(encounters)
    .set({ description: parsedDescription ?? "" })
    .where(and(eq(encounters.id, id), eq(encounters.user_id, user.id)));
}
