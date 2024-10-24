"use client";
import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { api } from "@/trpc/react";
import { BattleCard } from "./battle-ui";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils as PU } from "@/utils/participants";
import { CreatureStatBlockImage } from "@/encounters/original-size-image";
import { useEncounterId } from "@/encounters/[encounter_index]/encounter-id";
import { useUpdateCreature } from "@/encounters/[encounter_index]/hooks";
import { useEncounterUIStore } from "@/encounters/[encounter_index]/EncounterUiStore";
import { observer } from "mobx-react-lite";
import { Input } from "@/components/ui/input";
import { makeAutoObservable } from "mobx";

function onSelectParticipant(id: string) {
  const selectedCardElement = document.querySelector(
    `[data-participant-id="${id}"]`,
  );
  if (selectedCardElement) {
    selectedCardElement.scrollIntoView({
      behavior: "instant",
    });
  }
}

export const LinearBattleUI = observer(function LinearBattleUI() {
  const id = useEncounterId();
  const [encounter] = api.encounterById.useSuspenseQuery(id);

  const {
    subscribeToSelectedParticipant,
    unsubscribeToSelectedParticipant,
    editingColSpan,
  } = useEncounterUIStore();

  const { mutate: updateCreature } = useUpdateCreature();

  const dmCreatures = EncounterUtils.participants(encounter)
    .filter((p) => !PU.isPlayer(p))
    .sort((a, b) => PU.statBlockAspectRatio(a) - PU.statBlockAspectRatio(b));

  useEffect(() => {
    // not sure this is the best way to apply a callback from a click on a distant element.
    // is more explicit about what the user wants, though.
    subscribeToSelectedParticipant(onSelectParticipant);
    return () => {
      unsubscribeToSelectedParticipant(onSelectParticipant);
    };
  }, []);
  const active = EncounterUtils.activeParticipant(encounter);

  useEffect(() => {
    if (active) {
      const activeElement = document.querySelector(`[data-is-active="true"]`);
      if (!activeElement) {
        return;
      }
      activeElement.scrollIntoView({
        behavior: "instant",
      });
    }
  }, [active]);

  const firstHalf = Math.floor(dmCreatures.length / 2);

  return (
    <div className="flex flex-wrap">
      <DraggableColumnContainer>
        <DraggableColumn>
          {dmCreatures.slice(0, firstHalf).map((participant) => (
            <BattleCard
              participant={participant}
              data-is-active={participant.is_active}
              data-participant-id={participant.id}
              key={participant.id}
              battleCardExtraContent={
                <>
                  {editingColSpan && (
                    <Input
                      type="number"
                      min={1}
                      max={2}
                      value={PU.colSpan(participant)}
                      onChange={(e) => {
                        const parsedInt = parseInt(e.target.value);
                        if (isNaN(parsedInt)) {
                          return;
                        }
                        updateCreature({
                          ...participant.creature,
                          col_span: parsedInt,
                        });
                      }}
                    />
                  )}
                  <CreatureStatBlockImage creature={participant.creature} />
                </>
              }
            />
          ))}
        </DraggableColumn>
        <DraggableColumn>
          {dmCreatures
            .slice(firstHalf, dmCreatures.length)
            .map((participant) => (
              <BattleCard
                participant={participant}
                data-is-active={participant.is_active}
                data-participant-id={participant.id}
                key={participant.id}
                battleCardExtraContent={
                  <>
                    {editingColSpan && (
                      <Input
                        type="number"
                        min={1}
                        max={2}
                        value={PU.colSpan(participant)}
                        onChange={(e) => {
                          const parsedInt = parseInt(e.target.value);
                          if (isNaN(parsedInt)) {
                            return;
                          }
                          updateCreature({
                            ...participant.creature,
                            col_span: parsedInt,
                          });
                        }}
                      />
                    )}
                    <CreatureStatBlockImage creature={participant.creature} />
                  </>
                }
              />
            ))}
        </DraggableColumn>
      </DraggableColumnContainer>
    </div>
  );
});

const DraggableContainerWidthContext = React.createContext<{
  width: number | null;
} | null>(null);

const useDraggableContainerWidthContext = () => {
  const widthState = React.useContext(DraggableContainerWidthContext);
  if (widthState === null) {
    throw new Error(`drag container width context not called under provider`);
  }
  return widthState.width;
};

function DraggableColumnContainer({ children }: { children: React.ReactNode }) {
  const [parentWidth, setParentWidth] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    setParentWidth(containerRef.current.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) {
        throw new Error(`no element to observe in DraggableColumnContainer`);
      }
      if (entry.contentRect.width === 0) {
        return;
      }
      setParentWidth(entry.contentRect.width);
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [containerRef, setParentWidth]);

  return (
    <DraggableContainerWidthContext.Provider value={{ width: parentWidth }}>
      {parentWidth}
      <div className="flex w-full" ref={containerRef}>
        {children}
      </div>
    </DraggableContainerWidthContext.Provider>
  );
}

function DraggableColumn({ children }: { children: React.ReactNode }) {
  const [percentWidth, setPercentWidth] = useState(50);
  const parentWidth = useDraggableContainerWidthContext();

  const handleMouseDown = (e: React.MouseEvent) => {
    const startX = e.clientX;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (parentWidth === null) {
        throw new Error(`null parent width`);
      }
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / parentWidth) * 100;
      setPercentWidth(percentWidth + deltaPercent);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      className="flex flex-col relative"
      style={{ width: `${percentWidth}%` }}
    >
      {children}
      <div
        onMouseDown={handleMouseDown}
        style={{ cursor: "ew-resize" }}
        className="absolute right-0 top-0 bottom-0 w-2 bg-gray-300 hover:bg-gray-500"
      ></div>
    </div>
  );
}
