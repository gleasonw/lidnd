"use client";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import React from "react";
import { AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { api } from "@/trpc/react";
import { ParticipantWithData } from "@/server/api/router";
import { AnimationListItem, BattleCard, useBattleUIStore } from "./battle-ui";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils } from "@/utils/participants";
import { OriginalSizeImage } from "@/app/[username]/[campaign_slug]/encounter/original-size-image";
import { getAWSimageURL } from "@/app/[username]/[campaign_slug]/encounter/utils";
import { useEncounterId } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/encounter-id";
import { useRemoveParticipantFromEncounter } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/hooks";

export function LinearBattleUI() {
  const id = useEncounterId();
  const [encounter] = api.encounterById.useSuspenseQuery(id);

  const encounterParticipants = encounter.participants.toSorted(
    ParticipantUtils.sortLinearly,
  );

  const { encounterById } = api.useUtils();
  const { displayReminders } = useBattleUIStore();

  const { mutate: cycleNextMutation, isPending: isLoadingNextTurn } =
    api.cycleNextTurn.useMutation({
      onSettled: async () => {
        displayReminders(encounter);
        return await encounterById.invalidate(id);
      },
    });

  const { mutate: cyclePreviousMutation, isPending: isLoadingPreviousTurn } =
    api.cyclePreviousTurn.useMutation({
      onSettled: async () => {
        return await encounterById.invalidate(id);
      },
    });

  let displayedParticipants: ParticipantWithData[];

  if (isLoadingNextTurn && encounterParticipants) {
    const { updatedParticipants } = EncounterUtils.cycleNextTurn(encounter);
    displayedParticipants = updatedParticipants;
  } else if (isLoadingPreviousTurn && encounterParticipants) {
    const { updatedParticipants } = EncounterUtils.cyclePreviousTurn(encounter);
    displayedParticipants = updatedParticipants;
  } else {
    displayedParticipants = encounterParticipants;
  }

  const activeIndex = displayedParticipants.findIndex(
    (creature) => creature.is_active,
  );
  const activeParticipant = displayedParticipants[activeIndex];

  const [dmSelectedCreature, setDmSelectedCreature] = React.useState(
    activeParticipant?.id ?? null,
  );

  const selectedId = dmSelectedCreature ?? activeParticipant?.id ?? null;

  const { mutate: removeCreatureFromEncounter } =
    useRemoveParticipantFromEncounter();

  function cycleNext() {
    cycleNextMutation({ encounter_id: id });
    const { newlyActiveParticipant } = EncounterUtils.cycleNextTurn(encounter);
    setDmSelectedCreature(newlyActiveParticipant.id);
  }

  function cyclePrevious() {
    cyclePreviousMutation({ encounter_id: id });
    const { newlyActiveParticipant } =
      EncounterUtils.cyclePreviousTurn(encounter);
    setDmSelectedCreature(newlyActiveParticipant.id);
  }

  const selectedParticipant = displayedParticipants?.find(
    (participant) => participant.id === selectedId,
  );

  const scrollContainer = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollContainer.current) {
      const activeElement =
        scrollContainer.current.querySelector("[data-active=true]");
      if (activeElement) {
        scrollContainer.current.scrollTo({
          left:
            activeElement.getBoundingClientRect().left +
            scrollContainer.current.scrollLeft -
            scrollContainer.current.getBoundingClientRect().left,
          behavior: "smooth",
        });
      }
    }
  }, [activeParticipant?.id]);

  const isTurnLoading = isLoadingNextTurn || isLoadingPreviousTurn;

  return (
    <div className="flex flex-col gap-5 relative">
      <div
        className={clsx(
          "flex flex-row sm:gap-4 px-8 pt-2 pb-8 max-w-full items-center overflow-auto mx-auto",
        )}
        ref={scrollContainer}
      >
        <Button
          className="absolute left-0 sm:left-10 z-10 h-10 rounded-full shadow-md"
          onClick={cyclePrevious}
          disabled={isTurnLoading}
        >
          <ChevronLeftIcon />
        </Button>
        <AnimatePresence>
          {displayedParticipants?.slice().map((participant, index) => (
            <AnimationListItem key={participant.id}>
              <BattleCard
                onClick={() => setDmSelectedCreature(participant.id)}
                participant={participant}
                isSelected={participant.id === selectedId}
                className={clsx(
                  {
                    "opacity-40":
                      !(participant.id === selectedId) &&
                      activeIndex &&
                      index < activeIndex,
                  },
                  "cursor-pointer",
                )}
              />
            </AnimationListItem>
          ))}
        </AnimatePresence>
        <Button
          className="absolute right-0 sm:right-10 z-10 h-10 rounded-full shadow-md"
          onClick={cycleNext}
          disabled={isTurnLoading}
        >
          <ChevronRightIcon />
        </Button>
      </div>

      {selectedParticipant && (
        <>
          {!ParticipantUtils.isPlayer(selectedParticipant) ? (
            <OriginalSizeImage
              src={getAWSimageURL(
                selectedParticipant.creature_id,
                "stat_block",
              )}
              alt={
                "stat block for " + ParticipantUtils.name(selectedParticipant)
              }
              key={selectedParticipant.creature_id}
            />
          ) : (
            <span className="text-2xl p-5">Player</span>
          )}
          <Button
            variant="destructive"
            onClick={() =>
              removeCreatureFromEncounter({
                encounter_id: id,
                participant_id: selectedParticipant.id,
              })
            }
          >
            Remove from encounter
          </Button>
        </>
      )}
    </div>
  );
}
