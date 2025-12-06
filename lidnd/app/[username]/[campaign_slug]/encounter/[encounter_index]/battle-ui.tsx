"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as R from "remeda";
import { useState } from "react";
import { motion, useIsPresent } from "framer-motion";
import clsx from "clsx";
import type { Participant, ParticipantWithData } from "@/server/api/router";
import { LidndPopover } from "@/encounters/base-popover";
import { EffectIcon } from "./status-input";
import {
  RunEncounter,
  ParentWidthContext,
  StatColumnComponent,
  useParentResizeObserver,
} from "./encounter-run-ui";
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
  useUpdateGroupTurn,
  useUpdateEncounterParticipant,
  useEncounterHotkey,
  useUpdateEncounter,
} from "@/encounters/[encounter_index]/hooks";
import { useDebouncedCallback } from "use-debounce";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { LidndTextArea } from "@/components/ui/lidnd-text-area";
import {
  ReminderInput,
  Reminders,
} from "@/encounters/[encounter_index]/reminders";
import {
  Check,
  Columns,
  Edit,
  Grid2X2,
  Grip,
  Home,
  ListOrdered,
  MoreHorizontal,
  Pen,
  PlayIcon,
  Trash,
} from "lucide-react";
import Link from "next/link";
import { imageStyle, InitiativeTracker } from "./battle-bar";
import { EncounterDifficulty } from "./encounter-difficulty";
import { dragTypes, typedDrag } from "@/app/[username]/utils";
import { useEncounterId } from "@/encounters/[encounter_index]/encounter-id";
import { api } from "@/trpc/react";
import type { StatColumn } from "@/server/api/columns-router";
import { ButtonWithTooltip } from "@/components/ui/tip";
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
} from "@/components/ui/select";
import { SelectItem } from "@radix-ui/react-select";
import { crLabel } from "@/utils/campaigns";
import type { TurnGroup } from "@/server/db/schema";
import { RemoveCreatureFromEncounterButton } from "@/encounters/[encounter_index]/encounter-prep";
import { StatColumnUtils } from "@/utils/stat-columns";

// TODO: existing creatures for ally/player upload?

export const EncounterBattleUI = observer(function BattleUI() {
  const [campaign] = useCampaign();
  const [encounter] = useEncounter();
  const { mutate: startEncounter } = useStartEncounter();
  const uiStore = useEncounterUIStore();
  const { rollEncounter } = useEncounterLinks();
  const user = useUser();

  useEncounterHotkey("k", (e) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      uiStore.toggleParticipantEdit();
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
        <div className="flex flex-col gap-5 max-h-full overflow-auto h-full">
          <div className="flex gap-1">
            {EncounterUtils.allies(encounter).map((a) => (
              <CreatureIcon key={a.id} creature={a.creature} size="small" />
            ))}
            <Link href={appRoutes.party({ campaign, user })}>
              <Button variant="outline">Edit party</Button>
            </Link>
            <div className="ml-auto">
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
            </div>
          </div>

          <Tabs defaultValue="prep" className="flex justify-center w-full">
            <div className="flex flex-col gap-5 w-[800px] px-4">
              <div className="w-full flex flex-col gap-2">
                <EncounterNameInput />
                <div>
                  <TabsList>
                    <TabsTrigger
                      value="prep"
                      className="flex gap-2 items-center"
                    >
                      <span>Prep</span>
                      <Pen className="mr-2 h-4 w-4" />
                    </TabsTrigger>
                    <TabsTrigger
                      value="preview"
                      className="flex gap-2 items-center"
                    >
                      <span>Layout</span>
                      <Grid2X2 className="mr-2 h-4 w-4" />
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>
              <TabsContent value="prep" className="w-full">
                <div className="flex flex-col gap-5 w-full">
                  <Card className="flex sm:flex-1 p-3 min-h-[150px] overflow-hidden">
                    <DescriptionTextArea />
                  </Card>
                  <div className="flex gap-10">
                    <EncounterDifficulty />
                  </div>
                  <Card className=" p-3 flex flex-col gap-8 w-full h-[600px]">
                    <div
                      className={`flex flex-wrap gap-10 sm:flex-nowrap p-2 sm:gap-7 rounded-md items-center`}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-400">Current</span>
                        <span className="text-2xl font-bold">{difficulty}</span>
                      </div>

                      <div className="flex flex-col items-baseline">
                        <span className="text-sm whitespace-nowrap text-gray-400">
                          Total {campaign.system === "dnd5e" ? "CR" : "EV"}
                        </span>
                        <span className="text-2xl font-bold">
                          {EncounterUtils.totalCr(encounter)}
                        </span>
                      </div>
                      <div className="flex flex-col items-baseline">
                        <span className="text-sm whitespace-nowrap text-gray-400">
                          Remaining {campaign.system === "dnd5e" ? "CR" : "EV"}
                        </span>
                        <span className="text-2xl font-bold">
                          {EncounterUtils.remainingCr(encounter, campaign)}
                        </span>
                      </div>
                      <div className="w-full pb-3 sm:pb-0">
                        <EncounterBudgetSlider />
                      </div>
                    </div>
                    <EditModeOpponentForm />
                  </Card>
                  {campaign.system === "drawsteel" ? <TurnGroupSetup /> : null}
                  <Card className="w-full">
                    <ReminderInput />
                  </Card>
                </div>
              </TabsContent>
              <TabsContent value="preview" className="w-full">
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
          <div className="flex gap-4 flex-col w-full max-h-full h-full overflow-hidden">
            {/**create space for the overlaid initiative tracker */}
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
      className={clsx("font-bold bg-transparent", {
        "text-3xl": textSize === "large",
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
    <div className="w-full border h-5 relative">
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
                <div className="w-full h-full flex items-center justify-center text-center">
                  This column will hold encounter info, participant health, etc
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
  ref: (ref: HTMLDivElement) => void;
  indexInGroup: number;
} & React.HTMLAttributes<HTMLDivElement>;

export const ParticipantBattleData = observer(function BattleCard({
  participant,
  extraHeaderButtons,
  ref,
  indexInGroup,
  ...props
}: BattleCardProps) {
  const [encounter] = useEncounter();
  const encounterUiStore = useEncounterUIStore();
  const { mutate: updateParticipant } = useUpdateEncounterParticipant();
  const turnGroups = R.indexBy(encounter.turn_groups, (tg) => tg.id);
  const tgForParticipant = participant.turn_group_id
    ? turnGroups[participant.turn_group_id]
    : null;

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

  const { mutate: updateCreatureHasPlayedThisRound } = useUpdateGroupTurn();

  return (
    <div
      className={clsx(`relative flex-col gap-6 w-full flex`)}
      ref={ref}
      {...props}
    >
      <BattleCardLayout key={participant.id} participant={participant}>
        <div className="flex flex-col gap-3 w-full py-2">
          {participant.inanimate ? (
            <LidndTextArea editor={editor} />
          ) : (
            <div className="flex gap-2 items-center justify-between">
              <div className="flex gap-2 items-center w-full relative">
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex gap-3 w-full">
                    <div className="flex flex-col w-full">
                      <div className="flex gap-2 items-center relative w-full">
                        {ParticipantUtils.hasIcon(participant) ? (
                          <BattleCardCreatureIcon participant={participant} />
                        ) : null}
                        <div className="flex flex-col">
                          <BattleCardCreatureName participant={participant} />
                          <LidndTextArea editor={editor} />
                        </div>

                        {tgForParticipant ? null : (
                          <Button
                            variant="outline"
                            className={clsx("p-2 ml-auto", {
                              "border-2": tgForParticipant,
                              "opacity-50": EncounterUtils.participantHasPlayed(
                                encounter,
                                participant
                              ),
                            })}
                            onClick={() =>
                              updateCreatureHasPlayedThisRound({
                                encounter_id: participant.encounter_id,
                                participant_id: participant.id,
                                has_played_this_round:
                                  !participant.has_played_this_round,
                              })
                            }
                          >
                            {EncounterUtils.participantHasPlayed(
                              encounter,
                              participant
                            ) ? (
                              <Check />
                            ) : (
                              "Ready"
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex gap-2 w-full items-center">
                      <div className="w-full h-6 relative bg-red-400 flex items-center justify-center">
                        <span className="whitespace-nowrap text-white absolute z-10">
                          {participant.hp} /{" "}
                          {ParticipantUtils.maxHp(participant)}
                        </span>
                        <div
                          className="absolute bg-emerald-400 h-full left-0"
                          style={{
                            width: `${ParticipantUtils.healthPercent(
                              participant
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                    <ParticipantHealthForm participant={participant} />
                  </div>
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
              <InanimateParticipantButton participant={participant} />
            </div>
          )}
        </div>
      </BattleCardLayout>
    </div>
  );
});

// TODO: inanimate is a hack flag to allow malice and other things the dm needs to track to sit inside the
// column layout. really we should have some "encounter element" system that lets us add things
// to the column layout without those things becoming participants.
function InanimateParticipantButton(props: {
  participant: ParticipantWithData;
}) {
  const { mutate: updateParticipant } = useUpdateEncounterParticipant();
  return (
    <Button
      variant="ghost"
      onClick={() =>
        updateParticipant({
          ...props.participant,
          inanimate: !props.participant.inanimate,
        })
      }
    >
      {props.participant.inanimate ? "Unmark Inanimate" : "Mark Inanimate"}
    </Button>
  );
}

const GroupParticipantHPOverride = observer(
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
  const { toggleParticipantEdit: toggleEditingInitiative } =
    useEncounterUIStore();
  const { campaignLink } = useEncounterLinks();
  const [encounter] = useEncounter();
  const { mutate: updateEncounter } = useUpdateEncounter();
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        <Link href={campaignLink} className="flex gap-3">
          <Button variant="ghost" className="text-gray-400">
            <Home />
          </Button>
        </Link>
        <ButtonWithTooltip
          text="Switch to prep mode"
          variant="ghost"
          className="flex text-gray-400"
          onClick={() =>
            updateEncounter({
              status: "prep",
              id: encounter.id,
              campaign_id: encounter.campaign_id,
              started_at: null,
            })
          }
        >
          <Edit />
        </ButtonWithTooltip>
        <EncounterNameInput textSize="small" />
      </div>
      <div className="flex gap-1 items-center flex-wrap">
        <EncounterDetails />
        <ButtonWithTooltip
          variant="ghost"
          className="flex text-gray-400"
          text="Edit initiative and columns"
          onClick={() => toggleEditingInitiative()}
        >
          <ListOrdered />
        </ButtonWithTooltip>
        <EqualizeColumnsButton />
      </div>
    </div>
  );
});

function EqualizeColumnsButton() {
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
      className="flex text-gray-400"
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

type BattleCardParticipantProps = {
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
const pastelLabels = ["#7eb2bc", "#e39ca0", "#edab33", "#94ae7f"];
const solidColors = [
  "#8abd11",
  "#0063c3",
  "#ff1353",
  "#fe9c1c",
  "#632469",
  "#fff91e",
  "#57b3bd",
  "#1f105b",
  "#ff1a13",
];
export const labelColors = [...pastelLabels, ...solidColors];

export const BattleCardCreatureName = observer(function BattleCardCreatureName({
  participant,
}: BattleCardParticipantProps) {
  const [encounter] = useEncounter();
  const { mutate: updateParticipant } = useUpdateEncounterParticipant();
  return (
    <span className="flex flex-col gap-1">
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

  if (error) {
    // TODO: maybe revisit, just figure that no icon is better than just a random user icon or whatever.
    // space is a premium, and if there IS an icon, it helps emphasize the creature,
    // since special creatures are more likely to have an icon
    return null;
  }
  return participant.creature_id === "pending" ? (
    <span>Loading</span>
  ) : (
    <div className="flex">
      <div
        className={clsx(
          { "border-4": participant.hex_color },
          "relative h-12 w-12"
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

function TurnGroupSetup() {
  const [encounter] = useEncounter();
  const [campaign] = useCampaign();
  const monstersWihoutGroup = EncounterUtils.monstersInCrOrder(
    encounter
  ).filter((m) => !m.turn_group_id);
  return (
    <div className="flex flex-col gap-3">
      <div className={clsx("flex flex-col gap-5")}>
        {monstersWihoutGroup.length > 0 ? (
          <div>
            <table className="table-auto border-spacing-4">
              <thead>
                <tr>
                  <th className="p-2"></th>
                  <th className="p-2"></th>
                  <th className="p-2">Opponent</th>
                  <th className="p-2">{crLabel(campaign)}</th>
                  {encounter.turn_groups.length === 0 ? null : (
                    <th className="p-2">Turn group</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {monstersWihoutGroup.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <RemoveCreatureFromEncounterButton participant={p} />
                    </td>
                    <td className="p-2">
                      <CreatureIcon creature={p.creature} size="small" />
                    </td>
                    <td className="p-2">{ParticipantUtils.name(p)}</td>
                    <td className="p-2">
                      {ParticipantUtils.challengeRating(p)}
                    </td>
                    {encounter.turn_groups.length === 0 ? null : (
                      <td className="p-2">
                        <TurnGroupSelect participant={p} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <Card className="flex flex-col gap-2 p-4">
          <CreateTurnGroupForm />
          <div className="flex flex-col gap-4">
            <div>
              Target player strength:{" "}
              {targetSinglePlayerStrength({ encounter, campaign })}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {encounter.turn_groups.map((tg) => (
                <TurnGroupDisplay tg={tg} key={tg.id} />
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function TurnGroupDisplay({ tg }: { tg: TurnGroup }) {
  const [encounter] = useEncounter();
  const [campaign] = useCampaign();
  // maybe this is wasteful to compute every render, but I think it's fine
  const turnGroupedParticipants =
    EncounterUtils.participantsByTurnGroup(encounter);
  const participantsInGroup = turnGroupedParticipants[tg.id] || [];
  const { mutate: deleteTurnGroup } = api.deleteTurnGroup.useMutation();
  const totalCr = R.sumBy(participantsInGroup, (p) =>
    ParticipantUtils.challengeRating(p)
  );
  return (
    <div key={tg.id} className="flex flex-col gap-2">
      <div className="flex gap-3">
        <span>{tg.name}</span>
        <span className="flex gap-1">
          <span>{crLabel(campaign)}</span>
          <span>{totalCr}</span>
        </span>
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
      </div>
      <div className="pl-3 flex flex-col gap-1">
        {participantsInGroup.map((p) => (
          <div className="flex gap-2" key={p.id}>
            <RemoveCreatureFromEncounterButton participant={p} />
            <CreatureIcon creature={p.creature} size="small" />
            <span className="ml-2">{ParticipantUtils.name(p)}</span>
            <TurnGroupSelect participant={p} />
          </div>
        )) || <span>No participants assigned</span>}
      </div>
    </div>
  );
}

function TurnGroupSelect({
  participant: p,
}: {
  participant: ParticipantWithData;
}) {
  const [encounter] = useEncounter();
  const { mutate: updateParticipant } = useUpdateEncounterParticipant();
  const turnGroupsById = R.indexBy(encounter.turn_groups, (tg) => tg.id);

  return (
    <div className="w-28">
      <Select
        value={p.turn_group_id ?? undefined}
        onValueChange={(val) =>
          updateParticipant({
            ...p,
            turn_group_id: val === "no-group" ? null : val,
          })
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Assign group">
            {p.turn_group_id ? turnGroupsById[p.turn_group_id]?.name : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {encounter.turn_groups.map((tg) => (
            <SelectItem key={tg.id} value={tg.id}>
              {tg.name}
            </SelectItem>
          ))}
          <SelectItem value={"no-group"}>No group</SelectItem>
        </SelectContent>
      </Select>
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
