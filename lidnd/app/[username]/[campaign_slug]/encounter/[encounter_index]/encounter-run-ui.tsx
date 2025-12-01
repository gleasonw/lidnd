"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import * as css from "./encounter-run-ui.module.css";
import {
  ColumnDragButton,
  GroupBattleUITools,
  ParticipantBattleData,
} from "./battle-ui";
import { useEncounterId } from "@/encounters/[encounter_index]/encounter-id";
import {
  useEncounter,
  useUpdateGroupTurn,
} from "@/encounters/[encounter_index]/hooks";
import { observer } from "mobx-react-lite";
import { AngryIcon, Check, Eye, X } from "lucide-react";
import { StatColumnUtils } from "@/utils/stat-columns";
import { ParticipantUtils } from "@/utils/participants";
import { dragTypes, typedDrag } from "@/app/[username]/utils";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { AddColumn } from "@/app/public/images/icons/AddColumn";
import { useEncounterUIStore } from "@/encounters/[encounter_index]/EncounterUiStore";
import type { StatColumn } from "@/server/api/columns-router";
import clsx from "clsx";
import { EncounterUtils } from "@/utils/encounters";
import type React from "react";
import { CreatureStatBlock } from "@/encounters/[encounter_index]/CreatureStatBlock";
import { DescriptionTextArea } from "@/encounters/[encounter_index]/description-text-area";
import type { TurnGroup } from "@/server/db/schema";
import type { Creature, ParticipantWithData } from "@/server/api/router";
import { Button } from "@/components/ui/button";
import * as R from "remeda";
import { LidndDialog } from "@/components/ui/lidnd_dialog";
import { EditModeOpponentForm } from "@/app/[username]/[campaign_slug]/EditModeOpponentForm";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";

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

export const RunEncounter = observer(function LinearBattleUI() {
  const { parentWidth, containerRef } = useParentResizeObserver();

  return (
    <div
      className="flex relative w-full h-full max-h-full overflow-hidden"
      ref={containerRef}
    >
      <ParentWidthContext.Provider value={parentWidth}>
        <div className="overflow-auto w-full h-full flex">
          <StatColumns />
        </div>
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
  const participantsByColumn = EncounterUtils.participantsByColumn(encounter);

  return columns?.map((c, index) =>
    c.is_home_column ? (
      <StatColumnComponent key={c.id} column={c} index={index}>
        <div className="flex flex-col px-2 gap-5">
          <GroupBattleUITools />
          <div className="flex gap-1 flex-wrap">
            {EncounterUtils.players(encounter)
              .slice()
              .sort((a, b) => a.creature.name.localeCompare(b.creature.name))
              .map((p) => (
                <GroupParticipantDoneToggle
                  participant={p}
                  key={p.id}
                  buttonExtra={
                    <CreatureIcon size="v-small" creature={p.creature} />
                  }
                />
              ))}
          </div>
          <div className="w-full flex gap-3 items-center">
            <div className="h-[1px] w-full bg-black rounded-s-sm" />
            <div className="">vs</div>
            <div className="h-[1px] w-full bg-black rounded-e-sm" />
          </div>
          <EncounterMonsterRoster />
        </div>
      </StatColumnComponent>
    ) : (
      <StatColumnComponent column={c} index={index} key={c.id}>
        {index === 1 ? (
          /** this is just a hacky way to get the description out of the way... */
          <div className="bg-white p-3">
            <DescriptionTextArea />
          </div>
        ) : null}
        <div className="flex flex-col gap-1">
          {participantsByColumn[c.id]?.slice().map((p) => (
            <div className="flex flex-col" key={p.map((p) => p.id).join("-")}>
              {p[0]?.creature ? (
                <>
                  <ColumnDragButton participant={p[0]} />
                  <RunCreatureStatBlock creature={p[0].creature} />
                </>
              ) : (
                <div>no creature... probably a bug</div>
              )}
            </div>
          ))}
        </div>
      </StatColumnComponent>
    )
  );
}

const RunCreatureStatBlock = observer(function RunCreatureStatBlock({
  creature,
}: {
  creature: Creature;
}) {
  const uiStore = useEncounterUIStore();

  return (
    <div
      className={clsx("transition-opacity", {
        "opacity-50":
          uiStore.isHighlightingStatBlocks &&
          !uiStore.highlightingThisStatBlock(creature.id),
      })}
    >
      <CreatureStatBlock
        creature={creature}
        ref={(el) => uiStore.registerStatBlockRef(creature.id, el)}
      />
    </div>
  );
});

function EncounterMonsterRoster() {
  const [encounter] = useEncounter();
  const uiStore = useEncounterUIStore();
  const turnGroups = R.indexBy(encounter.turn_groups, (tg) => tg.id);
  const participantsByTurnGroup =
    EncounterUtils.participantsByTurnGroup(encounter);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 flex-wrap">
          <LidndDialog
            content={<EditModeOpponentForm />}
            title="Add Opponent"
            trigger={
              <Button variant="outline" className="w-fit">
                <AngryIcon />
                Add Opponent
              </Button>
            }
          />
        </div>
        <div className="flex flex-col gap-5">
          {EncounterUtils.monstersWithoutTurnGroup(encounter).map(
            (m, index) => (
              <ParticipantBattleData
                participant={m}
                key={m.id}
                ref={(el) => uiStore.registerBattleCardRef(m.id, el)}
                indexInGroup={index}
              />
            )
          )}
          {Object.entries(participantsByTurnGroup).map(
            ([tgId, participants]) => {
              const turnGroup = turnGroups[tgId];
              if (!turnGroup) {
                return null;
              }
              return (
                <RunTurnGroup
                  tg={turnGroup}
                  participants={participants}
                  key={tgId}
                />
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}

function RunTurnGroup({
  tg,
  participants,
}: {
  tg: TurnGroup;
  participants: Array<ParticipantWithData>;
}) {
  const uiStore = useEncounterUIStore();
  const creatureIdsForGroup = participants.map((p) => p.creature.id);
  return (
    /**@ts-expect-error css modules */
    <div className={`flex flex-col ${css.parentContainer}`}>
      <div className="flex items-center gap-3 w-full">
        <div
          className="w-4 h-4"
          style={{ backgroundColor: tg.hex_color ?? undefined }}
        />
        <span>{tg.name}</span>
        <ButtonWithTooltip
          text="Highlight stat blocks"
          variant="ghost"
          className="text-gray-400"
          onClick={() => uiStore.highlightTheseStatBlocks(creatureIdsForGroup)}
        >
          <Eye />
        </ButtonWithTooltip>
        <div className="ml-auto">
          <TurnGroupDoneToggle turnGroup={tg} />
        </div>
      </div>
      <div
        className={clsx("flex flex-col pl-5 gap-2", {
          /**@ts-expect-error css modules */
          [css.runGroupConditional]: participants.length >= 2,
        })}
      >
        {participants.map((p, index) => (
          <ParticipantBattleData
            participant={p}
            key={p.id}
            ref={(el) => uiStore.registerBattleCardRef(p.id, el)}
            indexInGroup={index}
          />
        ))}
      </div>
    </div>
  );
}

function TurnGroupDoneToggle({ turnGroup }: { turnGroup: TurnGroup }) {
  const { mutate: updateTurnGroup } = useUpdateGroupTurn();
  const [encounter] = useEncounter();
  const turnGroupedParticipants =
    EncounterUtils.participantsByTurnGroup(encounter)[turnGroup.id] ?? [];

  if (turnGroupedParticipants.length === 0) {
    return null;
  }
  return (
    <Button
      variant={turnGroup.has_played_this_round ? "ghost" : "outline"}
      className={clsx("flex gap-2 p-2", {
        "opacity-50": turnGroup.has_played_this_round,
      })}
      onClick={() =>
        // this is kinda wonky, why not just send up the first turn group id? need to think this through more
        updateTurnGroup({
          encounter_id: encounter.id,
          participant_id: turnGroupedParticipants.at(0)?.id!,
          has_played_this_round: !turnGroup.has_played_this_round,
        })
      }
    >
      {turnGroup.has_played_this_round ? <Check /> : "Ready"}
    </Button>
  );
}

function GroupParticipantDoneToggle({
  participant,
  buttonExtra,
}: {
  participant: ParticipantWithData;
  buttonExtra?: React.ReactNode;
}) {
  const id = useEncounterId();
  const { mutate: updateCreatureHasPlayedThisRound } = useUpdateGroupTurn();
  return (
    <Button
      variant={participant.has_played_this_round ? "ghost" : "outline"}
      onClick={() =>
        updateCreatureHasPlayedThisRound({
          encounter_id: id,
          participant_id: participant.id,
          has_played_this_round: !participant.has_played_this_round,
        })
      }
      className={clsx("flex gap-1 rounded-md", {
        "opacity-50": participant.has_played_this_round,
      })}
    >
      {buttonExtra}
      {participant.creature.name}
      {participant.has_played_this_round ? <Check /> : ""}
    </Button>
  );
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
          is_home_column: false,
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
  return (
    <>
      <div
        className={clsx(
          `flex flex-col h-full max-h-full items-start relative`,
          {
            "outline outline-blue-500": acceptDrop,
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
            {columns && columns?.length > 1 && !column.is_home_column ? (
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
        <div className="flex flex-col gap-3 w-full max-h-full h-full bg-white">
          {children}
        </div>
      </div>
      <StatColumnSplitter leftColumnIndex={index} key={index} />
    </>
  );
});

//todo: instead of updating a width which causes a full re-render of the stat column component,
// set a css var on the parent ref. keep react out of the loop
//like-wise for parent width?
function StatColumnSplitter({ leftColumnIndex }: { leftColumnIndex: number }) {
  const parentWidth = useContext(ParentWidthContext);
  const { getColumns } = api.useUtils();
  const encounterId = useEncounterId();
  const { mutate: updateColumnBatch } = api.updateColumnBatch.useMutation();
  const { data: columns } = api.getColumns.useQuery(encounterId);
  const leftColumn = columns?.[leftColumnIndex];
  const rightColumn = columns?.[leftColumnIndex + 1];
  if (!leftColumn || !rightColumn) {
    return null;
  }
  const leftColumnId = leftColumn.id;
  const rightColumnId = rightColumn.id;
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
      className="w-1 hover:bg-gray-500 right-0 z-10 last:hidden bg-gray-200"
      style={{ cursor: "ew-resize" }}
    />
  );
}
