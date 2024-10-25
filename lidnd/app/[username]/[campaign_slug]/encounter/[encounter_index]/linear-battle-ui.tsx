"use client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import * as R from "remeda";

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
  }, [subscribeToSelectedParticipant, unsubscribeToSelectedParticipant]);
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

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [parentWidth, setParentWidth] = useState<number | null>(null);

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
        console.log(`does entry no longer exist? ${entry}`);
        return;
      }
      setParentWidth(entry.contentRect.width);
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  const firstHalf = Math.floor(dmCreatures.length / 2);

  const [columns, setColumns] = React.useState<Record<string, Column>>({
    test1: { id: "test1", percentWidth: 50 },
    test2: { id: "test2", percentWidth: 50 },
  });

  const setColumnWidth = useCallback((id: string, newWidth: number) => {
    setColumns((prevColumns) => ({
      ...prevColumns,
      [id]: { ...prevColumns[id]!, percentWidth: newWidth },
    }));
  }, []);

  return (
    <div className="flex relative" ref={containerRef}>
      <div className="absolute top-0 right-0 text-xl z-10">{parentWidth}</div>
      <StatColumn column={columns["test1"]}>
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
      </StatColumn>
      {parentWidth !== null ? (
        <DraggableSplitter
          leftColumn={columns["test1"]}
          rightColumn={columns["test2"]}
          setColumnWidth={setColumnWidth}
          parentWidth={parentWidth}
        />
      ) : null}
      <StatColumn column={columns["test2"]}>
        {dmCreatures.slice(firstHalf, dmCreatures.length).map((participant) => (
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
      </StatColumn>
    </div>
  );
});

type Column = {
  percentWidth: number;
  id: string;
};

function DraggableSplitter({
  rightColumn,
  leftColumn,
  setColumnWidth,
  parentWidth,
}: {
  rightColumn: Column;
  leftColumn: Column;
  setColumnWidth: (id: string, newWidth: number) => void;
  parentWidth: number;
}) {
  const handleMouseDown = (e: React.MouseEvent) => {
    const startX = e.clientX;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (parentWidth === null) {
        throw new Error(`null parent width`);
      }
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / parentWidth) * 100;
      setColumnWidth(leftColumn.id, leftColumn.percentWidth + deltaPercent);
      setColumnWidth(rightColumn.id, rightColumn.percentWidth - deltaPercent);
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
      className="w-2 bg-gray-300 hover:bg-gray-500"
      style={{ cursor: "ew-resize" }}
    />
  );
}

function StatColumn({
  children,
  column,
}: {
  children: React.ReactNode;
  column: Column;
}) {
  return (
    <div
      className="flex flex-col relative"
      style={{ width: `${column.percentWidth}%` }}
    >
      {children}
    </div>
  );
}
