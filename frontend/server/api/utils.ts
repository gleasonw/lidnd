import { db } from "@/server/api/db";
import {
  creatures,
  encounter_participant,
  encounters,
} from "@/server/api/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { Upload } from "@aws-sdk/lib-storage";
import {
  Creature,
  EncounterCreature,
  EncounterParticipant,
  creatureUploadSchema,
} from "@/server/api/router";
import { TRPCError } from "@trpc/server";
import * as z from "zod";
import { S3Client } from "@aws-sdk/client-s3";
import { cache } from "react";
import { auth } from "@/server/api/auth/lucia";
import * as context from "next/headers";
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

  const iconUpload = new Upload({
    client: s3Client,
    params: {
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: getIconAWSname(newCreature[0].id),
      Body: creature.icon_image,
    },
  });

  const statBlockUpload = new Upload({
    client: s3Client,
    params: {
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: getStatBlockAWSname(newCreature[0].id),
      Body: creature.stat_block_image,
    },
  });

  await Promise.all([iconUpload.done(), statBlockUpload.done()]);

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
    "https://raw.githubusercontent.com/gleasonw/dnd-init-tracker/main/whitelist.txt"
  );
  const data = await response.text();
  const whitelist = new Set(data.split("\n"));
  return whitelist;
}

export const getPageSession = cache(() => {
  const authRequest = auth.handleRequest("GET", context);
  return authRequest.validate();
});

export function mergeEncounterCreature(
  participant: EncounterParticipant,
  creature: Creature
): EncounterCreature {
  return {
    id: participant.id,
    encounter_id: participant.encounter_id,
    creature_id: participant.creature_id,
    name: creature.name,
    challenge_rating: creature.challenge_rating,
    max_hp: creature.max_hp,
    hp: participant.hp,
    is_active: participant.is_active,
    is_player: creature.is_player,
    initiative: participant.initiative,
    created_at: participant.created_at,
    user_id: creature.user_id,
  };
}

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
) {
  return await dbObject
    .select()
    .from(encounter_participant)
    .where(eq(encounter_participant.encounter_id, encounter_id));
}
