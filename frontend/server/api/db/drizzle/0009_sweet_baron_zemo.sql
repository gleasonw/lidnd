CREATE TABLE IF NOT EXISTS "settings-drizzle" (
	"user_id" bigint PRIMARY KEY NOT NULL,
	"show_health_in_discord" boolean DEFAULT false,
	"show_icons_in_discord" boolean DEFAULT true,
	"average_turn_seconds" integer DEFAULT 180 NOT NULL,
	"default_player_level" integer DEFAULT 1 NOT NULL
);
