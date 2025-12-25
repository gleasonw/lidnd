"use client";

import { useCampaign } from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { QuickAddParticipantsButton } from "@/app/[username]/[campaign_slug]/game-session-quick-add";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import { EncounterId } from "@/encounters/[encounter_index]/encounter-id";
import {
  useEncounter,
  useRemoveParticipantFromEncounter,
  useUpdateCampaignEncounter,
} from "@/encounters/[encounter_index]/hooks";
import { DifficultyBadge } from "@/encounters/campaign-encounters-overview";
import { useEncounterLinks } from "@/encounters/link-hooks";
import { EncounterUtils } from "@/utils/encounters";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EncounterCard({ encounter }: { encounter: { id: string } }) {
  return (
    <EncounterId encounterId={encounter.id}>
      <EncounterDetails />
    </EncounterId>
  );
}
const maxMonstersToShow = 10;

function EncounterDetails() {
  const [encounterData] = useEncounter();
  const [campaignData] = useCampaign();
  const { mutate: removeParticipant } = useRemoveParticipantFromEncounter();
  const { mutate: updateEncounter } = useUpdateCampaignEncounter();
  const { encounter: encounterLink } = useEncounterLinks();
  if (encounterData.is_archived) {
    return null;
  }
  const monsters = EncounterUtils.monsters(encounterData);
  const isOverflowing = monsters.length > maxMonstersToShow;
  return (
    <li className="flex flex-col gap-4 rounded-lg border bg-background p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={encounterLink}
          className="flex flex-1 items-start justify-between gap-3 hover:bg-gray-10"
        >
          <div className="space-y-1">
            <p className="text-base font-medium">
              {encounterData.name || "Unnamed encounter"}
            </p>
          </div>
          <DifficultyBadge encounter={encounterData} />
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            updateEncounter({ id: encounterData.id, is_archived: true })
          }
        >
          Archive
        </Button>
      </div>
      <div className="flex gap-2 h-12">
        {monsters.length > 0 && (
          <div className="flex -space-x-4 h-16">
            {monsters?.slice(0, maxMonstersToShow).map((p) => (
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
            {isOverflowing && (
              <div className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-white bg-gray-200 text-sm font-medium text-gray-600">
                +{monsters.length - maxMonstersToShow}
              </div>
            )}
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
