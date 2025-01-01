import { creatureUploadSchema } from "../db/schema";
import { db } from "@/server/db";
import { creatures } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { LidndContext } from "@/server/api/base-trpc";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { CreatureUtils } from "@/utils/creatures";
import { has } from "lodash";

export const ServerCreature = {
  create: async function (
    ctx: LidndContext,
    uploadedCreature: z.infer<typeof creatureUploadSchema>,
    { hasStatBlock, hasIcon }: { hasStatBlock: boolean; hasIcon: boolean },
    dbObject = db
  ) {
    if (
      !process.env.AWS_BUCKET_NAME ||
      !process.env.AWS_ACCESS_KEY_ID ||
      !process.env.AWS_SECRET_ACCESS_KEY
    ) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "AWS credentials not set",
      });
    }

    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    const newCreature = await dbObject
      .insert(creatures)
      .values({
        ...{
          ...uploadedCreature,
        },
        user_id: ctx.user.id,
      })
      .returning();

    if (!newCreature[0]) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create creature",
      });
    }

    const urlsToGet: Array<Promise<string>> = [];
    if (hasStatBlock) {
      urlsToGet.push(
        getSignedUrl(
          //@ts-expect-error weird aws type error. initialize not assignable to serialize?
          s3Client,
          new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME!,
            Key: CreatureUtils.statBlockKey(newCreature[0]),
          })
        )
      );
    }

    if (hasIcon) {
      urlsToGet.push(
        getSignedUrl(
          //@ts-expect-error weird aws type error. initialize not assignable to serialize?
          s3Client,
          new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME!,
            Key: CreatureUtils.iconKey(newCreature[0]),
          })
        )
      );
    }

    const [statBlockPresigned, iconPresigned] = await Promise.all(urlsToGet);

    console.log(statBlockPresigned, iconPresigned);

    return {
      creature: newCreature[0],
      statBlockPresigned,
      iconPresigned,
    };
  },
};
