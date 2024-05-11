import { mergeEncounterCreature } from "@/app/dashboard/campaigns/[campaign]/encounters/utils";
import { db } from "@/server/api/db";
import {
  creatures,
  encounter_participant,
  encounters,
} from "@/server/api/db/schema";
import { EncounterWithParticipants } from "@/server/api/router";
import { eq, and, ilike } from "drizzle-orm";

export async function campaignEncounters(
  user_id: string,
  campaign_id: string
): Promise<EncounterWithParticipants[]> {
  const encountersWithParticipants = await db
    .select()
    .from(encounters)
    .where(
      and(
        eq(encounters.user_id, user_id),
        eq(encounters.campaign_id, campaign_id)
      )
    )
    .leftJoin(
      encounter_participant,
      eq(encounters.id, encounter_participant.encounter_id)
    )
    .leftJoin(creatures, eq(encounter_participant.creature_id, creatures.id));

  const response = encountersWithParticipants.reduce<
    Record<string, EncounterWithParticipants>
  >((acc, row) => {
    const encounter = row["encounters"];
    const participant = row["encounter_participant"];
    const creature = row["creatures"];
    if (!acc[encounter.id]) {
      acc[encounter.id] = {
        ...encounter,
        participants: [],
      };
    }
    if (!participant || !creature) return acc;
    acc[encounter.id].participants.push(
      mergeEncounterCreature(participant, creature)
    );
    return acc;
  }, {});

  return Object.values(response);
}
