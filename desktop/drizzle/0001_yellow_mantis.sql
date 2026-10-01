CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"mime_type" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creatures" ADD COLUMN "icon_asset_id" uuid;--> statement-breakpoint
ALTER TABLE "creatures" ADD COLUMN "stat_block_asset_id" uuid;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "reference_asset_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "reference_asset_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "creatures" ADD CONSTRAINT "creatures_icon_asset_id_assets_id_fk" FOREIGN KEY ("icon_asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creatures" ADD CONSTRAINT "creatures_stat_block_asset_id_assets_id_fk" FOREIGN KEY ("stat_block_asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;