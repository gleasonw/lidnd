ALTER TABLE "encounters" RENAME COLUMN "turn_count" TO "current_round";--> statement-breakpoint
ALTER TABLE "encounters" ALTER COLUMN "current_round" SET DEFAULT 1;