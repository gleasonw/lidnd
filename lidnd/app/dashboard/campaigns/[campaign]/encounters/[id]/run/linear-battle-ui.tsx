"use client";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import React from "react";
import { AnimatePresence } from "framer-motion";
import { cycleNextTurn, cyclePreviousTurn, getAWSimageURL } from "../../utils";
import clsx from "clsx";
import { api } from "@/trpc/react";
import { useEncounterId } from "../hooks";
import { EncounterCreature } from "@/server/api/router";
import { useRemoveParticipantFromEncounter } from "../hooks";
import { OriginalSizeImage } from "../../original-size-image";
import { AnimationListItem, BattleCard } from "./battle-ui";

export function LinearBattleUI() {
  const id = useEncounterId();
  const [encounter] = api.encounterById.useSuspenseQuery(id);
  const encounterParticipants = encounter.participants;
  const { encounterById } = api.useUtils();

  const { mutate: cycleNextMutation, isLoading: isLoadingNextTurn } =
    api.cycleNextTurn.useMutation({
      onSettled: async () => {
        return await encounterById.invalidate(id);
      },
    });

  const { mutate: cyclePreviousMutation, isLoading: isLoadingPreviousTurn } =
    api.cyclePreviousTurn.useMutation({
      onSettled: async () => {
        return await encounterById.invalidate(id);
      },
    });

  let displayedParticipants: EncounterCreature[];

  if (isLoadingNextTurn && encounterParticipants) {
    const { updatedParticipants } = cycleNextTurn(
      encounterParticipants,
      encounter,
    );
    displayedParticipants = updatedParticipants;
  } else if (isLoadingPreviousTurn && encounterParticipants) {
    const { updatedParticipants } = cyclePreviousTurn(
      encounterParticipants,
      encounter,
    );
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

  function handleCycleNext() {
    cycleNextMutation({ encounter_id: id });
    const { newlyActiveParticipant } = cycleNextTurn(
      encounterParticipants,
      encounter,
    );
    setDmSelectedCreature(newlyActiveParticipant.id);
  }

  function handleCyclePrevious() {
    cyclePreviousMutation({ encounter_id: id });
    const { newlyActiveParticipant } = cyclePreviousTurn(
      encounterParticipants,
      encounter,
    );
    setDmSelectedCreature(newlyActiveParticipant.id);
  }

  const creature = displayedParticipants?.find(
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
    <div className="flex flex-col gap-5">
      <div
        className={clsx(
          "flex flex-row sm:gap-4 px-8 pt-2 pb-8 max-w-full items-center overflow-auto mx-auto",
        )}
        ref={scrollContainer}
      >
        <Button
          className="absolute left-0 sm:left-10 z-10 h-10 rounded-full shadow-md"
          onClick={handleCyclePrevious}
          variant="outline"
          disabled={isTurnLoading}
        >
          <ChevronLeftIcon />
        </Button>
        <AnimatePresence>
          {displayedParticipants?.slice().map((participant, index) => (
            <AnimationListItem key={participant.id}>
              <BattleCard
                onClick={() => setDmSelectedCreature(participant.id)}
                creature={participant}
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
          onClick={handleCycleNext}
          disabled={isTurnLoading}
          variant="outline"
        >
          <ChevronRightIcon />
        </Button>
      </div>

      {creature && (
        <>
          {!creature.is_player ? (
            <OriginalSizeImage
              src={getAWSimageURL(creature.creature_id, "stat_block")}
              alt={"stat block for " + creature.name}
              key={creature.creature_id}
            />
          ) : (
            <span className="text-2xl p-5">Player</span>
          )}
          <Button
            variant="destructive"
            onClick={() =>
              removeCreatureFromEncounter({
                encounter_id: id,
                participant_id: creature.id,
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
