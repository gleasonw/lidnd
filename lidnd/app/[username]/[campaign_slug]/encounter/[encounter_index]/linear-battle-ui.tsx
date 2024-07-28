"use client";
import { Button } from "@/components/ui/button";
import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { api } from "@/trpc/react";
import { BattleCard } from "./battle-ui";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils } from "@/utils/participants";
import { CreatureStatBlockImage } from "@/encounters/original-size-image";
import { useEncounterId } from "@/encounters/[encounter_index]/encounter-id";
import { useRemoveParticipantFromEncounter } from "@/encounters/[encounter_index]/hooks";
import { useEncounterUIStore } from "@/encounters/[encounter_index]/EncounterUiStore";
import { observer } from "mobx-react-lite";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const LinearBattleUI = observer(function LinearBattleUI() {
  const id = useEncounterId();
  const [encounter] = api.encounterById.useSuspenseQuery(id);
  const [emblaApi, setEmblaApi] = useState<CarouselApi | null>(null);

  const activeParticipant = EncounterUtils.activeParticipant(encounter);

  const {
    selectedParticipantId: dmSelectedCreature,
    setSelectedParticipantId,
  } = useEncounterUIStore();

  const selectedId = dmSelectedCreature ?? activeParticipant?.id ?? null;

  const { mutate: removeCreatureFromEncounter } =
    useRemoveParticipantFromEncounter();

  const dmCreatures = EncounterUtils.participants(encounter).filter(
    (p) => !ParticipantUtils.isPlayer(p),
  );

  const [overrideMonstersPerPage, setOverrideMonstersPerPage] = React.useState<
    number | null
  >(null);

  const [screenWidth, setScreenWidth] = React.useState(0);

  const monstersPerPage =
    overrideMonstersPerPage ?? (screenWidth > 1000 ? 2 : 1);

  // watch the screen size
  // TODO: put this in the ui store
  useEffect(() => {
    const handleResize: ResizeObserverCallback = (entries) => {
      for (const entry of entries) {
        setScreenWidth(entry.contentRect.width);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(document.body);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    const selectedIndex = dmCreatures.findIndex((p) => p.id === selectedId);

    if (selectedIndex === -1) {
      return;
    }

    const adjustedIndex = Math.floor(selectedIndex / monstersPerPage);

    emblaApi.scrollTo(adjustedIndex);
  }, [selectedId, emblaApi, monstersPerPage]);

  return (
    <div className="flex gap-2 flex-col">
      <div className="flex gap-2 items-center">
        Monsters per page
        {[1, 2, 3].map((pageSize) => (
          <Button
            key={pageSize}
            variant={overrideMonstersPerPage === pageSize ? "outline" : "ghost"}
            onClick={() => setOverrideMonstersPerPage(pageSize)}
          >
            {pageSize}
          </Button>
        ))}
        <Button variant="ghost" onClick={() => emblaApi?.scrollPrev()}>
          <ArrowLeft />
        </Button>
        <Button variant="ghost" onClick={() => emblaApi?.scrollNext()}>
          <ArrowRight />
        </Button>
      </div>
      <Carousel setApi={setEmblaApi} opts={{ slidesToScroll: monstersPerPage }}>
        <CarouselContent>
          {dmCreatures
            ?.filter((p) => !ParticipantUtils.isPlayer(p))
            .map((participant) => (
              <CarouselItem
                key={participant.id}
                className={clsx({
                  "basis-1/2": monstersPerPage === 2,
                  "basis-1/3": monstersPerPage === 3,
                })}
              >
                <BattleCard
                  onClick={() => setSelectedParticipantId(participant.id)}
                  participant={participant}
                  className={clsx("cursor-pointer relative")}
                  battleCardExtraContent={
                    <>
                      <CreatureStatBlockImage creature={participant.creature} />
                      <Button
                        variant="destructive"
                        onClick={() =>
                          removeCreatureFromEncounter({
                            encounter_id: id,
                            participant_id: participant.id,
                          })
                        }
                      >
                        Remove from encounter
                      </Button>
                    </>
                  }
                />
              </CarouselItem>
            ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
});
