ALTER TABLE "creatures-drizzle" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "encounter_participant-drizzle" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "settings-drizzle" ALTER COLUMN "user_id" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "settings-drizzle" ALTER COLUMN "average_turn_seconds" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "settings-drizzle" ALTER COLUMN "default_player_level" SET NOT NULL;