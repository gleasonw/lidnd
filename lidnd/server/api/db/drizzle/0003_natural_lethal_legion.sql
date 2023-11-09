ALTER TABLE "channels" DROP CONSTRAINT "channels_discord_user_id_users_discord_id_fk";
--> statement-breakpoint
ALTER TABLE "channels" ALTER COLUMN "message_id" DROP NOT NULL;