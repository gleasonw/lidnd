import { booleanSchema } from "@/app/[username]/utils";
import { creatures, participants } from "@/server/api/db/schema";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const insertCreatureSchema = createInsertSchema(creatures);
export const participantInsertSchema = createInsertSchema(participants);
export const creatureUploadSchema = insertCreatureSchema
  .extend({
    icon_image: z.any(),
    stat_block_image: z.unknown().optional(),
    max_hp: z.coerce.number().gt(0),
    challenge_rating: z.coerce.number(),
    is_player: booleanSchema,
  })
  .omit({ user_id: true });

export type CreaturePost = z.infer<typeof creatureUploadSchema>;

// encounter_id will be provided by hook
// creature_id will come after creature is inserted
export const participantCreateSchema = z.object({
  participant: participantInsertSchema
    .extend({
      encounter_id: z.string().optional(),
      creature_id: z.string().optional(),
    })
    .optional(),
  creature: creatureUploadSchema,
});

export type ParticipantPost = z.infer<typeof participantCreateSchema>;
