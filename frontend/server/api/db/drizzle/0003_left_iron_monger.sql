ALTER TABLE "creatures-drizzle" ADD COLUMN "user_id" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "encounter_participant-drizzle" ADD COLUMN "initiative" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "encounter_participant-drizzle" ADD COLUMN "hp" integer DEFAULT 0;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_index" ON "creatures-drizzle" ("user_id");