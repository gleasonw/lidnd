ALTER TABLE "participant_status_effects" RENAME COLUMN "save_ends" TO "save_ends_dc";--> statement-breakpoint
ALTER TABLE "participant_status_effects" ALTER COLUMN "save_ends_dc" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "participant_status_effects" ALTER COLUMN "save_ends_dc" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "status_effects_5e" ALTER COLUMN "description" SET NOT NULL;