import { creatureUploadSchema } from "@/encounters/types";
import { db } from "@/server/api/db";
import { creatures } from "@/server/api/db/schema";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import sharp from "sharp";
import { CreatureUtils } from "@/utils/creatures";
import type { LidndContext } from "@/server/api/base-trpc";

export const ServerCreature = {
  create: async function (
    ctx: LidndContext,
    uploadedCreature: z.infer<typeof creatureUploadSchema>,
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

    const uploadHasStatBlock =
      typeof uploadedCreature.stat_block_image === "object" &&
      uploadedCreature.stat_block_image !== null &&
      "arrayBuffer" in uploadedCreature.stat_block_image;

    if (!uploadHasStatBlock) {
      const iconBuffer = await uploadedCreature.icon_image.arrayBuffer();
      const { width, height } = await sharp(iconBuffer).metadata();

      const newCreature = await dbObject
        .insert(creatures)
        .values({
          ...{ ...uploadedCreature, icon_height: height, icon_width: width },
          user_id: ctx.user.id,
        })
        .returning();

      if (!newCreature || newCreature.length === 0 || !newCreature[0]) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create creature",
        });
      }

      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: CreatureUtils.iconKey(newCreature[0]),
          Body: await uploadedCreature.icon_image.arrayBuffer(),
        })
      );

      return newCreature[0];
    }

    const [iconBuffer, statBlockBuffer] = await Promise.all([
      uploadedCreature.icon_image.arrayBuffer(),
      (uploadedCreature.stat_block_image as File).arrayBuffer(),
    ]);

    const [iconDimensions, statBlockDimensions] = await Promise.all([
      sharp(iconBuffer).metadata(),
      sharp(statBlockBuffer).metadata(),
    ]);

    const newCreature = await dbObject
      .insert(creatures)
      .values({
        ...{
          ...uploadedCreature,
          icon_height: iconDimensions.height,
          icon_width: iconDimensions.width,
          stat_block_height: statBlockDimensions.height,
          stat_block_width: statBlockDimensions.width,
        },
        user_id: ctx.user.id,
      })
      .returning();

    if (!newCreature || newCreature.length === 0 || !newCreature[0]) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create creature",
      });
    }

    await Promise.all([
      s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: CreatureUtils.iconKey(newCreature[0]),
          Body: iconBuffer,
        })
      ),
      // why buffer.from? can't remember
      s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: CreatureUtils.statBlockKey(newCreature[0]),
          Body: Buffer.from(statBlockBuffer),
        })
      ),
    ]);

    return newCreature[0];
  },
};
