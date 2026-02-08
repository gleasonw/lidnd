"use client";

import { useCampaign } from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { useUser } from "@/app/[username]/user-provider";
import { appRoutes } from "@/app/routes";
import { Button } from "@/components/ui/button";
import { LidndDialog } from "@/components/ui/lidnd_dialog";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import {
  useAddExistingCreatureAsParticipant,
  useEncounter,
  useRemoveParticipantFromEncounter,
} from "@/encounters/[encounter_index]/hooks";
import { TrashIcon, UsersIcon } from "lucide-react";
import Link from "next/link";

interface AddPlayerToEncounterProps {
  trigger?: React.ReactNode;
}

export function AddPlayerToEncounter(props: AddPlayerToEncounterProps) {
  const [campaign] = useCampaign();
  const [encounter] = useEncounter();
  const user = useUser();
  const addPlayer = useAddExistingCreatureAsParticipant({
    id: encounter.id,
    campaign_id: campaign.id,
  });
  const removeParticipant = useRemoveParticipantFromEncounter();

  const partyPlayers = campaign.campaignToPlayers
    .map((link) => link.player)
    .sort((a, b) => a.name.localeCompare(b.name));

  const playerParticipantsByCreatureId = new Map<
    string,
    typeof encounter.participants
  >();
  for (const participant of encounter.participants) {
    if (participant.creature.type !== "player") {
      continue;
    }
    const existing =
      playerParticipantsByCreatureId.get(participant.creature_id) ?? [];
    existing.push(participant);
    playerParticipantsByCreatureId.set(participant.creature_id, existing);
  }

  async function togglePlayer(playerId: string, hp: number) {
    const matchingParticipants = playerParticipantsByCreatureId.get(playerId);
    if (matchingParticipants && matchingParticipants.length > 0) {
      await Promise.all(
        matchingParticipants.map((participant) =>
          removeParticipant.mutateAsync({
            encounter_id: encounter.id,
            participant_id: participant.id,
          })
        )
      );
      return;
    }

    await addPlayer.mutateAsync({
      encounter_id: encounter.id,
      creature_id: playerId,
      hp,
      is_ally: true,
    });
  }

  const mutationError = addPlayer.error ?? removeParticipant.error;
  const isMutating = addPlayer.isPending || removeParticipant.isPending;

  return (
    <LidndDialog
      title="Party members"
      trigger={
        props.trigger ?? (
          <Button>
            <UsersIcon />
            Add players
          </Button>
        )
      }
      content={
        <div className="p-4 w-full min-w-[420px] max-h-[600px] overflow-auto">
          {partyPlayers.length === 0 ? (
            <div className="flex flex-col items-start gap-3">
              <div className="text-sm text-muted-foreground">
                No players in party yet.
              </div>
              <Link href={appRoutes.party({ campaign, user })}>
                <Button variant="outline" size="sm">
                  Go to Party
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {partyPlayers.map((player) => {
                const linkedParticipants =
                  playerParticipantsByCreatureId.get(player.id) ?? [];
                const isInEncounter = linkedParticipants.length > 0;
                return (
                  <div
                    key={player.id}
                    className="flex items-center gap-3 rounded border p-2"
                  >
                    <CreatureIcon creature={player} size="small" />
                    <div className="flex flex-col flex-1">
                      <span className="font-medium truncate">
                        {player.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {isInEncounter ? "In encounter" : "Not in encounter"}
                      </span>
                    </div>
                    <Button
                      variant={isInEncounter ? "destructive" : "secondary"}
                      size="sm"
                      disabled={isMutating}
                      onClick={() => {
                        togglePlayer(player.id, player.max_hp).catch(
                          console.error
                        );
                      }}
                    >
                      {isInEncounter ? <TrashIcon /> : <UsersIcon />}
                      {isInEncounter ? "Remove" : "Add"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
          {mutationError ? (
            <div className="text-sm text-red-600 mt-3">
              {mutationError.message}
            </div>
          ) : null}
        </div>
      }
    />
  );
}
