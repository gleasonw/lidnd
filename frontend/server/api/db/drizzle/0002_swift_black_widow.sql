ALTER TABLE "encounters-drizzle" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_index" ON "encounters-drizzle" ("user_id");  