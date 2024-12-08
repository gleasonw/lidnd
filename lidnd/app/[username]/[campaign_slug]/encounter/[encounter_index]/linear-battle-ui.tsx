"use client";
import React, { createContext, useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import { BattleCard } from "./battle-ui";
import { useEncounterId } from "@/encounters/[encounter_index]/encounter-id";
import {
  useAddExistingCreatureAsParticipant,
  useCreateCreatureInEncounter,
  useEncounter,
  useRemoveParticipantFromEncounter,
} from "@/encounters/[encounter_index]/hooks";
import { observer } from "mobx-react-lite";
import { Button } from "@/components/ui/button";
import { Grip, Trash, X } from "lucide-react";
import {
  StatColumnUtils,
  type ColumnWithParticipants,
} from "@/utils/stat-columns";
import { ParticipantUtils } from "@/utils/participants";
import { dragTypes, typedDrag } from "@/app/[username]/utils";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { ExistingMonster } from "@/encounters/[encounter_index]/participant-add-form";
import { MonsterUploadForm } from "@/encounters/full-creature-add-form";
import { AddColumn } from "@/app/public/images/icons/AddColumn";
import { useEncounterUIStore } from "@/encounters/[encounter_index]/EncounterUiStore";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

//todo: custom margin when in editing layout mode

const ParentWidthContext = createContext<number | null>(null);

export const LinearBattleUI = observer(function LinearBattleUI() {
  const id = useEncounterId();
  const [encounter] = api.encounterById.useSuspenseQuery(id);

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
    <div className="flex relative gap-4 h-full" ref={containerRef}>
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
  return encounter.columns?.map((c) => (
    <ReadOnlyStatColumn column={c} key={c.id} />
  ));
}

function ReadOnlyStatColumn({ column }: { column: ColumnWithParticipants }) {
  return (
    <div
      className="flex flex-col gap-10"
      style={{ width: `${column.percent_width}%` }}
    >
      <BattleCards column={column} />
    </div>
  );
}

function StatColumns() {
  const [encounter] = useEncounter();
  return encounter.columns?.map((c, index) => (
    <StatColumnComponent
      column={c}
      key={c.id}
      splitter={
        index < encounter.columns.length - 1 ? (
          <StatColumnSplitter
            rightColumnId={encounter.columns[index + 1]!.id}
            leftColumnId={c.id}
            key={index}
          />
        ) : null
      }
    />
  ));
}

function CreateNewColumnButton() {
  const { encounterById } = api.useUtils();
  const [encounter] = useEncounter();
  const { mutate: createColumn } = api.createColumn.useMutation({
    onSettled: async () => {
      return await encounterById.invalidate(encounter.id);
    },
    onMutate: async (newColumn) => {
      const columns = encounter.columns;
      await encounterById.cancel(newColumn.encounter_id);
      const previousEncounter = encounterById.getData(newColumn.encounter_id);
      encounterById.setData(newColumn.encounter_id, (old) => {
        if (!old || !columns) return old;
        return {
          ...old,
          columns: StatColumnUtils.add(columns, {
            ...newColumn,
            participants: [],
            id: Math.random.toString(),
          }),
        };
      });
      return { previousColumns: previousEncounter };
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
      <AddColumn className="h-6 w-6" />
    </ButtonWithTooltip>
  );
}

function StatColumnComponent({
  column,
  splitter,
}: {
  column: ColumnWithParticipants;
  splitter: React.ReactNode | null;
}) {
  const [encounter] = useEncounter();
  const [acceptDrop, setAcceptDrop] = React.useState(false);
  const { encounterById } = api.useUtils();
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
      return await encounterById.invalidate();
    },
    onMutate: async (column) => {
      await encounterById.cancel(column.encounter_id);
      const previousEncounter = encounterById.getData(column.encounter_id);
      encounterById.setData(column.encounter_id, (old) => {
        if (!previousEncounter) {
          return old;
        }
        return {
          ...encounter,
          columns: StatColumnUtils.remove(previousEncounter.columns, column.id),
        };
      });
      return { previousColumns: previousEncounter };
    },
  });
  return (
    <>
      <div
        className={`flex flex-col h-full border gap-5 items-start relative ${acceptDrop && "outline outline-blue-500"}`}
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
        {encounter.columns.length > 1 ? (
          <ButtonWithTooltip
            text="Delete column"
            className="h-10 absolute -top-10 z-10 left-0"
            variant="ghost"
            onClick={() => deleteColumn(column)}
          >
            <X />
          </ButtonWithTooltip>
        ) : null}

        <BattleCardUploader column={column} />
        <BattleCards column={column} />
      </div>
      {splitter}
    </>
  );
}
function BattleCardUploader({ column }: { column: ColumnWithParticipants }) {
  const [encounter] = useEncounter();
  const { mutate: createCreatureInEncounter } = useCreateCreatureInEncounter({
    encounter,
  });
  const { mutate: addParticipantFromExistingCreature } =
    useAddExistingCreatureAsParticipant(encounter);
  return (
    <div className=" w-full p-3">
      <Tabs defaultValue="new">
        <TabsList>
          <TabsTrigger value="new" className="flex gap-3">
            New Monster
          </TabsTrigger>
          <TabsTrigger value="existing" className="flex gap-3">
            Existing Monster
          </TabsTrigger>
        </TabsList>
        <TabsContent value="new">
          <MonsterUploadForm
            uploadCreature={(c) =>
              createCreatureInEncounter({
                creature: c,
                participant: {
                  is_ally: false,
                  column_id: column.id,
                },
              })
            }
          />
        </TabsContent>
        <TabsContent value="existing">
          <ExistingMonster
            onUpload={(c) =>
              addParticipantFromExistingCreature({
                encounter_id: encounter.id,
                creature_id: c.id,
                column_id: column.id,
              })
            }
            encounter={encounter}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BattleCards({ column }: { column: ColumnWithParticipants }) {
  const [encounter] = useEncounter();
  const { registerBattleCardRef } = useEncounterUIStore();
  const { mutate: removeCreatureFromEncounter } =
    useRemoveParticipantFromEncounter();

  // TODO: we have to reference e.participants instead of
  // column.participants because column.participants doesn't get updated
  // by the optimistic update...
  const participantsInColumn = column.participants.sort(
    ParticipantUtils.sortLinearly,
  );

  return participantsInColumn.map((p) => (
    <BattleCard
      participant={p}
      ref={(ref) => registerBattleCardRef(p.id, ref)}
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
              className="opacity-25 z-10"
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
  const { encounterById } = api.useUtils();
  const [encounter] = useEncounter();
  const { mutate: updateColumnBatch } = api.updateColumnBatch.useMutation();
  const handleMouseDown = (e: React.MouseEvent) => {
    const startX = e.clientX;
    const currentColumns = encounterById.getData(encounter.id)?.columns;
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
        encounterById.setData(encounter.id, (old) => {
          if (!old) return old;
          return {
            ...encounter,
            columns: encounter.columns.map((c) => {
              if (c.id === leftColumnId) {
                return newLeftColumn;
              }
              if (c.id === rightColumnId) {
                return newRightColumn;
              }
              return c;
            }),
          };
        });
        isPendingSetStateForFrame = null;
      });
    };

    const handleMouseUp = () => {
      document.body.style.userSelect = "auto";
      const updatedColumns = encounterById.getData(encounter.id)?.columns;
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
      className="w-2 bg-gray-300 hover:bg-gray-500 right-0 z-10"
      style={{ cursor: "ew-resize" }}
    />
  );
}
