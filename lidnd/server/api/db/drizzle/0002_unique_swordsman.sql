ALTER TABLE "channels" DROP CONSTRAINT "channels_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "channels" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "channels" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "show_health_in_discord" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "show_icons_in_discord" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "discord_user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "discord_id" text NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "channels" ADD CONSTRAINT "channels_discord_user_id_users_discord_id_fk" FOREIGN KEY ("discord_user_id") REFERENCES "users"("discord_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "channels" DROP COLUMN IF EXISTS "user_id";