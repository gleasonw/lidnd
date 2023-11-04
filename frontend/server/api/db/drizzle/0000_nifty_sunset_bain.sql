CREATE TABLE IF NOT EXISTS "creatures-drizzle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(256),
	"created_at" timestamp DEFAULT now(),
	"max_hp" integer,
	"challenge_rating" numeric,
	"is_player" boolean
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "encounter_participant-drizzle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_id" uuid,
	"creature_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "encounters-drizzle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(256),
	"description" varchar(256),
	"started_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings-drizzle" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"show_health_in_discord" boolean DEFAULT false,
	"show_icons_in_discord" boolean DEFAULT true,
	"average_turn_seconds" integer DEFAULT 180,
	"default_player_level" integer DEFAULT 1
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "encounter_index" ON "encounter_participant-drizzle" ("encounter_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creature_index" ON "encounter_participant-drizzle" ("creature_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encounter_participant-drizzle" ADD CONSTRAINT "encounter_participant-drizzle_encounter_id_encounters-drizzle_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "encounters-drizzle"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encounter_participant-drizzle" ADD CONSTRAINT "encounter_participant-drizzle_creature_id_creatures-drizzle_id_fk" FOREIGN KEY ("creature_id") REFERENCES "creatures-drizzle"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
