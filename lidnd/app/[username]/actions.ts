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
import type { LidndUser } from "@/app/authentication";
import _ from "lodash";
import { ServerEncounter } from "@/server/sdk/encounters";
import { parseWithZod } from "@conform-to/zod";

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
    return { message: campaign.error, status: 400 };
  }

  const user = await LidndAuth.getUser();

  if (!user) {
    console.log("user not logged in");
    return { message: "No session found.", status: 400 };
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
    return { message: "Failed to create campaign", status: 400 };
  }

  revalidatePath("/campaigns");
  redirect(appRoutes.campaign({ campaign: createdCampaign[0], user }));
}

export async function deleteCampaign(user: LidndUser, id: string) {
  await db
    .delete(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.user_id, user.id)))
    .returning();

  revalidatePath(appRoutes.dashboard(user));
  redirect(appRoutes.dashboard(user));
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

  const parsedForm = parse(formData, {
    schema: z.object({ description: z.string().optional() }),
  });

  if (!parsedForm.value) {
    return { message: parsedForm.error, status: 400 };
  }

  const { description: parsedDescription } = parsedForm.value;

  await db
    .update(encounters)
    .set({ description: parsedDescription ?? "" })
    .where(and(eq(encounters.id, id), eq(encounters.user_id, user.id)));
}
