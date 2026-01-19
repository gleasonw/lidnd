import type { creatureUploadSchema } from "../db/schema";
import { campaignCreatureLink } from "../db/schema";
import { db } from "@/server/db";
import { creatures } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";
import type { z } from "zod";
import type { LidndContext } from "@/server/api/base-trpc";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { CreatureUtils } from "@/utils/creatures";

export const ServerCreature = {
  create: async function (
    ctx: LidndContext,
    uploadedCreature: z.infer<typeof creatureUploadSchema>,
    {
      hasStatBlock,
      hasIcon,
      campaignId,
    }: { hasStatBlock: boolean; hasIcon: boolean; campaignId?: string },
    dbObject = db
  ) {
    console.log({ hasStatBlock, hasIcon });
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

    if (campaignId) {
      await dbObject.insert(campaignCreatureLink).values({
        campaign_id: campaignId,
        creature_id: newCreature[0].id,
      });
    }

    const urlsToGet: Record<
      "statBlockPresigned" | "iconPresigned",
      Promise<string>
    > = {} as any;
    if (hasStatBlock) {
      urlsToGet["statBlockPresigned"] = getSignedUrl(
        //@ts-expect-error weird aws type error. initialize not assignable to serialize?
        s3Client,
        new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME!,
          Key: CreatureUtils.statBlockKey(newCreature[0]),
        })
      );
    }

    if (hasIcon) {
      urlsToGet["iconPresigned"] = getSignedUrl(
        //@ts-expect-error weird aws type error. initialize not assignable to serialize?
        s3Client,
        new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME!,
          Key: CreatureUtils.iconKey(newCreature[0]),
        })
      );
    }

    const results = await Promise.all(
      Object.entries(urlsToGet).map(async ([key, task]) => ({
        key,
        value: await task,
      }))
    );

    const keyedResults = Object.fromEntries(
      results.map(({ key, value }) => [key, value])
    ) as Record<"statBlockPresigned" | "iconPresigned", string>;

    console.log({ keyedResults });

    return {
      creature: newCreature[0],
      ...keyedResults,
    };
  },
};
