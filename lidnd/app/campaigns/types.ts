import { campaigns } from "@/server/api/db/schema";
import { createInsertSchema } from "drizzle-zod";

export type Campaign = typeof campaigns.$inferSelect;

export const campaignInsertSchema = createInsertSchema(campaigns);
