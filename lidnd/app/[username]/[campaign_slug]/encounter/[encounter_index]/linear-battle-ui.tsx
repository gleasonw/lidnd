"use client";
import { Button } from "@/components/ui/button";
import React from "react";
import { AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { api } from "@/trpc/react";
import { AnimationListItem, BattleCard } from "./battle-ui";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils } from "@/utils/participants";
import { OriginalSizeImage } from "@/app/[username]/[campaign_slug]/encounter/original-size-image";
import { getAWSimageURL } from "@/app/[username]/[campaign_slug]/encounter/utils";
import { useEncounterId } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/encounter-id";
import { useRemoveParticipantFromEncounter } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/hooks";
import { useEncounterUIStore } from "@/encounters/[encounter_index]/EncounterUiStore";
import { observer } from "mobx-react-lite";

export const LinearBattleUI = observer(function LinearBattleUI() {
  const id = useEncounterId();
  const [encounter] = api.encounterById.useSuspenseQuery(id);

  const activeIndex = EncounterUtils.activeParticipantIndex(encounter);
  const activeParticipant = EncounterUtils.activeParticipant(encounter);

  const {
    selectedParticipantId: dmSelectedCreature,
    setSelectedParticipantId,
  } = useEncounterUIStore();

  const selectedId = dmSelectedCreature ?? activeParticipant?.id ?? null;

  const { mutate: removeCreatureFromEncounter } =
    useRemoveParticipantFromEncounter();

  const displayedParticipants = EncounterUtils.participants(encounter);

  const selectedParticipant = displayedParticipants.find(
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
  }, [selectedId]);

  return (
    <div className="flex flex-col gap-5 relative">
      <div
        className={clsx(
          "flex flex-row sm:gap-4 px-8 pt-2 pb-8 max-w-full items-center overflow-auto mx-auto",
        )}
        ref={scrollContainer}
      >
        <AnimatePresence>
          {displayedParticipants?.slice().map((participant, index) => (
            <AnimationListItem key={participant.id}>
              <BattleCard
                onClick={() => setSelectedParticipantId(participant.id)}
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
            <span className="text-2xl p-5">
              {ParticipantUtils.name(selectedParticipant)} (Player)
            </span>
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
});
