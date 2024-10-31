"use client";
import React, { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import { BattleCard } from "./battle-ui";
import { EncounterUtils } from "@/utils/encounters";
import { useEncounterId } from "@/encounters/[encounter_index]/encounter-id";
import { useEncounter } from "@/encounters/[encounter_index]/hooks";
import { useEncounterUIStore } from "@/encounters/[encounter_index]/EncounterUiStore";
import { observer } from "mobx-react-lite";
import type { stat_columns } from "@/server/api/db/schema";
import { Button } from "@/components/ui/button";
import { ColumnsIcon, Grip, Plus, X } from "lucide-react";
import { StatColumnUtils } from "@/utils/stat-columns";
import { ParticipantUtils } from "@/utils/participants";
import { dragTypes, typedDrag } from "@/app/[username]/utils";

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

  // todo: just fetch this in the encounter
  const { data: columns } = api.getColumns.useQuery(encounter.id);

  return (
    <div className="flex relative gap-2 h-full" ref={containerRef}>
      <div className="absolute top-0 right-0 text-xl z-10">
        <CreateNewColumnButton />
      </div>
      {columns?.map((c, index) => (
        <StatColumn
          column={c}
          key={c.id}
          splitter={
            index < columns.length - 1 ? (
              <StatColumnSplitter
                rightColumnId={columns[index + 1]!.id}
                leftColumnId={c.id}
                parentWidth={parentWidth}
                key={index}
              />
            ) : null
          }
        />
      ))}
    </div>
  );
});

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
    <Button
      variant="outline"
      onClick={() =>
        createColumn({ encounter_id: encounter.id, percent_width: 50 })
      }
    >
      <ColumnsIcon />
      <Plus />
    </Button>
  );
}

type Column = typeof stat_columns.$inferSelect;

function StatColumn({
  column,
  splitter,
}: {
  column: Column;
  splitter: React.ReactNode | null;
}) {
  // todo: setup join in db instead of here
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
          const participant = old.participants.find(
            (p) => p.id === newColumn.participant_id,
          );
          if (!participant) {
            throw new Error("No participant found");
          }
          return {
            ...old,
            participants: old.participants.map((p) => {
              if (p.id === newColumn.participant_id) {
                return {
                  ...p,
                  column_id: newColumn.column_id,
                };
              }
              return p;
            }),
          };
        });
        console.log("assigning", newColumn.participant_id);
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
  const participantsInColumn = encounter.participants.filter(
    (p) => p.column_id === column.id && !ParticipantUtils.isPlayer(p),
  );
  const widthToSet = Math.round(column.percent_width * 100) / 100;
  return (
    <>
      <div
        className={`flex flex-col items-start relative border-4 h-full ${acceptDrop && "border-blue-500"}`}
        style={{ width: `${widthToSet}%` }}
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
        {participantsInColumn.map((p) => (
          <BattleCard
            participant={p}
            data-is-active={p.is_active}
            data-participant-id={p.id}
            key={p.id}
            extraHeaderButtons={
              <Button
                variant="ghost"
                onDragStart={(e) => {
                  typedDrag.set(e.dataTransfer, dragTypes.participant, p);
                }}
                draggable
              >
                <Grip />
              </Button>
            }
          />
        ))}
        <Button variant="ghost" onClick={() => deleteColumn(column)}>
          <X />
        </Button>
      </div>
      {splitter}
    </>
  );
}

function StatColumnSplitter({
  rightColumnId,
  leftColumnId,
  parentWidth,
}: {
  rightColumnId: string;
  leftColumnId: string;
  parentWidth: number | null;
}) {
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
        console.log(
          `set left Column ${leftColumnId} and right column ${rightColumnId}`,
        );
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
      className="w-2 h-full bg-gray-300 hover:bg-gray-500 right-0"
      style={{ cursor: "ew-resize" }}
    />
  );
}
