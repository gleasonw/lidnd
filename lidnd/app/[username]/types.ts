import type { encounters, reminders } from "@/server/db/schema";
import { campaigns } from "@/server/db/schema";
import { createInsertSchema } from "drizzle-zod";

export type Campaign = typeof campaigns.$inferSelect;
export type UpsertEncounter = typeof encounters.$inferInsert;
export type Reminder = typeof reminders.$inferSelect;

export const campaignInsertSchema = createInsertSchema(campaigns);
