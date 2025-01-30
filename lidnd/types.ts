import {
  creatures,
  participant_status_effects,
  participants,
  status_effects,
  systems,
} from "@/server/db/schema";

export type System = typeof systems.$inferSelect;
export type StatusEffect = typeof status_effects.$inferSelect;

export type AddParticipant = typeof participants.$inferInsert;
export type AddCreature = typeof creatures.$inferInsert;
export type AddStatusEffect = typeof status_effects.$inferInsert;
export type AddParticipantEffect =
  typeof participant_status_effects.$inferInsert;
