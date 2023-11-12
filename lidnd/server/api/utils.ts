import { db } from "@/server/api/db";
import {
  creatures,
  encounter_participant,
  encounters,
  settings,
} from "@/server/api/db/schema";
import { and, eq, sql, desc, asc } from "drizzle-orm";
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
import { sortEncounterCreatures } from "@/app/dashboard/encounters/utils";
import { mergeEncounterCreature } from "@/app/dashboard/encounters/utils";

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

  const statBlockUpload = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: getStatBlockAWSname(newCreature[0].id),
    Body: await creature.stat_block_image.arrayBuffer(),
  });

  await Promise.all([
    s3Client.send(iconUpload),
    s3Client.send(statBlockUpload),
  ]);

  return newCreature[0];
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
  await db.execute(
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

export async function postEncounterToUserChannel(
  encounter: components["schemas"]["Encounter"]
) {
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
      encounter,
      settings: userSettings[0],
    },
    headers: {
      Authorization: `Bearer ${session.sessionId}`,
    },
  });
  console.log(response.response.url);
  if (response.error) {
    console.error(response.error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to post encounter",
    });
  }
  return response;
}
