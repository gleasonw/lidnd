import { db } from "@/server/api/db";
import {
  creatures,
  encounter_participant,
  encounters,
  participant_status_effects,
  settings,
  status_effects_5e,
} from "@/server/api/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { paths, components } from "@/app/schema";
import createClient from "openapi-fetch";
import {
  EncounterCreature,
  EncounterParticipant,
  creatureUploadSchema,
} from "@/server/api/router";
import { TRPCError } from "@trpc/server";
import * as z from "zod";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { cache } from "react";
import { auth } from "@/server/api/auth/lucia";
import * as context from "next/headers";
import apiURL from "@/app/apiURL";
import { sortEncounterCreatures } from "@/app/encounters/utils";
import { mergeEncounterCreature } from "@/app/encounters/utils";

export async function createCreature(
  user_id: string,
  creature: z.infer<typeof creatureUploadSchema>,
  dbObject = db
) {
  const newCreature = await dbObject
    .insert(creatures)
    .values({ ...creature, user_id })
    .returning();
  if (newCreature.length === 0) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create creature",
    });
  }

  const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const iconUpload = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: getIconAWSname(newCreature[0].id),
    Body: await creature.icon_image.arrayBuffer(),
  });

  if (
    typeof creature.stat_block_image === "object" &&
    creature.stat_block_image !== null &&
    "arrayBuffer" in creature.stat_block_image
  ) {
    const statBlockUpload = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: getStatBlockAWSname(newCreature[0].id),
      Body: Buffer.from(
        await (creature.stat_block_image as File).arrayBuffer()
      ),
    });

    await Promise.all([
      s3Client.send(iconUpload),
      s3Client.send(statBlockUpload),
    ]);
  } else {
    await s3Client.send(iconUpload);
  }

  return newCreature[0];
}

export async function getEncounterCreature(
  id: string
): Promise<EncounterCreature> {
  const encounter = await db
    .select()
    .from(encounter_participant)
    .where(eq(encounter_participant.id, id))
    .leftJoin(creatures, eq(encounter_participant.creature_id, creatures.id));
  if (encounter.length === 0) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "No encounter found",
    });
  }
  const encounterData = encounter[0];
  if (!encounterData.encounter_participant || !encounterData.creatures) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "No encounter found",
    });
  }
  return mergeEncounterCreature(
    encounterData.encounter_participant,
    encounterData.creatures
  );
}

export async function getEncounterData(id: string) {
  const encounter = await db
    .select()
    .from(encounters)
    .where(and(eq(encounters.id, id)))
    .leftJoin(
      encounter_participant,
      eq(encounters.id, encounter_participant.encounter_id)
    )
    .leftJoin(creatures, eq(encounter_participant.creature_id, creatures.id))
    .leftJoin(
      participant_status_effects,
      eq(
        encounter_participant.id,
        participant_status_effects.encounter_participant_id
      )
    )
    .leftJoin(
      status_effects_5e,
      eq(participant_status_effects.status_effect_id, status_effects_5e.id)
    );
  const response = encounter.reduce<Record<string, EncounterCreature>>(
    (acc, row) => {
      const participant = row["encounter_participant"];
      const creature = row["creatures"];
      const statusEffect = row["participant_status_effects"];
      const statusEffectData = row["status_effects_5e"];
      const finalStatusEffect = statusEffect
        ? {
            ...statusEffect,
            description: statusEffectData?.description ?? "",
            name: statusEffectData?.name ?? "",
          }
        : null;

      if (!participant || !creature) return acc;
      if (!acc[participant.id]) {
        acc[participant.id] = {
          ...mergeEncounterCreature(participant, creature),
          status_effects: finalStatusEffect ? [finalStatusEffect] : [],
        };
      } else {
        finalStatusEffect &&
          acc[participant.id].status_effects.push(finalStatusEffect);
      }
      return acc;
    },
    {}
  );
  const participants = Object.values(response);

  const encounterData = encounter.at(0)?.encounters;

  if (!encounterData) {
    return null;
  }

  return {
    ...encounterData,
    participants: participants.sort(sortEncounterCreatures),
  };
}

export async function updateTurnData(
  encounter_id: string,
  updatedRoundNumber: number,
  updatedActiveParticipantId: string,
  dbObject = db
) {
  return await Promise.all([
    setActiveParticipant(updatedActiveParticipantId, encounter_id, dbObject),
    dbObject
      .update(encounters)
      .set({
        current_round: updatedRoundNumber,
      })
      .where(eq(encounters.id, encounter_id)),
  ]);
}

export async function getUserEncounter(
  user_id: string,
  encounter_id: string,
  dbObject = db
) {
  const encounter = await dbObject
    .select()
    .from(encounters)
    .where(
      and(eq(encounters.id, encounter_id), eq(encounters.user_id, user_id))
    );
  if (encounter.length === 0) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "No encounter found",
    });
  }
  return encounter[0];
}

export function getIconAWSname(creature_id: string) {
  return `icon-${creature_id}.png`;
}

export function getStatBlockAWSname(creature_id: string) {
  return `stat_block-${creature_id}.png`;
}

export async function fetchWhitelist() {
  const response = await fetch(
    "https://raw.githubusercontent.com/gleasonw/lidnd/main/whitelist.txt"
  );
  const data = await response.text();
  const whitelist = new Set(data.split("\n"));
  return whitelist;
}

export const getPageSession = cache(() => {
  const authRequest = auth.handleRequest("GET", context);
  return authRequest.validate();
});

export async function setActiveParticipant(
  participant_id: string,
  encounter_id: string,
  dbObject = db
) {
  await dbObject.execute(
    sql`
    UPDATE encounter_participant
    SET is_active = CASE 
        WHEN id = ${participant_id} THEN TRUE
        ELSE FALSE
    END
    WHERE encounter_id = ${encounter_id}
    `
  );
}

export async function getEncounterParticipants(
  encounter_id: string,
  dbObject = db
): Promise<EncounterParticipant[]> {
  const participants = await dbObject
    .select()
    .from(encounter_participant)
    .where(eq(encounter_participant.encounter_id, encounter_id));
  return participants.sort(sortEncounterCreatures);
}

export async function getEncounterParticipantsWithCreatureData(
  encounter_id: string,
  dbObject = db
): Promise<EncounterCreature[]> {
  const encouterCreatures = await dbObject
    .select()
    .from(encounter_participant)
    .where(eq(encounter_participant.encounter_id, encounter_id))
    .innerJoin(creatures, eq(encounter_participant.creature_id, creatures.id));
  return encouterCreatures
    .map(({ creatures, encounter_participant }) =>
      mergeEncounterCreature(encounter_participant, creatures)
    )
    .sort(sortEncounterCreatures);
}
const { POST } = createClient<paths>({
  baseUrl: apiURL,
});

export async function postEncounterToUserChannel(encounter: { id: string }) {
  const session = await getPageSession();
  if (!session) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "No session found",
    });
  }
  const userSettings = await db
    .select()
    .from(settings)
    .where(eq(settings.user_id, session.user.userId));
  if (userSettings.length === 0) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "No settings found",
    });
  }
  const response = await POST("/api/post_encounter_to_user_channel", {
    body: {
      // @ts-ignore
      encounter,
      settings: userSettings[0],
    },
    headers: {
      Authorization: `Bearer ${session.sessionId}`,
    },
  });
  console.log(response);
  if (response.error) {
    console.error(response.error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to post encounter",
    });
  }
  return response;
}

export async function updateParticipantHasPlayed(
  participant: EncounterParticipant,
  dbObject = db
) {
  return await dbObject
    .update(encounter_participant)
    .set({
      has_played_this_round: participant.has_played_this_round,
    })
    .where(eq(encounter_participant.id, participant.id));
}
