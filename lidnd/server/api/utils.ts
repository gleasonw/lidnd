import { db } from "@/server/api/db";
import {
  campaigns,
  creatures,
  participants,
  encounters,
  systems,
  settings,
} from "@/server/api/db/schema";
import { eq, sql } from "drizzle-orm";
import { paths } from "@/app/schema";
import createClient from "openapi-fetch";
import { Participant, creatureUploadSchema } from "@/server/api/router";
import { TRPCError } from "@trpc/server";
import * as z from "zod";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { cache } from "react";
import { auth } from "@/server/api/auth/lucia";
import * as context from "next/headers";
import apiURL from "@/app/apiURL";
import { ParticipantUtils } from "@/utils/participants";

export async function getUserCampaigns(user_id: string) {
  return await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.user_id, user_id));
}

export async function getSystems() {
  return await db.select().from(systems);
}

export async function createCreature(
  user_id: string,
  creature: z.infer<typeof creatureUploadSchema>,
  dbObject = db
) {
  const newCreature = await dbObject
    .insert(creatures)
    .values({ ...creature, user_id })
    .returning();
  if (newCreature.length === 0 || !newCreature[0]) {
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

export async function getEncounterCreature(id: string) {
  const participant = await db.query.participants.findFirst({
    where: (participants, { eq }) => eq(participants.id, id),
    with: {
      creature: true,
    },
  });

  if (!participant) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "No encounter found",
    });
  }

  return participant;
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
    UPDATE participants
    SET is_active = CASE 
        WHEN id = ${participant_id} THEN TRUE
        ELSE FALSE
    END
    WHERE encounter_id = ${encounter_id}
    `
  );
}

export async function allEncounterParticipants(
  encounter_id: string,
  dbObject = db
): Promise<Participant[]> {
  const participants = await dbObject.query.participants.findMany({
    where: (participants, { eq }) =>
      eq(participants.encounter_id, encounter_id),
    with: {
      creature: true,
    },
  });
  return participants.sort(ParticipantUtils.sortLinearly);
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
  if (userSettings.length === 0 || !userSettings[0]) {
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
  participant: Participant,
  dbObject = db
) {
  return await dbObject
    .update(participants)
    .set({
      has_played_this_round: participant.has_played_this_round,
    })
    .where(eq(participants.id, participant.id));
}
