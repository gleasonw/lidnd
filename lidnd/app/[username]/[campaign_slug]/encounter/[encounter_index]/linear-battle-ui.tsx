"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import { ParticipantBattleData } from "./battle-ui";
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
import type { StatColumn } from "@/server/api/columns-router";
import { ScrollArea } from "@/components/ui/scroll-area";
import clsx from "clsx";
import { EncounterUtils } from "@/utils/encounters";
import type React from "react";
import { CreatureStatBlock } from "@/encounters/[encounter_index]/CreatureStatBlock";

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
      className="flex relative w-full h-full max-h-full overflow-auto"
      ref={containerRef}
    >
      <ParentWidthContext.Provider value={parentWidth}>
        <StatColumns />
      </ParentWidthContext.Provider>
    </div>
  );
});

export function StatColumns() {
  const [encounter] = useEncounter();
  const encounterId = encounter.id;
  //TODO: some weirdness here, looks like we still have participants on the column...
  // do we actually assign participants to columns?
  const { data: columns } = api.getColumns.useQuery(encounterId);
  const { registerBattleCardRef } = useEncounterUIStore();

  const participantsByColumn = EncounterUtils.participantsByColumn(encounter);

  return columns?.map((c, index) => (
    <StatColumnComponent column={c} index={index} key={c.id}>
      <ScrollArea className="flex flex-col gap-5 border-t-0 w-full max-h-screen h-full overflow-hidden ">
        <div className="flex flex-col divide-solid divide-y-2 gap-2">
          {participantsByColumn[c.id]
            ?.slice()
            .sort(
              (groupA, groupB) =>
                groupA
                  .at(0)
                  ?.creature.name.localeCompare(
                    groupB.at(0)?.creature.name ?? ""
                  ) || 0
            )
            .map((p) => (
              <div className="flex flex-col" key={p.map((p) => p.id).join("-")}>
                {p
                  .slice()
                  .sort(ParticipantUtils.sortLinearly)
                  .map((p, i) => (
                    <ParticipantBattleData
                      participant={p}
                      ref={(ref) => registerBattleCardRef(p.id, ref)}
                      data-is-active={p.is_active}
                      data-participant-id={p.id}
                      key={p.id}
                      indexInGroup={i}
                    />
                  ))}
                {p[0]?.creature ? (
                  <CreatureStatBlock creature={p[0]?.creature} />
                ) : (
                  <div>no creature... probably a bug</div>
                )}
              </div>
            ))}
        </div>
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

export const StatColumnComponent = observer(function StatColumnComponent({
  column,
  index,
  children,
  toolbarExtra,
}: {
  column: StatColumn;
  index: number;
  children: React.ReactNode;
  toolbarExtra?: React.ReactNode;
}) {
  const [acceptDrop, setAcceptDrop] = useState(false);
  const { encounterById, getColumns } = api.useUtils();
  const encounterId = useEncounterId();
  const [encounter] = useEncounter();
  const encounterUiStore = useEncounterUIStore();
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
          return ParticipantUtils.assignColumn(
            encounter,
            newColumn.column_id,
            newColumn.participant_id
          );
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
  const columnHasNoParticipants = encounter.participants.every(
    (ep) => ep.column_id !== column.id
  );
  return (
    <>
      <div
        className={clsx(
          `flex flex-col h-full max-h-full overflow-hidden items-start relative`,
          {
            "outline outline-blue-500": acceptDrop,
            "bg-gray-100 opacity-50": columnHasNoParticipants,
          }
        )}
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
        {encounterUiStore.isEditingInitiative || encounter.status === "prep" ? (
          <div className="flex w-full bg-gray-200">
            {columns && columns?.length > 1 ? (
              <div className="border border-b-0">
                <ButtonWithTooltip
                  text="Delete column"
                  className="h-10 bg-white rounded-none"
                  variant="ghost"
                  onClick={() => deleteColumn(column)}
                >
                  <X />
                </ButtonWithTooltip>
              </div>
            ) : null}
            <div className="flex w-full border-b" />
            <div
              className={` ${
                isLastColumn ? "flex" : "hidden"
              } ml-auto border-b`}
            >
              <CreateNewColumnButton />
            </div>
          </div>
        ) : null}

        {toolbarExtra}
        <div className="flex flex-col gap-5 border border-t-0 w-full max-h-full overflow-hidden h-full bg-white">
          {children}
        </div>
      </div>
      <StatColumnSplitter
        rightColumnId={columns?.[index + 1]?.id}
        leftColumnId={column.id}
        key={index}
      />
    </>
  );
});

//todo: instead of updating a width which causes a full re-render of the stat column component,
// set a css var on the parent ref. keep react out of the loop
//like-wise for parent width?
function StatColumnSplitter({
  rightColumnId,
  leftColumnId,
}: {
  rightColumnId?: string;
  leftColumnId: string;
}) {
  const parentWidth = useContext(ParentWidthContext);
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
