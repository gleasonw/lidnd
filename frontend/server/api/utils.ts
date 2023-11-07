import { db } from "@/server/api/db";
import { creatures, encounters } from "@/server/api/db/schema";
import { and, eq } from "drizzle-orm";
import { creatureUploadSchema } from "@/server/api/router";
import { TRPCError } from "@trpc/server";
import * as z from "zod";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { get } from "http";

export async function createCreature(
  user_id: number,
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

  try {
    await Promise.all([
      s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME!,
          Key: getIconAWSname(newCreature[0].id),
          Body: creature.icon_image,
        })
      ),
      s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME!,
          Key: getStatBlockAWSname(newCreature[0].id),
          Body: creature.stat_block_image,
        })
      ),
    ]);
  } catch (e) {
    console.error(e);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to upload images",
    });
  }

  return newCreature[0];
}

export async function getUserEncounter(
  user_id: number,
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
