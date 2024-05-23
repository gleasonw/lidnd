import { systems } from "@/server/api/db/schema";

export type System = typeof systems.$inferSelect;
