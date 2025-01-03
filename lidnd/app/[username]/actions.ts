"use server";

import { createCreature, getPageSession } from "@/server/api/utils";
import { redirect } from "next/navigation";
import {
  campaigns,
  campaignToPlayer,
  encounters,
} from "@/server/api/db/schema";
import { z } from "zod";
import { db } from "@/server/api/db";
import { parse } from "@conform-to/zod";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { campaignInsertSchema } from "@/app/[username]/types";
import { and, eq } from "drizzle-orm";
import { appRoutes } from "@/app/routes";
import type { CreaturePostData } from "@/encounters/utils";
import { LidndAuth } from "@/app/authentication";
import type { LidndUser } from "@/app/authentication";
import _ from "lodash";
import { ServerCreature } from "@/server/creatures";
import { creatureUploadSchema } from "@/encounters/types";
import { ServerEncounter } from "@/server/encounters";

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
        slug: z.optional(z.string()),
      }),
    ),
  });

  if (!campaign.value) {
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
  redirect(appRoutes.campaign(createdCampaign[0], user));
}

export async function deleteCampaign(user: LidndUser, id: string) {
  await db
    .delete(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.user_id, user.id)))
    .returning();

  revalidatePath(appRoutes.dashboard(user));
  redirect(appRoutes.dashboard(user));
}

export async function postCreature(uploadedCreature: FormData) {
  const user = await LidndAuth.getUser();

  if (!user) {
    return { error: "No session found." };
  }

  const creature = parse(uploadedCreature, {
    schema: creatureUploadSchema,
  });

  if (!creature.value) {
    return { error: creature.error };
  }

  const newCreature = await ServerCreature.create({ user }, creature.value);

  return newCreature;
}

export async function createPlayerAndAddToCampaign(
  campaignId: string,
  form: FormData,
) {
  const user = await LidndAuth.getUser();

  if (!user) {
    console.log("user not logged in");
    return NextResponse.json({ error: "No session found." }, { status: 400 });
  }

  const player = parse(form, {
    schema: creatureUploadSchema,
  });

  await db.transaction(async (tx) => {
    if (!player.value) {
      return NextResponse.json({ error: player.error }, { status: 400 });
    }

    const newCreature = await ServerCreature.create({ user }, player.value, tx);

    await tx.insert(campaignToPlayer).values({
      campaign_id: campaignId,
      player_id: newCreature.id,
    });
  });
}

export async function updateEncounterDescription(
  id: string,
  formData: FormData,
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

export async function createParticipantInEncounter(formData: CreaturePostData) {
  const user = await LidndAuth.getUser();

  if (!user) {
    return { error: "No session found." };
  }

  // maybe should just make a "flattened participant + creature zod schema..." man, formData sucks
  const creature = parse(formData, {
    schema: creatureUploadSchema.merge(
      z.object({
        encounter_id: z.string(),
        column_id: z.string().optional(),
      }),
    ),
  });

  if (!creature.value) {
    return { error: creature.error };
  }

  const newCreature = await createCreature({ user }, creature.value);

  await ServerEncounter.addParticipant(
    { user },
    {
      encounter_id: creature.value.encounter_id,
      creature_id: newCreature.id,
      hp: newCreature.max_hp,
      creature: newCreature,
      column_id: creature.value.column_id,
    },
  );

  return {
    message: "Success",
    status: 201,
    data: newCreature,
  };
}
