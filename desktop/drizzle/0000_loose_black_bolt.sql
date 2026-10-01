CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"system" text NOT NULL,
	"party_level" integer NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creatures" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"system" text NOT NULL,
	"kind" text NOT NULL,
	"campaign_id" uuid,
	"ev" integer,
	"cr" text,
	"max_hp" integer,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "party" (
	"campaign_id" uuid NOT NULL,
	"creature_id" uuid NOT NULL,
	CONSTRAINT "party_campaign_id_creature_id_pk" PRIMARY KEY("campaign_id","creature_id")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY NOT NULL,
	"campaign_id" uuid NOT NULL,
	"name" text NOT NULL,
	"target_difficulty" text NOT NULL,
	"notes" text NOT NULL,
	"tags" jsonb NOT NULL,
	"roster" jsonb NOT NULL,
	"reminders" jsonb NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"plan_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"started_at" text NOT NULL,
	"ended_at" text,
	"round" integer NOT NULL,
	"malice" integer NOT NULL,
	"active_participant_id" uuid,
	"notes" text NOT NULL,
	"participants" jsonb NOT NULL,
	"reminders" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"campaign_id" uuid NOT NULL,
	"name" text NOT NULL,
	"started_at" text NOT NULL,
	"ended_at" text,
	"victories" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creatures" ADD CONSTRAINT "creatures_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party" ADD CONSTRAINT "party_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party" ADD CONSTRAINT "party_creature_id_creatures_id_fk" FOREIGN KEY ("creature_id") REFERENCES "public"."creatures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;