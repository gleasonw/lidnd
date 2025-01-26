"use client";
import React, { createContext, useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import { BattleCard } from "./battle-ui";
import { useEncounterId } from "@/encounters/[encounter_index]/encounter-id";
import { useEncounter } from "@/encounters/[encounter_index]/hooks";
import { observer } from "mobx-react-lite";
import { X } from "lucide-react";
import { StatColumnUtils } from "@/utils/stat-columns";
import { ParticipantUtils } from "@/utils/participants";
import { dragTypes, typedDrag } from "@/app/[username]/utils";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { AddColumn } from "@/app/public/images/icons/AddColumn";
import { useEncounterUIStore } from "@/encounters/[encounter_index]/EncounterUiStore";
import type { Participant } from "@/server/api/router";
import type { StatColumn } from "@/server/api/columns-router";
import { ScrollArea } from "@/components/ui/scroll-area";

//todo: custom margin when in editing layout mode

export const ParentWidthContext = createContext<number | null>(null);

export const useParentResizeObserver = () => {
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

  return { parentWidth, containerRef };
};

export const LinearBattleUI = observer(function LinearBattleUI() {
  const { parentWidth, containerRef } = useParentResizeObserver();

  return (
    <div
      className="flex relative gap-1 w-full h-full max-h-full overflow-hidden"
      ref={containerRef}
    >
      <ParentWidthContext.Provider value={parentWidth}>
        <StatColumns />
      </ParentWidthContext.Provider>
    </div>
  );
});

export function StatColumns() {
  const encounterId = useEncounterId();
  const { data: columns } = api.getColumns.useQuery(encounterId);
  return columns?.map((c, index) => (
    <StatColumnComponent column={c} index={index} key={c.id}>
      <ScrollArea className="flex flex-col gap-5 border border-t-0 w-full max-h-full h-full overflow-hidden bg-white">
        <BattleCards column={c} />
      </ScrollArea>
    </StatColumnComponent>
  ));
}

export function CreateNewColumnButton() {
  const { getColumns } = api.useUtils();
  const encounterId = useEncounterId();
  const { data: columns } = api.getColumns.useQuery(encounterId);
  const { mutate: createColumn } = api.createColumn.useMutation({
    onSettled: async () => {
      return await getColumns.invalidate(encounterId);
    },
    onMutate: async (newColumn) => {
      await getColumns.cancel(newColumn.encounter_id);
      const previousEncounter = getColumns.getData(newColumn.encounter_id);
      getColumns.setData(newColumn.encounter_id, (old) => {
        if (!old || !columns) return old;
        return StatColumnUtils.add(columns, {
          ...newColumn,
          participants: [],
          id: Math.random.toString(),
        });
      });
      return { previousColumns: previousEncounter };
    },
  });
  return (
    <ButtonWithTooltip
      text={"Create new column"}
      variant="ghost"
      onClick={() =>
        createColumn({ encounter_id: encounterId, percent_width: 50 })
      }
    >
      <AddColumn className="h-6 w-6" />
    </ButtonWithTooltip>
  );
}

export function StatColumnComponent({
  column,
  index,
  children,
  toolbarExtra,
}: {
  column: StatColumn & { participants: Participant[] };
  index: number;
  children: React.ReactNode;
  toolbarExtra?: React.ReactNode;
}) {
  const [acceptDrop, setAcceptDrop] = React.useState(false);
  const { encounterById, getColumns } = api.useUtils();
  const encounterId = useEncounterId();
  const { data: columns } = api.getColumns.useQuery(encounterId);
  const { mutate: assignParticipantToColumn } =
    api.assignParticipantToColumn.useMutation({
      onSettled: async () => {
        return await encounterById.invalidate(encounterId);
      },
      onMutate: async (newColumn) => {
        await encounterById.cancel(encounterId);
        const previousEncounter = encounterById.getData(encounterId);
        encounterById.setData(encounterId, (old) => {
          if (!old) return old;
          return {
            ...old,
            participants: ParticipantUtils.assignColumn(
              old.participants,
              newColumn.column_id,
              newColumn.participant_id
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
      return { previousColumns: previousColumns };
    },
  });
  const isLastColumn = columns && index === columns.length - 1;
  return (
    <>
      <div
        className={`flex flex-col h-full max-h-full overflow-hidden items-start relative ${
          acceptDrop && "outline outline-blue-500"
        }`}
        style={{ width: `${column.percent_width}%` }}
        onDrop={(e) => {
          const droppedParticipant = typedDrag.get(
            e.dataTransfer,
            dragTypes.participant
          );
          if (!droppedParticipant) {
            console.error("No participant found when dragging");
            return;
          }
          assignParticipantToColumn({
            participant_id: droppedParticipant.id,
            column_id: column.id,
            encounter_id: encounterId,
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
        <div className="flex w-full">
          {columns && columns?.length > 1 ? (
            <div className="border border-b-0">
              <ButtonWithTooltip
                text="Delete column"
                className="h-10 bg-white"
                variant="ghost"
                onClick={() => deleteColumn(column)}
              >
                <X />
              </ButtonWithTooltip>
            </div>
          ) : null}
          <div className="flex w-full border-b" />
          <div
            className={` ${isLastColumn ? "flex" : "hidden"} ml-auto border-b`}
          >
            <CreateNewColumnButton />
          </div>
        </div>

        {toolbarExtra}

        {children}
      </div>
      <StatColumnSplitter
        rightColumnId={columns?.[index + 1]?.id}
        leftColumnId={column.id}
        key={index}
      />
    </>
  );
}

function BattleCards({ column }: { column: StatColumn }) {
  const [encounter] = useEncounter();
  const { registerBattleCardRef } = useEncounterUIStore();

  const participantsInColumn = encounter.participants
    .filter((p) => p.column_id === column.id)
    .sort(ParticipantUtils.sortLinearly);

  return participantsInColumn.map((p) => (
    <BattleCard
      participant={p}
      ref={(ref) => registerBattleCardRef(p.id, ref)}
      data-is-active={p.is_active}
      data-participant-id={p.id}
      key={p.id}
    />
  ));
}
//todo make this smaller... like vscode
function StatColumnSplitter({
  rightColumnId,
  leftColumnId,
}: {
  rightColumnId?: string;
  leftColumnId: string;
}) {
  const parentWidth = React.useContext(ParentWidthContext);
  const { getColumns } = api.useUtils();
  const encounterId = useEncounterId();
  const { mutate: updateColumnBatch } = api.updateColumnBatch.useMutation();
  const { data: columns } = api.getColumns.useQuery(encounterId);
  const handleMouseDown = (e: React.MouseEvent) => {
    const startX = e.clientX;
    const currentColumns = getColumns.getData(encounterId);
    const leftColumnStart = currentColumns?.find((c) => c.id === leftColumnId);
    const rightColumnStart = currentColumns?.find(
      (c) => c.id === rightColumnId
    );
    if (!leftColumnStart || !rightColumnStart) {
      throw new Error(
        "no columns found when attempting to update percent width"
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
        getColumns.setData(encounterId, (old) => {
          if (!old) return old;
          return columns?.map((c) => {
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
      const updatedColumns = getColumns.getData(encounterId);
      if (!updatedColumns) {
        throw new Error("no columns found when updating");
      }
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      updateColumnBatch({
        columns: updatedColumns,
        encounter_id: encounterId,
      });
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };
  return (
    <div
      onMouseDown={handleMouseDown}
      className="w-2 hover:bg-gray-500 right-0 z-10 last:hidden"
      style={{ cursor: "ew-resize" }}
    />
  );
}
