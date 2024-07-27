"use client";
import { appRoutes } from "@/app/routes";
import { Button } from "@/components/ui/button";
import { LidndPlusDialog } from "@/components/ui/lidnd_dialog";
import { ButtonWithTooltip, Tip } from "@/components/ui/tip";
import { HealthMeterOverlay } from "@/encounters/[encounter_index]/battle-ui";
import { CharacterIcon } from "@/encounters/[encounter_index]/character-icon";
import { EncounterTime } from "@/encounters/[encounter_index]/encounter-time";
import { useEncounterUIStore } from "@/encounters/[encounter_index]/EncounterUiStore";
import {
  useCycleNextTurn,
  useCyclePreviousTurn,
  useEncounter,
} from "@/encounters/[encounter_index]/hooks";
import InitiativeInput from "@/encounters/[encounter_index]/InitiativeInput";
import { ParticipantUpload } from "@/encounters/[encounter_index]/participant-add-form";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils } from "@/utils/participants";
import clsx from "clsx";
import { ChevronLeftIcon, ChevronRightIcon, Share } from "lucide-react";
import { observer } from "mobx-react-lite";
import { usePathname } from "next/navigation";
import React from "react";

export const EncounterTopBar = observer(function EncounterTopBar() {
  const url = usePathname();
  const status = url.split("/").at(-1);

  if (status !== "run") {
    return null;
  }

  return <BattleTopBar />;
});

function BattleTopBar() {
  const [encounter] = useEncounter();
  const [isEditingInitiative, setIsEditingInitiative] = React.useState(false);

  const { setSelectedParticipantId } = useEncounterUIStore();

  const { mutate: cycleNextMutation, isPending: isLoadingNextTurn } =
    useCycleNextTurn();
  const { mutate: cyclePreviousMutation, isPending: isLoadingPreviousTurn } =
    useCyclePreviousTurn();

  function cycleNext() {
    cycleNextMutation({ encounter_id: encounter.id });
    const { newlyActiveParticipant } = EncounterUtils.cycleNextTurn(encounter);
    setSelectedParticipantId(newlyActiveParticipant.id);
  }

  function cyclePrevious() {
    cyclePreviousMutation({ encounter_id: encounter.id });
    const { newlyActiveParticipant } =
      EncounterUtils.cyclePreviousTurn(encounter);
    setSelectedParticipantId(newlyActiveParticipant.id);
  }

  const roundText =
    encounter?.current_round === 0
      ? "Surprise round"
      : `Round ${encounter?.current_round}`;

  const isTurnLoading = isLoadingNextTurn || isLoadingPreviousTurn;
  return (
    <div className="flex w-full flex-col gap-5 items-center">
      <div className="flex gap-10 justify-center w-full items-center">
        <Button
          className="mr-auto w-48 shadow-lg"
          variant="outline"
          onClick={cyclePrevious}
          disabled={isTurnLoading}
        >
          <ChevronLeftIcon />
          Previous turn
        </Button>
        <h1 className="text-xl">{roundText}</h1>
        <EncounterTime time={encounter.started_at ?? undefined} />
        <ButtonWithTooltip
          onClick={() => {
            navigator.clipboard.writeText(
              `${window.location.origin}${appRoutes.observe(encounter.id)}`,
            );
          }}
          className="flex gap-2 items-center"
          variant="ghost"
          text={"Get sharable link"}
        >
          <Share />
        </ButtonWithTooltip>
        <Button
          variant="outline"
          onClick={() => setIsEditingInitiative(!isEditingInitiative)}
        >
          Edit initiative
        </Button>
        <Button
          className="ml-auto w-48 shadow-lg"
          onClick={cycleNext}
          disabled={isTurnLoading}
        >
          Next turn
          <ChevronRightIcon />
        </Button>
      </div>
      <ParticipantIcons isEditingInitiative={isEditingInitiative} />
    </div>
  );
}

function ParticipantIcons({
  isEditingInitiative,
}: {
  isEditingInitiative: boolean;
}) {
  const [encounter] = useEncounter();
  const { setSelectedParticipantId } = useEncounterUIStore();

  const activeIndex = EncounterUtils.activeParticipantIndex(encounter);

  return (
    <div
      className={`flex gap-1 flex-grow overflow-auto max-w-full ${isEditingInitiative ? "h-auto" : "h-28"}`}
    >
      {encounter.participants
        .toSorted(ParticipantUtils.sortLinearly)
        .map((p, index) => (
          <div className="flex gap-2 flex-col" key={p.id}>
            <Tip text={ParticipantUtils.name(p)}>
              <button
                className={clsx(
                  "w-20 border-4 flex-grow-0 flex justify-center items-center transition-all h-16 relative",
                  ParticipantUtils.isFriendly(p)
                    ? "border-blue-600"
                    : "border-red-600",
                  p.is_active && "h-28",
                  index < activeIndex
                    ? "opacity-60 hover:opacity-100"
                    : "hover:opacity-60",
                )}
                onClick={() => setSelectedParticipantId(p.id)}
              >
                <HealthMeterOverlay participant={p} />
                <CharacterIcon
                  className="object-contain max-h-full max-w-full"
                  id={p.creature_id}
                  name={ParticipantUtils.name(p)}
                  size="none"
                />
              </button>
            </Tip>
            {isEditingInitiative ? <InitiativeInput participant={p} /> : null}
          </div>
        ))}
      <LidndPlusDialog text="Add monster">
        <ParticipantUpload />
      </LidndPlusDialog>
    </div>
  );
}
