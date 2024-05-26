import {
  creatureUploadSchema,
  participantInsertSchema,
} from "@/server/api/router";
import { z } from "zod";

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
