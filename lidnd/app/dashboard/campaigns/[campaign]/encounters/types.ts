import { creatureUploadSchema } from "@/server/api/router";
import { z } from "zod";

export type CreaturePost = z.infer<typeof creatureUploadSchema> & {
  stat_block_image?: File;
  minion_count?: number;
};
