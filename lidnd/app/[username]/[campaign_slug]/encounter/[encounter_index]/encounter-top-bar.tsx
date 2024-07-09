"use client";
import { Button } from "@/components/ui/button";
import { LidndPlusDialog } from "@/components/ui/lidnd_dialog";
import { Tip } from "@/components/ui/tip";
import { HealthMeterOverlay } from "@/encounters/[encounter_index]/battle-ui";
import { CharacterIcon } from "@/encounters/[encounter_index]/character-icon";
import { EncounterTime } from "@/encounters/[encounter_index]/encounter-time";
import { useEncounterUIStore } from "@/encounters/[encounter_index]/EncounterUiStore";
import {
  useCycleNextTurn,
  useCyclePreviousTurn,
  useEncounter,
} from "@/encounters/[encounter_index]/hooks";
import { ParticipantUpload } from "@/encounters/[encounter_index]/participant-add-form";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils } from "@/utils/participants";
import clsx from "clsx";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { observer } from "mobx-react-lite";
import { usePathname } from "next/navigation";

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
      <div className="flex gap-10 justify-center w-full">
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
        <Button
          className="ml-auto w-48 shadow-lg"
          onClick={cycleNext}
          disabled={isTurnLoading}
        >
          Next turn
          <ChevronRightIcon />
        </Button>
      </div>
      <ParticipantIcons />
    </div>
  );
}

function ParticipantIcons() {
  const [encounter] = useEncounter();
  const { setSelectedParticipantId } = useEncounterUIStore();

  const activeIndex = EncounterUtils.activeParticipantIndex(encounter);

  return (
    <div className="flex gap-1 flex-grow overflow-auto max-w-full h-28">
      {encounter.participants
        .toSorted(ParticipantUtils.sortLinearly)
        .map((p, index) => (
          <Tip text={ParticipantUtils.name(p)} key={p.id}>
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
              />
            </button>
          </Tip>
        ))}
      <LidndPlusDialog text="Add monster">
        <ParticipantUpload />
      </LidndPlusDialog>
    </div>
  );
}
