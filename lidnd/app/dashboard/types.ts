import { campaigns, encounters } from "@/server/api/db/schema";
import { createInsertSchema } from "drizzle-zod";

export type Campaign = typeof campaigns.$inferSelect;
export type UpsertEncounter = typeof encounters.$inferInsert;

export const campaignInsertSchema = createInsertSchema(campaigns);
