"use client";

import { useCampaign } from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { QuickAddParticipantsButton } from "@/app/[username]/[campaign_slug]/game-session-quick-add";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import { EncounterId } from "@/encounters/[encounter_index]/encounter-id";
import {
  useEncounter,
  useRemoveParticipantFromEncounter,
} from "@/encounters/[encounter_index]/hooks";
import { DifficultyBadge } from "@/encounters/campaign-encounters-overview";
import { useEncounterLinks } from "@/encounters/link-hooks";
import { EncounterUtils } from "@/utils/encounters";
import Link from "next/link";

export function EncounterCard({ encounter }: { encounter: { id: string } }) {
  return (
    <EncounterId encounterId={encounter.id}>
      <EncounterDetails />
    </EncounterId>
  );
}

function EncounterDetails() {
  const [encounterData] = useEncounter();
  const [campaignData] = useCampaign();
  const { mutate: removeParticipant } = useRemoveParticipantFromEncounter();
  const { encounter: encounterLink } = useEncounterLinks();
  const monsters = EncounterUtils.monsters(encounterData);
  return (
    <li className="flex flex-col gap-4 rounded-lg border bg-background p-4 shadow-sm">
      <Link href={encounterLink}>
        <div className="flex items-start justify-between gap-3 hover:bg-gray-10">
          <div className="space-y-1">
            <p className="text-base font-medium">
              {encounterData.name || "Unnamed encounter"}
            </p>
          </div>
          <DifficultyBadge encounter={encounterData} />
        </div>
      </Link>
      <div className="flex gap-2 h-12">
        {monsters.length > 0 && (
          <div className="flex -space-x-4 h-16">
            {monsters?.map((p) => (
              <button
                className="rounded-full w-12 h-12 flex items-center justify-center overflow-hidden border-2 border-white bg-white"
                key={p.id}
                onClick={() =>
                  removeParticipant({
                    participant_id: p.id,
                    encounter_id: encounterData.id,
                  })
                }
              >
                <CreatureIcon creature={p.creature} size="v-small" />
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center w-12 h-12">
          <QuickAddParticipantsButton
            encounterId={encounterData.id}
            campaignId={campaignData.id}
            innerText={monsters && monsters.length > 0 ? "" : "Monsters"}
          />
        </div>
      </div>
    </li>
  );
}
