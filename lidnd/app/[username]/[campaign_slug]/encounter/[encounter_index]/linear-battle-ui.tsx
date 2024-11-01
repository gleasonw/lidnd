"use client";
import React, { createContext, useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import { BattleCard } from "./battle-ui";
import { EncounterUtils } from "@/utils/encounters";
import { useEncounterId } from "@/encounters/[encounter_index]/encounter-id";
import {
  useEncounter,
  useRemoveParticipantFromEncounter,
} from "@/encounters/[encounter_index]/hooks";
import { useEncounterUIStore } from "@/encounters/[encounter_index]/EncounterUiStore";
import { observer } from "mobx-react-lite";
import type { stat_columns } from "@/server/api/db/schema";
import { Button } from "@/components/ui/button";
import { Grip, Plus, Trash, X } from "lucide-react";
import { StatColumnUtils } from "@/utils/stat-columns";
import { ParticipantUtils } from "@/utils/participants";
import { dragTypes, typedDrag } from "@/app/[username]/utils";
import { ButtonWithTooltip } from "@/components/ui/tip";
import type { StatColumn } from "@/server/api/columns-router";

// todo: fix status effects
//todo: give participants stable order within column
//todo: custom margin when in editing layout mode

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

const ParentWidthContext = createContext<number | null>(null);

export const LinearBattleUI = observer(function LinearBattleUI() {
  const id = useEncounterId();
  const [encounter] = api.encounterById.useSuspenseQuery(id);

  const { subscribeToSelectedParticipant, unsubscribeToSelectedParticipant } =
    useEncounterUIStore();

  useEffect(() => {
    // not sure this is the best way to apply a callback from a click on a distant element.
    // is more explicit about what the user wants, though.
    subscribeToSelectedParticipant(onSelectParticipant);
    return () => {
      unsubscribeToSelectedParticipant(onSelectParticipant);
    };
  }, [subscribeToSelectedParticipant, unsubscribeToSelectedParticipant]);
  const activeParticipantID = EncounterUtils.activeParticipant(encounter)?.id;

  useEffect(() => {
    if (!activeParticipantID) {
      return;
    }
    const activeElement = document.querySelector(`[data-is-active="true"]`);
    if (!activeElement) {
      return;
    }
    activeElement.scrollIntoView({
      behavior: "instant",
    });
  }, [activeParticipantID]);

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

  return (
    <div className="flex relative gap-5" ref={containerRef}>
      {encounter.is_editing_columns ? (
        <>
          <div className="absolute -top-10 h-10 right-0 text-xl z-10">
            <CreateNewColumnButton />
          </div>
          <ParentWidthContext.Provider value={parentWidth}>
            <StatColumns />
          </ParentWidthContext.Provider>
        </>
      ) : (
        <ReadOnlyStatColumns />
      )}
    </div>
  );
});

function ReadOnlyStatColumns() {
  const [encounter] = useEncounter();
  const { data: columns } = api.getColumns.useQuery(encounter.id);
  return columns?.map((c) => <ReadOnlyStatColumn column={c} key={c.id} />);
}

function ReadOnlyStatColumn({ column }: { column: StatColumn }) {
  return (
    <div
      className="flex flex-col gap-10"
      style={{ width: `${column.percent_width}%` }}
    >
      <BattleCards columnId={column.id} />
    </div>
  );
}

function StatColumns() {
  const [encounter] = useEncounter();
  // todo: just fetch this in the encounter
  const { data: columns } = api.getColumns.useQuery(encounter.id);
  return columns?.map((c, index) => (
    <StatColumnComponent
      column={c}
      key={c.id}
      splitter={
        index < columns.length - 1 ? (
          <StatColumnSplitter
            rightColumnId={columns[index + 1]!.id}
            leftColumnId={c.id}
            key={index}
          />
        ) : null
      }
    />
  ));
}

function CreateNewColumnButton() {
  const { getColumns } = api.useUtils();
  const [encounter] = useEncounter();
  const { data: columns } = api.getColumns.useQuery(encounter.id);
  const { mutate: createColumn } = api.createColumn.useMutation({
    onSettled: async () => {
      return await getColumns.invalidate();
    },
    onMutate: async (newColumn) => {
      await getColumns.cancel(newColumn.encounter_id);
      const previousColumns = getColumns.getData(newColumn.encounter_id);
      getColumns.setData(newColumn.encounter_id, (old) => {
        if (!old || !columns) return old;
        return StatColumnUtils.add(columns, {
          ...newColumn,
          id: Math.random.toString(),
        });
      });
      return { previousColumns };
    },
  });
  return (
    <ButtonWithTooltip
      text={"Create new column"}
      variant="ghost"
      onClick={() =>
        createColumn({ encounter_id: encounter.id, percent_width: 50 })
      }
    >
      <Plus />
    </ButtonWithTooltip>
  );
}

type Column = typeof stat_columns.$inferSelect;

function StatColumnComponent({
  column,
  splitter,
}: {
  column: Column;
  splitter: React.ReactNode | null;
}) {
  // todo: setup join in db instead of here
  //todo: when adding a participant, put them in the shortest column
  const [encounter] = useEncounter();
  const [acceptDrop, setAcceptDrop] = React.useState(false);
  const { getColumns, encounterById } = api.useUtils();
  const { mutate: assignParticipantToColumn } =
    api.assignParticipantToColumn.useMutation({
      onSettled: async () => {
        return await encounterById.invalidate(encounter.id);
      },
      onMutate: async (newColumn) => {
        await encounterById.cancel(encounter.id);
        const previousEncounter = encounterById.getData(encounter.id);
        encounterById.setData(encounter.id, (old) => {
          if (!old) return old;
          return {
            ...old,
            participants: ParticipantUtils.assignColumn(
              old.participants,
              newColumn.column_id,
              newColumn.participant_id,
            ),
          };
        });
        return { previousEncounter };
      },
    });
  const { mutate: deleteColumn } = api.deleteColumn.useMutation({
    onSettled: async () => {
      return await getColumns.invalidate();
    },
    onMutate: async (column) => {
      await getColumns.cancel(column.encounter_id);
      const previousColumns = getColumns.getData(column.encounter_id);
      getColumns.setData(column.encounter_id, (old) => {
        if (!previousColumns) {
          return old;
        }
        return StatColumnUtils.remove(previousColumns, column.id);
      });
      return { previousColumns };
    },
  });
  return (
    <>
      <div
        className={`flex flex-col gap-3 items-start relative ${acceptDrop && "outline outline-blue-500"}`}
        style={{ width: `${column.percent_width}%` }}
        onDrop={(e) => {
          const droppedParticipant = typedDrag.get(
            e.dataTransfer,
            dragTypes.participant,
          );
          if (!droppedParticipant) {
            console.error("No participant found when dragging");
            return;
          }
          assignParticipantToColumn({
            participant_id: droppedParticipant.id,
            column_id: column.id,
            encounter_id: encounter.id,
          });
          setAcceptDrop(false);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragOver={(e) => {
          if (!typedDrag.includes(e.dataTransfer, dragTypes.participant)) {
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          setAcceptDrop(true);
        }}
        onDragLeave={() => setAcceptDrop(false)}
      >
        <ButtonWithTooltip
          text="Delete column"
          className="h-10 absolute -top-10 z-10 left-0"
          variant="ghost"
          onClick={() => deleteColumn(column)}
        >
          <X />
        </ButtonWithTooltip>
        <BattleCards columnId={column.id} />
      </div>
      {splitter}
    </>
  );
}

function BattleCards({ columnId }: { columnId: string }) {
  const [encounter] = useEncounter();
  const { mutate: removeCreatureFromEncounter } =
    useRemoveParticipantFromEncounter();
  const participantsInColumn = encounter.participants
    .filter((p) => p.column_id === columnId && !ParticipantUtils.isPlayer(p))
    .sort(ParticipantUtils.sortLinearly);
  return participantsInColumn.map((p) => (
    <BattleCard
      participant={p}
      data-is-active={p.is_active}
      data-participant-id={p.id}
      key={p.id}
      extraHeaderButtons={
        encounter?.is_editing_columns ? (
          <>
            <Button
              variant="ghost"
              className="z-10"
              onDragStart={(e) => {
                typedDrag.set(e.dataTransfer, dragTypes.participant, p);
              }}
              draggable
            >
              <Grip />
            </Button>
            <Button
              variant="ghost"
              className="opacity-25"
              onClick={() =>
                removeCreatureFromEncounter({
                  encounter_id: encounter.id,
                  participant_id: p.id,
                })
              }
            >
              <Trash />
            </Button>
          </>
        ) : null
      }
    />
  ));
}

function StatColumnSplitter({
  rightColumnId,
  leftColumnId,
}: {
  rightColumnId: string;
  leftColumnId: string;
}) {
  const parentWidth = React.useContext(ParentWidthContext);
  const { getColumns } = api.useUtils();
  const [encounter] = useEncounter();
  const { mutate: updateColumnBatch } = api.updateColumnBatch.useMutation();
  const handleMouseDown = (e: React.MouseEvent) => {
    const startX = e.clientX;
    const currentColumns = getColumns.getData(encounter.id);
    const leftColumnStart = currentColumns?.find((c) => c.id === leftColumnId);
    const rightColumnStart = currentColumns?.find(
      (c) => c.id === rightColumnId,
    );
    if (!leftColumnStart || !rightColumnStart) {
      throw new Error(
        "no columns found when attempting to update percent width",
      );
    }
    let isPendingSetStateForFrame: number | null = null;

    document.body.style.userSelect = "none";

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (isPendingSetStateForFrame) {
        return;
      }
      if (parentWidth === null) {
        throw new Error(`null parent width`);
      }
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / parentWidth) * 100;
      isPendingSetStateForFrame = requestAnimationFrame(() => {
        const newLeftColumn = {
          ...leftColumnStart,
          percent_width: leftColumnStart.percent_width + deltaPercent,
        };
        const newRightColumn = {
          ...rightColumnStart,
          percent_width: rightColumnStart.percent_width - deltaPercent,
        };
        getColumns.setData(encounter.id, (old) => {
          if (!old) return old;
          return old.map((c) => {
            if (c.id === leftColumnId) {
              return newLeftColumn;
            }
            if (c.id === rightColumnId) {
              return newRightColumn;
            }
            return c;
          });
        });
        isPendingSetStateForFrame = null;
      });
    };

    const handleMouseUp = () => {
      document.body.style.userSelect = "auto";
      const updatedColumns = getColumns.getData(encounter.id);
      if (!updatedColumns) {
        throw new Error("no columns found when updating");
      }
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      updateColumnBatch({
        columns: updatedColumns,
        encounter_id: encounter.id,
      });
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };
  return (
    <div
      onMouseDown={handleMouseDown}
      className="w-2 bg-gray-300 hover:bg-gray-500 right-0"
      style={{ cursor: "ew-resize" }}
    />
  );
}
