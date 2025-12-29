"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as R from "remeda";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { motion, useIsPresent } from "framer-motion";
import clsx from "clsx";
import battleStyles from "./battle-ui.module.css";
import type {
  Creature,
  Participant,
  ParticipantWithData,
} from "@/server/api/router";
import { LidndPopover } from "@/encounters/base-popover";
import { EffectIcon } from "./status-input";
import { useCampaign } from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { observer } from "mobx-react-lite";
import { ParticipantUtils } from "@/utils/participants";
import { ParticipantEffectUtils } from "@/utils/participantEffects";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import { ParticipantHealthForm } from "@/encounters/[encounter_index]/creature-health-form";
import { DescriptionTextArea } from "@/encounters/[encounter_index]/description-text-area";
import {
  useEncounter,
  useRemoveParticipantFromEncounter,
  useRemoveStatusEffect,
  useStartEncounter,
  useToggleGroupTurn,
  useUpdateEncounterParticipant,
  useEncounterHotkey,
  useUpdateEncounter,
} from "@/encounters/[encounter_index]/hooks";
import { useDebouncedCallback } from "use-debounce";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { LidndTextArea } from "@/components/ui/lidnd-text-area";
import {
  ReminderInput,
  Reminders,
} from "@/encounters/[encounter_index]/reminders";
import {
  AngryIcon,
  CheckCircle,
  Circle,
  Columns,
  Grid2X2,
  Grip,
  HomeIcon,
  MoreHorizontal,
  PlayIcon,
  PlusIcon,
  Trash,
  UsersIcon,
  X,
} from "lucide-react";
import Link from "next/link";
import { imageStyle, InitiativeTracker } from "./battle-bar";
import { dragTypes, typedDrag } from "@/app/[username]/utils";
import { useEncounterId } from "@/encounters/[encounter_index]/encounter-id";
import { api } from "@/trpc/react";
import type { StatColumn } from "@/server/api/columns-router";
import { ButtonWithTooltip, LidndTooltip } from "@/components/ui/tip";
import { useEncounterUIStore } from "@/encounters/[encounter_index]/EncounterUiStore";
import { CreatureStatBlock } from "@/encounters/[encounter_index]/CreatureStatBlock";
import { CreatureUtils } from "@/utils/creatures";
import Image from "next/image";
import { EncounterUtils, targetSinglePlayerStrength } from "@/utils/encounters";
import { appRoutes } from "@/app/routes";
import { useUser } from "@/app/[username]/user-provider";
import { useEncounterLinks } from "@/encounters/link-hooks";
import { EncounterDetails } from "@/encounters/[encounter_index]/EncounterRoundIndicator";
import { Input } from "@/components/ui/input";
import { EditModeOpponentForm } from "@/app/[username]/[campaign_slug]/EditModeOpponentForm";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import { crLabel } from "@/utils/campaigns";
import type { TurnGroup } from "@/server/db/schema";
import { RemoveCreatureFromEncounterButton } from "@/encounters/[encounter_index]/encounter-prep";
import { StatColumnUtils } from "@/utils/stat-columns";
import * as CampaignUtils from "@/utils/campaigns";
import { labelColors } from "@/lib/utils";
import { LidndLabel } from "@/components/ui/LidndLabel";
import { AddColumn } from "@/app/public/images/icons/AddColumn";
import { LidndDialog } from "@/components/ui/lidnd_dialog";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { ParticipantEditDialog } from "@/encounters/[encounter_index]/ParticipantEditDialog";
import { EncounterTagger } from "@/encounters/EncounterTagger";

export const EncounterBattleUI = observer(function BattleUI() {
  const [campaign] = useCampaign();
  const [encounter] = useEncounter();
  const { mutate: startEncounter } = useStartEncounter();
  const { mutate: updateEncounter } = useUpdateEncounter();
  const uiStore = useEncounterUIStore();
  const { rollEncounter } = useEncounterLinks();
  const user = useUser();
  const { mutate: updateColumnBatch } = api.updateColumnBatch.useMutation();

  useEncounterHotkey("k", (e) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      uiStore.toggleParticipantEdit();
    }
  });

  useEncounterHotkey("e", (e) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      const cols = encounter.columns;
      const newCols = StatColumnUtils.equalize(cols);
      updateColumnBatch({ encounter_id: encounter.id, columns: newCols });
    }
  });

  const monsters = EncounterUtils.participantsWithNoColumn(encounter);

  const difficulty = EncounterUtils.difficulty({
    encounter,
    campaign,
  });

  switch (encounter.status) {
    case "prep":
      return (
        <div className="flex flex-col max-h-full overflow-auto h-full">
          {/** TODO: figure out a way to make this a consistent header */}
          <div className="flex gap-1 p-3">
            <Link
              href={appRoutes.campaign({ campaign, user })}
              className="text-gray-400"
            >
              <Button variant="ghost">
                <HomeIcon /> Campaign
              </Button>
            </Link>
            <div className="flex gap-8 ml-auto">
              {campaign.system === "dnd5e" ? (
                <Link href={rollEncounter}>
                  <Button>Start encounter</Button>
                </Link>
              ) : (
                <Button
                  onClick={() => {
                    startEncounter(encounter.id);
                  }}
                >
                  <PlayIcon />
                  Start encounter
                </Button>
              )}
              <div className="flex gap-1">
                {EncounterUtils.allies(encounter).map((a) => (
                  <CreatureIcon key={a.id} creature={a.creature} size="small" />
                ))}
                <Link href={appRoutes.party({ campaign, user })}>
                  <Button variant="outline">Edit party</Button>
                </Link>
              </div>
            </div>
          </div>

          <Tabs
            defaultValue="prep"
            className={clsx(
              "flex justify-center w-full xl:max-h-full",
              battleStyles.root
            )}
          >
            {/**don't put gap here, it makes the tab contennt bits take up a bunch of vert space */}
            <div className="flex flex-col w-[800px] xl:w-[2000px] px-4 xl:px-8 xl:max-h-full">
              <div className="w-full flex flex-col gap-3">
                <EncounterNameInput />
                <div className="flex gap-8">
                  <TabsList>
                    <TabsTrigger
                      value="prep"
                      className="flex gap-2 items-center"
                    >
                      <span>Opponents</span>
                      <AngryIcon className="mr-2 h-4 w-4" />
                    </TabsTrigger>
                    <TabsTrigger
                      value="preview"
                      className="flex gap-2 items-center"
                    >
                      <span>Preview</span>
                      <Grid2X2 className="mr-2 h-4 w-4" />
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>
              <TabsContent
                value="prep"
                className="w-full xl:max-h-full flex flex-col gap-5"
                data-value="prep"
              >
                <div className="flex flex-col gap-5 w-full xl:grid grid-cols-2 xl:gap-6 xl:max-h-full">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-5">
                      <div className="flex gap-3">
                        <LidndLabel label="Target difficulty">
                          <Select
                            onValueChange={(v) => {
                              console.log(v);
                              updateEncounter({
                                ...encounter,
                                target_difficulty: v as any,
                              });
                            }}
                            defaultValue={
                              encounter.target_difficulty || undefined
                            }
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Select difficulty" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="easy">Easy</SelectItem>
                              <SelectItem value="standard">Standard</SelectItem>
                              <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                        </LidndLabel>
                        {campaign.system === "drawsteel" && (
                          <LidndLabel label="Est. Victories">
                            <LidndTextInput
                              type="number"
                              placeholder="0"
                              className="w-36"
                              value={encounter.average_victories ?? ""}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                updateEncounter({
                                  ...encounter,
                                  average_victories: isNaN(value)
                                    ? null
                                    : value,
                                });
                              }}
                            />
                          </LidndLabel>
                        )}
                        <LidndLabel label="Tags">
                          <EncounterTagger />
                        </LidndLabel>
                      </div>
                    </div>
                    <div>
                      <DescriptionTextArea />
                    </div>
                    <Card>
                      <ReminderInput />
                    </Card>
                  </div>
                  <div className="flex flex-col gap-8 min-h-0">
                    <div
                      className={`flex w-full flex-wrap gap-6 sm:flex-nowrap rounded-md items-center`}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-400">Current</span>
                        <span className="text-2xl font-bold">{difficulty}</span>
                      </div>

                      <div className="flex flex-col items-baseline">
                        <span className="text-sm whitespace-nowrap text-gray-400">
                          Total {CampaignUtils.crLabel(campaign)}
                        </span>
                        <span className="text-2xl font-bold">
                          {EncounterUtils.totalCr(encounter)}
                        </span>
                      </div>
                      <div className="flex flex-col items-baseline">
                        <span className="text-sm whitespace-nowrap text-gray-400">
                          Remaining {CampaignUtils.crLabel(campaign)}
                        </span>
                        <span className="text-2xl font-bold">
                          {EncounterUtils.remainingCr(encounter, campaign)}
                        </span>
                      </div>
                      <div className="w-full pb-3 pt-3 sm:pb-0">
                        <EncounterBudgetSlider />
                      </div>
                    </div>
                    <div className="flex flex-col gap-5 xl:max-h-full xl:overflow-auto">
                      {campaign.system === "drawsteel" ? (
                        <TurnGroupSetup />
                      ) : null}
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent
                value="preview"
                className="w-full"
                data-value="preview"
              >
                <div className="w-full flex gap-3 h-full">
                  <EncounterBattlePreview />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      );
    case "run":
      return (
        <section className="flex flex-col max-h-full min-h-0 h-full">
          {campaign.system === "dnd5e" ? <InitiativeTracker /> : null}

          <Reminders />
          <div className="flex gap-4 flex-col w-full h-full">
            {monsters.length > 0 ? (
              <div className="flex w-full flex-wrap">
                {monsters.map((p) => (
                  <div key={p.id}>
                    <span>{ParticipantUtils.name(p)}</span>
                    <ColumnDragButton participant={p} />
                  </div>
                ))}
              </div>
            ) : null}

            <RunEncounter />
          </div>
        </section>
      );
    default: {
      //@ts-expect-error - exhaustive check
      const _: never = encounter.status;
      throw new Error(`Unhandled case: ${encounter.status}`);
    }
  }
});

function EncounterNameInput({
  textSize = "large",
}: {
  textSize?: "small" | "large";
}) {
  const [encounter] = useEncounter();
  const { mutate: updateEncounter } = useUpdateEncounter();
  const debounceUpdateName = useDebouncedCallback((name: string) => {
    updateEncounter({
      ...encounter,
      name,
    });
  }, 500);
  const [localName, setLocalName] = useState(encounter.name);

  return (
    <LidndTextInput
      value={localName}
      className={clsx("bg-transparent", {
        "text-3xl font-bold": textSize === "large",
        "text-lg h-7": textSize === "small",
      })}
      variant="ghost"
      placeholder="Encounter name"
      onChange={(e) => {
        setLocalName(e.target.value);
        debounceUpdateName(e.target.value);
      }}
    />
  );
}

function EncounterBudgetSlider() {
  const [campaign] = useCampaign();
  const [encounter] = useEncounter();

  const tiers = EncounterUtils.findCRBudget({ encounter, campaign });

  if (tiers === "no-players") {
    return <div>No players in encounter</div>;
  }

  const max = tiers.hardTier + 10;
  const easyCutOff = tiers.easyTier / max;
  const standardCutoff = tiers.standardTier / max;
  const hardCutoff = tiers.hardTier / max;

  return (
    <div className="w-full border h-5 relative text-gray-500">
      <div
        className="h-full bg-black absolute left-0 top-0"
        style={{ width: `${(EncounterUtils.totalCr(encounter) / max) * 100}%` }}
      />
      <div
        className="w-1 h-full bg-black absolute"
        style={{ left: `${easyCutOff * 100}%` }}
      >
        <span className="absolute bottom-full">{tiers.easyTier}</span>

        <span className="absolute top-full">Easy</span>
      </div>
      <div
        className="w-1 h-full bg-black absolute"
        style={{ left: `${standardCutoff * 100}%` }}
      >
        <span className="absolute bottom-full">{tiers.standardTier}</span>
        <span className="absolute top-full">Standard</span>
      </div>
      <div
        className="w-1 h-full bg-black absolute"
        style={{ left: `${hardCutoff * 100}%` }}
      >
        <span className="absolute bottom-full">{tiers.hardTier}</span>
        <span className="absolute top-full">Hard</span>
      </div>
    </div>
  );
}

function EncounterBattlePreview() {
  const { data: columns } = api.getColumns.useQuery(useEncounterId());
  const { parentWidth, containerRef } = useParentResizeObserver();
  return (
    <div className="flex flex-col">
      <div>
        <EqualizeColumnsButton />
      </div>
      <div
        className="flex min-h-[450px] overflow-hidden w-full h-full border shadow-md"
        ref={containerRef}
      >
        <ParentWidthContext.Provider value={parentWidth}>
          {columns?.map((c, i) =>
            c.is_home_column ? (
              <StatColumnComponent column={c} index={i} key={c.id}>
                <div className="w-full h-full flex">
                  <DescriptionTextArea />
                </div>
              </StatColumnComponent>
            ) : (
              <StatColumnComponent column={c} index={i} key={c.id}>
                {i === 0 ? <DescriptionTextArea /> : null}
                <PreviewCardsForColumn column={c} />
              </StatColumnComponent>
            )
          )}
        </ParentWidthContext.Provider>
      </div>
    </div>
  );
}

export const ColumnDragButton = observer(function ColumnDragButton({
  participant,
}: {
  participant: Participant;
}) {
  const uiStore = useEncounterUIStore();

  if (!uiStore.isEditingInitiative) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      className="z-10  cursor-grab"
      onDragStart={(e) => {
        typedDrag.set(e.dataTransfer, dragTypes.participant, participant);
        uiStore.startDraggingBattleCard();
      }}
      draggable
    >
      <Grip />
    </Button>
  );
});

function BattleCardTools({ participant }: { participant: Participant }) {
  const { mutate: removeParticipant } = useRemoveParticipantFromEncounter();

  return (
    <>
      <LidndPopover
        trigger={
          <ButtonWithTooltip text="More" variant="ghost">
            <MoreHorizontal />
          </ButtonWithTooltip>
        }
        className="justify-center flex"
      >
        <Button
          onClick={() =>
            removeParticipant({
              encounter_id: participant.encounter_id,
              participant_id: participant.id,
            })
          }
          variant="destructive"
        >
          Remove participant
        </Button>
      </LidndPopover>
    </>
  );
}

function PreviewCardsForColumn({ column }: { column: StatColumn }) {
  const [encounter] = useEncounter();
  const participantsInColumn = EncounterUtils.participantsForColumn(
    encounter,
    column
  );
  const uiStore = useEncounterUIStore();

  return (
    <div className="flex flex-col max-h-full overflow-hidden h-full">
      {participantsInColumn.length === 0 ? (
        <div className="">No stat blocks yet</div>
      ) : null}
      {participantsInColumn.map((p) => (
        <div
          className="flex flex-col overflow-hidden"
          key={p
            .sort(ParticipantUtils.sortLinearly)
            .map((p) => p.id)
            .join("-")}
        >
          {p[0]?.creature ? (
            <div className="w-full h-full max-h-full overflow-hidden">
              <Button
                variant="ghost"
                className="z-10  cursor-grab"
                onDragStart={(e) => {
                  typedDrag.set(e.dataTransfer, dragTypes.participant, p[0]!);
                  uiStore.startDraggingBattleCard();
                }}
                draggable
              >
                <Grip />
              </Button>
              <CreatureStatBlock creature={p[0]?.creature} />
            </div>
          ) : (
            <div> no creature for first participant... a bug</div>
          )}
        </div>
      ))}
    </div>
  );
}

export type BattleCardProps = {
  participant: ParticipantWithData;
  children?: React.ReactNode;
  className?: string;
  isSelected?: boolean;
  extraHeaderButtons?: React.ReactNode;
  ref?: (ref: HTMLDivElement) => void;
  indexInGroup?: number;
} & React.HTMLAttributes<HTMLDivElement>;

export const ParticipantBattleData = observer(function BattleCard({
  participant,
  extraHeaderButtons,
  ref,
  indexInGroup,
  ...props
}: BattleCardProps) {
  const encounterUiStore = useEncounterUIStore();
  const [encounter] = useEncounter();
  const turnGroupsById = EncounterUtils.turnGroupsById(encounter);
  const tgForParticipant = participant.turn_group_id
    ? turnGroupsById[participant.turn_group_id]
    : undefined;

  return (
    <div
      className={clsx(`relative flex-col gap-6 w-full flex px-1`)}
      ref={ref}
      {...props}
    >
      <BattleCardLayout key={participant.id} participant={participant}>
        <div className="flex flex-col gap-3 w-full">
          {ParticipantUtils.isInanimate(participant) ? null : (
            <div className="flex gap-2 items-center justify-between py-2">
              <div className="flex flex-col gap-2 w-full">
                <div className="flex gap-3 w-full">
                  <div className="flex gap-2 items-center relative w-full">
                    {ParticipantUtils.hasIcon(participant) ? (
                      <BattleCardCreatureIcon participant={participant} />
                    ) : null}
                    {tgForParticipant ? (
                      <TurnGroupLabel
                        turnGroup={tgForParticipant}
                        className="h- w-5"
                      />
                    ) : null}
                    <div className="flex justify-between w-full flex-wrap items-center">
                      <BattleCardCreatureName participant={participant} />
                      {ParticipantUtils.isMinion(participant) ? (
                        <div className="flex gap-1 text-gray-400 px-3">
                          <UsersIcon className="h-5 w-5  inline-block" />
                          <span>
                            x {ParticipantUtils.numberOfMinions(participant)}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <ParticipantHealthForm
                    participant={participant}
                    extraInputs={<ParticipantNotes participant={participant} />}
                  />
                </div>
              </div>
            </div>
          )}

          {encounterUiStore.isEditingInitiative && (
            <div className="flex w-full flex-wrap">
              <GroupParticipantHPOverride participant={participant} />
              <div className="text-gray-500">
                {indexInGroup === 0 ? (
                  <ColumnDragButton participant={participant} />
                ) : null}
                <BattleCardTools participant={participant} />
              </div>
            </div>
          )}
        </div>
      </BattleCardLayout>
    </div>
  );
});

function ParticipantNotes({
  participant,
}: {
  participant: ParticipantWithData;
}) {
  const { mutate: updateParticipant } = useUpdateEncounterParticipant();

  const debouncedUpdate = useDebouncedCallback((participant: Participant) => {
    updateParticipant(participant);
  }, 500);

  const configuredPlaceholder = Placeholder.configure({
    placeholder: "notes",
  });
  const editor = useEditor({
    extensions: [StarterKit, configuredPlaceholder],
    content: participant.notes,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      debouncedUpdate({ ...participant, notes: content });
    },
  });

  return (
    <div className="w-full flex-1 h-full">
      <LidndTextArea editor={editor} />
    </div>
  );
}

export const GroupParticipantHPOverride = observer(
  function GroupParticipantHPOverride({
    participant,
  }: {
    participant: ParticipantWithData;
  }) {
    const uiStore = useEncounterUIStore();
    const [maxHpOverride, setMaxHpOverride] = useState(
      participant.max_hp_override?.toString() ?? ""
    );
    const { mutate: updateParticipant } = useUpdateEncounterParticipant();
    if (!uiStore.isEditingInitiative) {
      return null;
    }
    const maxHpAsNumber = Number(maxHpOverride);
    const isValidMaxHp = !isNaN(maxHpAsNumber) && maxHpAsNumber > 0;
    return (
      <div className="flex">
        <Input
          type="number"
          className="w-32"
          placeholder="Override"
          value={maxHpOverride ?? ""}
          onChange={(e) => {
            setMaxHpOverride(e.target.value);
          }}
        />
        <Button
          variant="ghost"
          disabled={!isValidMaxHp}
          onClick={() =>
            updateParticipant({
              ...participant,
              max_hp_override: maxHpAsNumber,
              hp: maxHpAsNumber,
            })
          }
        >
          {" "}
          Override max hp{" "}
        </Button>
      </div>
    );
  }
);

export const GroupBattleUITools = observer(function GroupBattleUITools() {
  const [encounter] = useEncounter();
  return (
    <div className="flex flex-wrap items-center">
      <div className="flex items-center gap-1"></div>
      <div className="px-2">
        <EncounterDetails key={encounter.started_at?.getTime()} />
      </div>
    </div>
  );
});

export function EqualizeColumnsButton() {
  const { mutate: updateColumnBatch } = api.updateColumnBatch.useMutation();
  const [encounter] = useEncounter();

  const sumColumnPercents = Math.round(
    R.sumBy(encounter.columns, (c) => c.percent_width)
  );
  const aNegativeWidthColumn = encounter.columns.find(
    (c) => c.percent_width < 0
  );
  return (
    <ButtonWithTooltip
      text="Equalize columns"
      variant="ghost"
      className="flex text-gray-400 p-2"
      onClick={() => {
        const cols = encounter.columns;
        const newCols = StatColumnUtils.equalize(cols);
        updateColumnBatch({ encounter_id: encounter.id, columns: newCols });
      }}
    >
      <Columns />
      {sumColumnPercents !== 100
        ? `sum: ${sumColumnPercents}? Something's off with column widths, click me`
        : null}
      {aNegativeWidthColumn
        ? `column ${aNegativeWidthColumn.participants[0]?.creature.name} has negative width, click me`
        : null}
    </ButtonWithTooltip>
  );
}

export const BattleCardLayout = observer(function BattleCardLayout({
  className,
  children,
  participant,
  ...props
}: {
  className?: string;
  children: React.ReactNode;
  participant: ParticipantWithData;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "bg-white h-full max-h-full overflow-hidden w-full flex flex-col transition-all group",
        {
          "shadow-lg shadow-red-800":
            !ParticipantUtils.isFriendly(participant) && participant.is_active,
        },
        {
          "shadow-lg shadow-blue-800":
            ParticipantUtils.isFriendly(participant) && participant.is_active,
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

export function BattleCardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-col gap-4 w-full", className)}>
      {children}
    </div>
  );
}

export type BattleCardParticipantProps = {
  participant: ParticipantWithData;
};

export function BattleCardStatusEffects({
  participant,
}: BattleCardParticipantProps) {
  const { mutate: removeStatusEffect } = useRemoveStatusEffect();

  if (!participant.status_effects?.length) {
    return null;
  }

  return (
    <span className={"h-12 flex gap-1 flex-wrap items-center"}>
      {participant.status_effects?.map((se) => (
        <LidndPopover
          key={se.id}
          trigger={
            <button>
              <EffectIcon effect={se.effect} />
            </button>
          }
          className="flex flex-col gap-2 text-sm"
        >
          {ParticipantEffectUtils.description(se)}
          {!!se.save_ends_dc && <span>Save ends ({se.save_ends_dc})</span>}
          <Button onClick={() => removeStatusEffect(se)}>Remove</Button>
        </LidndPopover>
      ))}
    </span>
  );
}

function TurnGroupLabel({
  turnGroup,
  className,
}: {
  turnGroup?: Pick<TurnGroup, "id" | "hex_color">;
  className?: string;
}) {
  const uiStore = useEncounterUIStore();
  if (!turnGroup) {
    return null;
  }
  const { id, hex_color } = turnGroup;

  return (
    <Button
      variant="ghost"
      onClick={() => uiStore.toggleFocusThisGroup(id)}
      className={clsx("rounded-sm shadow-lg", className)}
      style={{ background: hex_color ?? "" }}
    />
  );
}

export const BattleCardCreatureName = observer(function BattleCardCreatureName({
  participant,
}: BattleCardParticipantProps) {
  const [encounter] = useEncounter();
  const { mutate: updateParticipant } = useUpdateEncounterParticipant();
  return (
    <span className="flex gap-1 items-center">
      <LidndPopover
        trigger={
          <Button
            variant="ghost"
            className={`flex flex-col gap-0 h-auto px-0 py-0 ${
              EncounterUtils.participantHasPlayed(encounter, participant)
                ? "opacity-50"
                : null
            }`}
          >
            <span className="text-lg truncate max-w-full">
              {ParticipantUtils.name(participant)}
            </span>
          </Button>
        }
      >
        <div className="grid grid-cols-3">
          {labelColors.map((color, index) => (
            <Button
              key={index}
              style={{ backgroundColor: color }}
              variant="ghost"
              onClick={() => {
                updateParticipant({
                  ...participant,
                  hex_color: color === participant.hex_color ? null : color,
                });
              }}
            />
          ))}
        </div>
      </LidndPopover>
    </span>
  );
});

export const BattleCardCreatureIcon = observer(function BattleCardCreatureIcon({
  participant,
}: BattleCardParticipantProps) {
  const [error, setError] = useState<boolean>(false);
  const [encounter] = useEncounter();

  if (error) {
    // TODO: maybe revisit, just figure that no icon is better than just a random user icon or whatever.
    // space is a premium, and if there IS an icon, it helps emphasize the creature,
    // since special creatures are more likely to have an icon
    return null;
  }
  return participant.creature_id === "pending" ? (
    <span>Loading</span>
  ) : (
    <div
      className={clsx(
        {
          "border-4": participant.hex_color,

          "opacity-50": EncounterUtils.participantHasPlayed(
            encounter,
            participant
          ),
        },
        "relative flex flex-shrink-0 h-10 w-10"
      )}
      style={{ borderColor: ParticipantUtils.iconHexColor(participant) }}
    >
      <Image
        src={CreatureUtils.awsURL(participant.creature, "icon")}
        alt={participant.creature.name}
        style={imageStyle}
        width={participant.creature.icon_width}
        height={participant.creature.icon_height}
        onError={() => setError(true)}
      />
    </div>
  );
});

export function BattleCardHealthAndStatus({
  participant,
}: BattleCardParticipantProps) {
  return <div className="flex flex-col gap-9"></div>;
}

export function MinionCardStack({ minionCount }: { minionCount: number }) {
  return (
    <Badge className="absolute top-2 right-2 w-11 whitespace-nowrap">
      x {minionCount}
    </Badge>
  );
}

export function HealthMeterOverlay({
  participant,
}: BattleCardParticipantProps) {
  const percentDamage = ParticipantUtils.percentDamage(participant);
  return (
    <div
      style={{ height: `${percentDamage}%` }}
      className={clsx(
        "absolute bottom-0 left-0 w-full bg-opacity-70 transition-all z-10 opacity-100",
        {
          "bg-gray-500": percentDamage >= 100,
          "bg-red-500": percentDamage !== 100,
        }
      )}
    />
  );
}

export const AnimationListItem = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const isPresent = useIsPresent();
  const animations = {
    style: {
      position: isPresent ? "static" : "absolute",
    },
  } as const;
  return (
    <motion.div {...animations} layout>
      {children}
    </motion.div>
  );
};

function PrepParticipant({
  participant: p,
}: {
  participant: ParticipantWithData;
}) {
  const [encounter] = useEncounter();
  const [campaign] = useCampaign();
  return (
    <div
      key={p.id}
      className="flex gap-2 items-center max-w-[400px] cursor-grab active:cursor-grabbing"
      draggable={encounter.turn_groups.length > 0}
      onDragStart={(e) => {
        if (encounter.turn_groups.length > 0) {
          typedDrag.set(e.dataTransfer, dragTypes.participant, p);
        }
      }}
    >
      <RemoveCreatureFromEncounterButton participant={p} />
      <ParticipantEditDialog participant={p} />
      {encounter.turn_groups.length > 0 ? (
        <Grip className="h-4 w-4 text-gray-400" />
      ) : null}
      <CreatureIcon creature={p.creature} size="small" />
      <div className="flex flex-col max-w-full">
        <span className="truncate">{ParticipantUtils.name(p)}</span>
        <span className="flex gap-5">
          <LidndLabel label={crLabel(campaign)}>
            <span className="text-base ml-1">
              {ParticipantUtils.challengeRating(p)}
            </span>
          </LidndLabel>
          <LidndLabel label={ParticipantUtils.isMinion(p) ? "Total HP" : "HP"}>
            <span className="text-base ml-1">{ParticipantUtils.maxHp(p)}</span>
          </LidndLabel>
          {ParticipantUtils.isMinion(p) ? (
            <div className="flex text-gray-400 gap-2">
              <LidndTooltip text="Minion">
                <UsersIcon className="h-5 w-5" />
              </LidndTooltip>
              <span>x {ParticipantUtils.numberOfMinions(p)}</span>
            </div>
          ) : null}
        </span>
      </div>
    </div>
  );
}

function TurnGroupSetup() {
  const [encounter] = useEncounter();
  const [campaign] = useCampaign();
  const [creatureAddDialogIsOpen, setCreatureAddDialogIsOpen] = useState(false);
  const [acceptDrop, setAcceptDrop] = useState(0);
  const { mutate: updateParticipant } = useUpdateEncounterParticipant();
  const monstersWihoutGroup = EncounterUtils.monstersInCrOrder(
    encounter
  ).filter((m) => !m.turn_group_id);
  const keyForExistingCreature = getQueryKey(
    api.addExistingCreatureAsParticipant
  );
  console.log("keyForExistingCreature", keyForExistingCreature);
  const qc = useQueryClient();
  // i would have to prop drill a bit to get a callback into existing creature add, so instead
  // i will do this
  useEffect(() => {
    return qc.getMutationCache().subscribe((event) => {
      const { mutation, type } = event;
      const key = (
        mutation?.options?.mutationKey?.[0] as Array<string>
      )?.[0] as string | undefined;
      const targetKey = keyForExistingCreature?.[0]?.[0];
      if (key === targetKey && type === "added") {
        console.log(`turn group setup detected existing creature added`);
        setCreatureAddDialogIsOpen(false);
      }
    });
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <LidndDialog
        isOpen={creatureAddDialogIsOpen}
        onClose={() => setCreatureAddDialogIsOpen(false)}
        title="Add adversary"
        content={
          <Card className="p-6 flex flex-col gap-5 w-full h-[800px] overflow-hidden">
            <EditModeOpponentForm
              onSubmitSuccess={() => setCreatureAddDialogIsOpen(false)}
            />
          </Card>
        }
        trigger={
          <Button onClick={() => setCreatureAddDialogIsOpen(true)}>
            Add adversary <PlusIcon />
          </Button>
        }
      />
      <div className="flex flex-wrap gap-10 items-center">
        <LidndLabel label="Player count" className="flex gap-2 items-center">
          <span className="text-lg">
            {EncounterUtils.playerCount(encounter)}
          </span>
        </LidndLabel>
        <LidndLabel
          label="Single player strength"
          className="gap-2 flex items-center"
        >
          <span className="text-lg">
            {targetSinglePlayerStrength({ encounter, campaign })}
          </span>
        </LidndLabel>
      </div>
      <div className={clsx("flex flex-col gap-5")}>
        {monstersWihoutGroup.length > 0 || encounter.turn_groups.length > 0 ? (
          <div
            className={clsx(
              "grid grid-cols-1 sm:grid-cols-2 gap-3 gap-x-12 min-h-[60px] border-2 border-dashed border-transparent p-3 rounded",
              {
                "border-blue-400 bg-blue-50": acceptDrop > 0,
              }
            )}
            onDrop={(e) => {
              e.preventDefault();
              const droppedParticipant = typedDrag.get(
                e.dataTransfer,
                dragTypes.participant
              );
              if (droppedParticipant) {
                updateParticipant({
                  ...droppedParticipant,
                  created_at: new Date(droppedParticipant.created_at),
                  turn_group_id: null,
                });
              }
              setAcceptDrop(0);
            }}
            onDragOver={(e) => {
              if (typedDrag.includes(e.dataTransfer, dragTypes.participant)) {
                e.preventDefault();
              }
            }}
            onDragEnter={(e) => {
              if (typedDrag.includes(e.dataTransfer, dragTypes.participant)) {
                e.preventDefault();
                setAcceptDrop((count) => count + 1);
              }
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setAcceptDrop((count) => count - 1);
            }}
          >
            {monstersWihoutGroup.length > 0 ? (
              monstersWihoutGroup.map((p) => (
                <PrepParticipant participant={p} key={p.id} />
              ))
            ) : (
              <div className="col-span-2 text-center text-gray-400">
                Drag participants here to remove them from groups
              </div>
            )}
          </div>
        ) : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {encounter.turn_groups.map((tg) => (
            <TurnGroupDisplay tg={tg} key={tg.id} />
          ))}
          <CreateTurnGroupForm />
        </div>
      </div>
    </div>
  );
}

function TurnGroupDisplay({ tg }: { tg: TurnGroup }) {
  const [encounter] = useEncounter();
  const [campaign] = useCampaign();
  const [acceptDrop, setAcceptDrop] = useState(0);
  // maybe this is wasteful to compute every render, but I think it's fine
  const turnGroupedParticipants =
    EncounterUtils.participantsByTurnGroup(encounter);
  const participantsInGroup = turnGroupedParticipants[tg.id] || [];
  const { mutate: updateTurnGroup } = api.updateTurnGroup.useMutation();
  const { mutate: deleteTurnGroup } = api.deleteTurnGroup.useMutation();
  const { mutate: updateParticipant } = useUpdateEncounterParticipant();
  const totalCr = R.sumBy(participantsInGroup, (p) =>
    ParticipantUtils.challengeRating(p)
  );
  const setTurnGroupColor = (hexColor: string | null) =>
    updateTurnGroup({
      ...tg,
      encounter_id: encounter.id,
      hex_color: hexColor,
    });
  return (
    <div
      key={tg.id}
      className={clsx("flex flex-col gap-2 border-2 border-dashed p-3", {
        "ring-2 ring-blue-400": acceptDrop > 0,
      })}
      onDrop={(e) => {
        e.preventDefault();
        const droppedParticipant = typedDrag.get(
          e.dataTransfer,
          dragTypes.participant
        );
        if (droppedParticipant) {
          updateParticipant({
            ...droppedParticipant,
            created_at: new Date(droppedParticipant.created_at),
            turn_group_id: tg.id,
          });
        }
        setAcceptDrop(0);
      }}
      onDragOver={(e) => {
        if (typedDrag.includes(e.dataTransfer, dragTypes.participant)) {
          e.preventDefault();
        }
      }}
      onDragEnter={(e) => {
        if (typedDrag.includes(e.dataTransfer, dragTypes.participant)) {
          e.preventDefault();
          setAcceptDrop((count) => count + 1);
        }
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setAcceptDrop((count) => count - 1);
      }}
    >
      <div className="flex gap-3 items-center">
        <Button
          variant="ghost"
          className="text-gray-200 p-2 w-3 h-3"
          onClick={() =>
            deleteTurnGroup({
              id: tg.id,
              encounter_id: encounter.id,
            })
          }
        >
          <Trash />
        </Button>
        <span>{tg.name}</span>
        <span className="flex gap-1">
          <span>{crLabel(campaign)}</span>
          <span>{totalCr}</span>
        </span>
        <LidndPopover
          trigger={
            <Button
              className="flex items-center gap-2 text-sm text-gray-300"
              variant="ghost"
            >
              <span>Color</span>
              <div
                className="h-4 w-4 rounded border border-slate-500"
                style={{ backgroundColor: tg.hex_color ?? undefined }}
              />
            </Button>
          }
        >
          <div className="flex flex-wrap items-center gap-2 pl-3">
            {labelColors.map((color) => (
              <Button
                key={color}
                variant="ghost"
                className={clsx("h-5 w-5 border", {
                  "ring-2 ring-white": tg.hex_color === color,
                })}
                style={{ backgroundColor: color }}
                onClick={() =>
                  setTurnGroupColor(tg.hex_color === color ? null : color)
                }
              />
            ))}
          </div>
        </LidndPopover>
      </div>
      <div className="flex flex-col gap-1">
        {participantsInGroup.map((p) => (
          <PrepParticipant participant={p} key={p.id} />
        )) || <span>No participants assigned</span>}
      </div>
    </div>
  );
}

function CreateTurnGroupForm() {
  const [encounter] = useEncounter();
  const { mutate: createTurnGroup } = api.createTurnGroup.useMutation();
  const [name, setName] = useState("");
  const [hexColor, setHexColor] = useState("#ff0000");
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        createTurnGroup({
          encounter_id: encounter.id,
          name,
          hex_color: hexColor,
        });
      }}
    >
      <LidndTextInput
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Turn group name"
      />
      <div className="flex flex-wrap gap-3">
        {labelColors.map((color) => (
          <Button
            className={clsx("w-3 h-3", {
              "opacity-25": color !== hexColor,
            })}
            key={color}
            onClick={(e) => {
              e.preventDefault();
              setHexColor(color);
            }}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <Button variant="secondary" type="submit">
        Create turn group
      </Button>
    </form>
  );
}

const ParentWidthContext = createContext<number | null>(null);

const useParentResizeObserver = () => {
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
    <div className="flex flex-col gap-2 h-full w-full">
      <GroupTurnToggles middle={<GroupBattleUITools />} />
      <div
        className="flex relative w-full h-full max-h-full overflow-hidden pb-2"
        ref={containerRef}
      >
        <ParentWidthContext.Provider value={parentWidth}>
          <div className="overflow-auto w-full h-full flex">
            <StatColumns />
          </div>
        </ParentWidthContext.Provider>
      </div>
    </div>
  );
});

function GroupTurnToggles({ middle }: { middle?: React.ReactNode }) {
  const [encounter] = useEncounter();
  const turnGroupsById = EncounterUtils.turnGroupsById(encounter);
  const participantsByTurnGroup =
    EncounterUtils.participantsByTurnGroup(encounter);
  const participantsWithoutTurnGroup =
    EncounterUtils.monstersWithoutTurnGroup(encounter);
  return (
    <Card className="flex gap-4 p-2 items-center justify-evenly w-full sticky top-0 z-50">
      <div className="flex gap-5 flex-wrap">
        {EncounterUtils.players(encounter).map((p) => (
          <TurnTakerQuickView participant={p} key={p.id} />
        ))}
      </div>
      {middle}
      <div className="flex gap-5 flex-wrap">
        {participantsWithoutTurnGroup.map((p) => (
          <TurnTakerQuickView participant={p} key={p.id} />
        ))}
        {Object.entries(participantsByTurnGroup).map(([tgId, participants]) => (
          <div key={tgId}>
            <TurnTakerQuickView
              participant={participants[0]}
              buttonExtra={<TurnGroupLabel turnGroup={turnGroupsById[tgId]} />}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

export const StatColumns = observer(function StatColumns() {
  const [encounter] = useEncounter();
  const encounterId = encounter.id;
  //TODO: some weirdness here, looks like we still have participants on the column...
  // do we actually assign participants to columns?
  const { data: columns } = api.getColumns.useQuery(encounterId);
  const uiStore = useEncounterUIStore();
  const participantsByColumn = EncounterUtils.participantsByColumn(
    encounter,
    uiStore
  );
  const { registerBattleCardRef } = useEncounterUIStore();

  return columns?.map((c, index) => (
    <StatColumnComponent column={c} index={index} key={c.id}>
      {c.is_home_column ? (
        <div className="bg-white px-3">
          <DescriptionTextArea />
        </div>
      ) : null}
      <div
        className={clsx(
          "flex flex-col gap-4 h-full",
          battleStyles.parentContainer
        )}
      >
        {participantsByColumn[c.id]?.slice().map((p) => (
          <div key={p.map((p) => p.id).join("-")} className="flex flex-col">
            <div
              className={clsx("flex flex-col px-2", {
                [battleStyles.participantBattleData ?? ""]: p.length > 1,
              })}
            >
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
            </div>
            {p[0]?.creature ? (
              <>
                <RunCreatureStatBlock creature={p[0].creature} />
              </>
            ) : (
              <div>no creature... probably a bug</div>
            )}
          </div>
        ))}
      </div>
    </StatColumnComponent>
  ));
});

const RunCreatureStatBlock = observer(function RunCreatureStatBlock({
  creature,
}: {
  creature: Creature;
}) {
  const uiStore = useEncounterUIStore();

  return (
    <div>
      <CreatureStatBlock
        creature={creature}
        ref={(el) => uiStore.registerStatBlockRef(creature.id, el)}
      />
    </div>
  );
});

function TurnTakerQuickView({
  participant,
  buttonExtra,
}: {
  participant: ParticipantWithData;
  buttonExtra?: React.ReactNode;
}) {
  const id = useEncounterId();
  const [encounter] = useEncounter();
  const turnGroupsById = EncounterUtils.turnGroupsById(encounter);
  const turnGroupForParticipant =
    turnGroupsById[participant.turn_group_id ?? ""];
  const { mutate: toggleParticipantHasPlayedThisRound } = useToggleGroupTurn();
  const hasPlayed = EncounterUtils.participantHasPlayed(encounter, participant);
  return (
    <div
      className={clsx("flex flex-col p-2 rounded-md", {
        "opacity-50": hasPlayed,
      })}
    >
      {turnGroupForParticipant
        ? turnGroupForParticipant.name
        : ParticipantUtils.name(participant)}
      <div className="flex w-full gap-2">
        <Button
          variant="outline"
          onClick={() =>
            toggleParticipantHasPlayedThisRound({
              encounter_id: id,
              participant_id: participant.id,
            })
          }
          className={clsx("flex p-2 gap-1 rounded-md", {
            "shadow-lg": !hasPlayed,
          })}
        >
          {hasPlayed ? (
            <CheckCircle className="h-4 w-8" />
          ) : (
            <Circle className="h-4 w-8" />
          )}
        </Button>
        {buttonExtra}
      </div>
    </div>
  );
}

export function CreateNewColumnButton() {
  const { getColumns } = api.useUtils();
  const encounterId = useEncounterId();
  const { data: columns } = api.getColumns.useQuery(encounterId);
  const { mutate: createColumn } = api.createColumn.useMutation({
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
  const [acceptDrop, setAcceptDrop] = useState(0);
  const { encounterById, getColumns } = api.useUtils();
  const encounterId = useEncounterId();
  const [encounter] = useEncounter();
  const encounterUiStore = useEncounterUIStore();
  const { data: columns } = api.getColumns.useQuery(encounterId);
  const { mutate: assignParticipantToColumn } =
    api.assignParticipantToColumn.useMutation({
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
          `flex flex-col h-full max-h-full items-start relative flex-grow`
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
          setAcceptDrop(0);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (
            !typedDrag.includes(e.dataTransfer, dragTypes.participant) ||
            column.is_home_column
          ) {
            return;
          }
          setAcceptDrop((count) => count + 1);
        }}
        onDragOver={(e) => {
          if (!typedDrag.includes(e.dataTransfer, dragTypes.participant)) {
            return;
          }
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragLeave={() => setAcceptDrop((count) => count - 1)}
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
        <div
          className={clsx(
            "flex flex-col gap-3 w-full max-h-full h-full bg-white",
            {
              "bg-blue-500": acceptDrop > 0,
            }
          )}
        >
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
      className="w-1 hover:bg-gray-500 right-0 z-10 last:hidden bg-gray-100"
      style={{ cursor: "ew-resize" }}
    />
  );
}
