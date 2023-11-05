ALTER TABLE "encounter_participant-drizzle" DROP CONSTRAINT "encounter_participant-drizzle_encounter_id_encounters-drizzle_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encounter_participant-drizzle" ADD CONSTRAINT "encounter_participant-drizzle_encounter_id_encounters-drizzle_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "encounters-drizzle"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
