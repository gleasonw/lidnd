CREATE TABLE IF NOT EXISTS "creatures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(256) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"max_hp" integer NOT NULL,
	"challenge_rating" real DEFAULT 0 NOT NULL,
	"is_player" boolean,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "encounter_participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_id" uuid NOT NULL,
	"creature_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"initiative" integer DEFAULT 0 NOT NULL,
	"hp" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "encounters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(256),
	"description" varchar(256),
	"started_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_key" (
	"id" varchar(256) PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"hashed_password" varchar(256)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_session" (
	"id" varchar(256) PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"active_expires" bigint NOT NULL,
	"idle_expires" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"show_health_in_discord" boolean DEFAULT false,
	"show_icons_in_discord" boolean DEFAULT true,
	"average_turn_seconds" integer DEFAULT 180 NOT NULL,
	"default_player_level" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" varchar(256) NOT NULL,
	"avatar" varchar(256)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_index" ON "creatures" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "encounter_index" ON "encounter_participant" ("encounter_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creature_index" ON "encounter_participant" ("creature_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_index" ON "encounters" ("user_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "creatures" ADD CONSTRAINT "creatures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encounter_participant" ADD CONSTRAINT "encounter_participant_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encounter_participant" ADD CONSTRAINT "encounter_participant_creature_id_creatures_id_fk" FOREIGN KEY ("creature_id") REFERENCES "creatures"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encounters" ADD CONSTRAINT "encounters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_key" ADD CONSTRAINT "user_key_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_session" ADD CONSTRAINT "user_session_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;