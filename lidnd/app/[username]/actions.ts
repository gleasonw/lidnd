"use server";

import { getPageSession } from "@/server/api/utils";
import { redirect } from "next/navigation";
import {
  campaigns,
  creatures,
  encounterInsertSchema,
  encounters,
  gameSessions,
  images,
  type EncounterInsert,
  type LidndImage,
  type SessionPost,
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
import type { Creature } from "@/server/api/router";
import { CreatureUtils } from "@/utils/creatures";

export async function invalidateServerFunctionCache() {
  console.log("INVALIDATING");
  revalidatePath(`/`);
}

export async function addImageAssetToEncounter(input: {
  encounterId: string;
  inputAsset:
    | {
        url: string;
        type: "statBlock";
        baseModel: Creature;
      }
    | {
        url: string;
        type: "plain";
        baseModel: LidndImage;
      };
}) {
  const user = await LidndAuth.getUser();
  if (!user) {
    console.error("No user found, cannot add asset to encounter");
    throw new Error("No user found");
  }
  const { encounterId, inputAsset } = input;
  switch (inputAsset.type) {
    case "plain": {
      return await ServerEncounter.addAsset(
        { user },
        {
          encounterId,
          asset: inputAsset.baseModel,
        }
      );
    }
    case "statBlock": {
      const newBaseAsset = await db
        .insert(images)
        .values({
          name: CreatureUtils.statBlockKey(inputAsset.baseModel),
          width: inputAsset.baseModel.stat_block_width,
          height: inputAsset.baseModel.stat_block_height,
          user_id: user.id,
        })
        .returning();
      // attach to creaturexK
      const assetToUse = newBaseAsset[0];
      if (!assetToUse) {
        throw new Error("Failed to create image asset");
      }
      await db
        .update(creatures)
        .set({
          stat_block_asset: assetToUse.id,
        })
        .where(
          and(
            eq(creatures.id, inputAsset.baseModel.id),
            eq(creatures.user_id, user.id)
          )
        );
      return await ServerEncounter.addAsset(
        { user },
        {
          encounterId,
          asset: assetToUse,
        }
      );
    }
    default: {
      const _exhaustiveCheck: never = inputAsset;
      throw new Error(
        `Unhandled asset type ${_exhaustiveCheck}: ${JSON.stringify(
          inputAsset
        )}`
      );
    }
  }
}

export async function removeImageAssetFromEncounter(input: {
  encounterId: string;
  assetId: string;
}) {
  const user = await LidndAuth.getUser();
  if (!user) {
    console.error("No user found, cannot remove asset from encounter");
    throw new Error("No user found");
  }
  return await ServerEncounter.removeAsset(
    { user },
    {
      encounterId: input.encounterId,
      assetId: input.assetId,
    }
  );
}

export async function removeEncounter({
  encounterId,
  campaignId,
  redirectToCampaign = false,
}: {
  encounterId: string;
  campaignId: string;
  redirectToCampaign?: boolean;
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
  if (redirectToCampaign) {
    redirect(appRoutes.campaign({ campaign, user }));
  }
}

export async function startSession({
  campaignId,
  name,
  victoryCount,
}: {
  campaignId: string;
  name: string;
  victoryCount?: number;
}) {
  const user = await LidndAuth.getUser();
  if (!user) {
    console.error("No user found, cannot start session");
    throw new Error("No user found");
  }

  const newSession = await db
    .insert(gameSessions)
    .values({
      user_id: user.id,
      campaign_id: campaignId,
      started_at: new Date(),
      victory_count: victoryCount || 0,
      name,
    })
    .returning();

  if (newSession.length === 0 || !newSession[0]) {
    throw new Error("Failed to create game session");
  }

  revalidatePath(`/`);
  return newSession[0];
}

export async function updateSession({
  sessionId,
  updated,
}: {
  sessionId: string;
  updated: SessionPost;
}) {
  const user = await LidndAuth.getUser();
  if (!user) {
    console.error("No user found, cannot update session");
    throw new Error("No user found");
  }

  await db
    .update(gameSessions)
    .set({
      ...updated,
    })
    .where(
      and(eq(gameSessions.id, sessionId), eq(gameSessions.user_id, user.id))
    );

  revalidatePath(`/`);
}

export async function createEncounter(encounter: EncounterInsert) {
  const user = await LidndAuth.getUser();
  if (!user) {
    console.error("No user found, cannot create encounter");
    throw new Error("No user found");
  }
  const encounterInput = encounterInsertSchema
    .omit({ user_id: true })
    .safeParse(encounter);
  if (!encounterInput.success) {
    console.error("Encounter input parsing failed", encounterInput.error);
    throw new Error("Invalid encounter input");
  }
  const { encounter: newEncounter, campaign } = await ServerEncounter.create(
    { user },
    encounterInput.data
  );
  revalidatePath(`/`);
  const newEncounterLink = appRoutes.encounter({
    campaign,
    encounter: newEncounter,
    user,
  });
  return redirect(newEncounterLink);
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
  revalidatePath(`/`, "layout");
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

export async function addTagToEncounterAction(input: {
  encounter_id: string;
  tag_id: string;
}) {
  "use server";

  const user = await LidndAuth.getUser();
  if (!user) {
    throw new Error("No user found");
  }

  const relation = await ServerEncounter.addTagToEncounter({ user }, input);
  await invalidateServerFunctionCache();

  return relation;
}

export async function removeTagFromEncounterAction(input: {
  encounter_id: string;
  tag_id: string;
}) {
  "use server";

  const user = await LidndAuth.getUser();
  if (!user) {
    throw new Error("No user found");
  }

  await ServerEncounter.removeTagFromEncounter({ user }, input);
  await invalidateServerFunctionCache();
}
