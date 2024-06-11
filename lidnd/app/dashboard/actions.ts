"use server";

import { createCreature, getPageSession } from "@/server/api/utils";
import { redirect } from "next/navigation";
import {
  campaigns,
  campaignToPlayer,
  participants,
  reminders,
  encounters,
} from "@/server/api/db/schema";
import { z } from "zod";
import { db } from "@/server/api/db";
import { parse } from "@conform-to/zod";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { campaignInsertSchema } from "@/app/dashboard/types";
import { and, eq } from "drizzle-orm";
import { appRoutes, routeToCampaign, routeToEncounter } from "@/app/routes";
import { CreaturePostData } from "@/encounters/utils";
import { createInsertSchema } from "drizzle-zod";
import { encounterById } from "@/server/encounters";
import { creatureUploadSchema } from "@/encounters/types";
import { LidndAuth } from "@/app/authentication";

export async function logOut() {
  const session = await getPageSession();
  if (!session) return redirect("/login");
  await LidndAuth.invalidateSession(session?.sessionId);
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

  const createdCampaign = await db
    .insert(campaigns)
    .values({
      ...campaign.value,
      user_id: user.userId,
    })
    .returning();

  if (createdCampaign.length === 0 || !createdCampaign[0]) {
    return { message: "Failed to create campaign", status: 400 };
  }

  const createdCampaignId = createdCampaign[0].id;

  revalidatePath("/campaigns");
  redirect(routeToCampaign(createdCampaignId));
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

    await tx.insert(campaignToPlayer).values({
      campaign_id: campaignId,
      player_id: newCreature.id,
    });
  });

  revalidatePath(appRoutes.dashboard);
}

export async function updateEncounterDescription(
  id: string,
  formData: FormData,
) {
  const session = await getPageSession();

  if (!session) {
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
    .where(
      and(eq(encounters.id, id), eq(encounters.user_id, session.user.userId)),
    );

  revalidatePath(appRoutes.campaigns);
}

export async function createCreatureInEncounter(formData: CreaturePostData) {
  const session = await getPageSession();

  if (!session) {
    return { error: "No session found." };
  }

  const creature = parse(formData, {
    schema: creatureUploadSchema.merge(
      z.object({
        encounter_id: z.string(),
      }),
    ),
  });

  if (!creature.value) {
    return { error: creature.error };
  }

  const newCreature = await createCreature(session.user.userId, creature.value);

  await db.insert(participants).values({
    encounter_id: creature.value.encounter_id,
    creature_id: newCreature.id,
    hp: newCreature.max_hp,
  });

  return {
    message: "Success",
    status: 201,
    data: newCreature,
  };
}

const reminderSchema = createInsertSchema(reminders);

export async function upsertEncounterReminder(
  encounterId: string,
  formData: FormData,
) {
  const session = await getPageSession();

  if (!session) {
    return { error: "No session found." };
  }

  const reminder = parse(formData, {
    schema: reminderSchema.merge(
      z.object({ encounter_id: z.string().optional() }),
    ),
  });

  if (!reminder.value) {
    return { error: reminder.error };
  }

  const encounter = await encounterById(session.user.userId, encounterId);

  if (encounter?.user_id !== session.user.userId) {
    return { error: "You do not have access to this encounter." };
  }

  await db
    .insert(reminders)
    .values({
      ...reminder.value,
      encounter_id: encounterId,
    })
    .onConflictDoUpdate({
      target: reminders.id,
      set: reminder.value,
    });

  revalidatePath(routeToEncounter(encounter.campaign_id, encounter.id));
}
