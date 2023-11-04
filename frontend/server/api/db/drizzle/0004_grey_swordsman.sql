ALTER TABLE "creatures-drizzle" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "encounter_participant-drizzle" ALTER COLUMN "encounter_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "encounter_participant-drizzle" ALTER COLUMN "creature_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "encounter_participant-drizzle" ALTER COLUMN "initiative" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "encounter_participant-drizzle" ALTER COLUMN "hp" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "encounter_participant-drizzle" ADD COLUMN "is_active" boolean DEFAULT false;