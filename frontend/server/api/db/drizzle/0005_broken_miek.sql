ALTER TABLE "creatures-drizzle" ALTER COLUMN "challenge_rating" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "creatures-drizzle" ALTER COLUMN "challenge_rating" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "creatures-drizzle" ALTER COLUMN "challenge_rating" SET NOT NULL;