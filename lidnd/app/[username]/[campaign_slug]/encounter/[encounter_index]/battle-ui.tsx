"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as R from "remeda";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
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
import {
  useCampaign,
  useHotkey,
  useActiveGameSession,
  useServerAction,
} from "@/app/[username]/[campaign_slug]/campaign-hooks";
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
  Columns,
  Grip,
  ImageIcon,
  Minus,
  MoreHorizontal,
  PlayIcon,
  Plus,
  Shield,
  SkullIcon,
  Swords,
  Trash,
  TrashIcon,
  Trophy,
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
import {
  EncounterUtils,
  targetSinglePlayerStrength,
  type Difficulty,
} from "@/utils/encounters";
import { useEncounterLinks } from "@/encounters/link-hooks";
import { EncounterDetails } from "@/encounters/[encounter_index]/EncounterRoundIndicator";
import { Input } from "@/components/ui/input";
import { EditModeOpponentForm } from "@/app/[username]/[campaign_slug]/EditModeOpponentForm";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import { crLabel } from "@/utils/campaigns";
import type { EncounterAsset, TurnGroup } from "@/server/db/schema";
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
import { DeleteEncounterButton } from "@/encounters/[encounter_index]/DeleteEncounterButton";
import { QuickAddParticipantsButton } from "@/encounters/[encounter_index]/QuickAddParticipant";
import { Kbd } from "@/components/ui/kbd";
import { useRouter, useSearchParams } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import {
  addImageAssetToEncounter,
  removeImageAssetFromEncounter,
  updateSession,
} from "@/app/[username]/actions";
import { ImageUtils } from "@/utils/images";
import { ImageUpload } from "@/encounters/image-upload";
import {
  uploadFileToAWS,
  readImageHeightWidth,
} from "@/app/[username]/[campaign_slug]/CreatureUploadForm";
import { appRoutes } from "@/app/routes";
import { useUser } from "@/app/[username]/user-provider";
import { MaliceTracker } from "@/encounters/[encounter_index]/MaliceTracker";

export const EncounterBattleUI = observer(function BattleUI() {
  const [campaign] = useCampaign();
  const [encounter] = useEncounter();
  const { mutate: startEncounter } = useStartEncounter();
  const { mutate: updateEncounter } = useUpdateEncounter();
  const uiStore = useEncounterUIStore();
  const { rollEncounter } = useEncounterLinks(encounter);
  const { mutate: updateColumnBatch } = api.updateColumnBatch.useMutation();

  useHotkey("k", (e) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      uiStore.toggleParticipantEdit();
    }
  });

  useHotkey("e", (e) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      const cols = encounter.columns;
      const newCols = StatColumnUtils.equalize(cols);
      updateColumnBatch({ encounter_id: encounter.id, columns: newCols });
    }
  });

  const monsters = EncounterUtils.participantsWithNoColumn(encounter);

  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";

  switch (encounter.status) {
    case "prep":
      return (
        <div className="flex flex-col max-h-full h-full">
          <div
            className={clsx(
              "flex justify-center w-full xl:max-h-full",
              battleStyles.root
            )}
          >
            <div className="flex flex-col w-full px-4 gap-5 mx-auto max-w-[900px] xl:max-w-[2000px]">
              <div className="w-full flex gap-5 py-2">
                <EncounterNameInput />
                <div className="flex gap-8 ml-auto items-center pr-2">
                  <PreviewSwitch />
                  {campaign.system === "dnd5e" ? (
                    <Link href={rollEncounter}>
                      <Button variant="secondary">Start encounter</Button>
                    </Link>
                  ) : (
                    <Button
                      onClick={() => {
                        startEncounter(encounter.id);
                      }}
                      variant="secondary"
                    >
                      <PlayIcon />
                      Start encounter
                    </Button>
                  )}
                </div>
              </div>
              {isPreview ? (
                <div className="w-full" data-value="preview">
                  <div className="w-full flex gap-3 h-full">
                    <EncounterBattlePreview />
                  </div>
                </div>
              ) : (
                <div
                  className="w-full xl:max-h-full flex flex-col gap-5"
                  data-value="prep"
                >
                  <div className="flex flex-col gap-5 w-full xl:grid grid-cols-2 xl:gap-6 xl:max-h-full">
                    <div className="flex flex-col">
                      <div className="flex gap-5 items-baseline">
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
                          <SelectTrigger className="w-fit">
                            <SelectValue placeholder="Select difficulty" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">
                              Easy difficulty
                            </SelectItem>
                            <SelectItem value="standard">
                              Standard difficulty
                            </SelectItem>
                            <SelectItem value="hard">
                              Hard difficulty
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex-grow-0">
                          <EncounterTagger />
                        </div>
                      </div>
                      <div>
                        <DescriptionTextArea />
                      </div>
                      <Card className="p-2">
                        <ReminderInput />
                      </Card>
                    </div>
                    <div
                      className={clsx(
                        "flex flex-col gap-7 min-h-0",
                        battleStyles.adversarySection
                      )}
                    >
                      <Card className="p-5 flex flex-col gap-5">
                        <DifficultySection />
                      </Card>
                      <PartySection />

                      {campaign.system === "drawsteel" ? (
                        <TurnGroupSetup />
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="w-full flex items-center justify-center p-24">
            <DeleteEncounterButton encounter={encounter} />
          </div>
        </div>
      );
    case "run":
      // Check if encounter has ended
      if (encounter.ended_at) {
        return <EndedEncounterDisplay />;
      }
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

function PartySection() {
  const [encounter] = useEncounter();
  const [campaign] = useCampaign();
  const user = useUser();
  return (
    <Link href={appRoutes.party({ campaign, user })}>
      <Card className="p-5">
        <div className="flex justify-between">
          <span className="flex gap-3">
            <UsersIcon />
            Party
          </span>
          <div className="flex flex-col text-right">
            <span className="text-gray-400">Single player EV</span>
            {targetSinglePlayerStrength({
              encounter,
              campaign,
            })}
          </div>
        </div>

        <div className="flex w-full justify-evenly">
          {EncounterUtils.players(encounter)?.map((p) => (
            <CreatureIcon key={p.id} creature={p.creature} size="small" />
          ))}
        </div>
      </Card>
    </Link>
  );
}

function EndedEncounterDisplay() {
  const [encounter] = useEncounter();
  const [campaign] = useCampaign();
  const { mutate: updateEncounter } = useUpdateEncounter();
  const [activeSession] = useActiveGameSession();
  const [isPending, updateSessionAction] = useServerAction(updateSession);

  let totalRuntime = "Unknown";
  if (encounter.started_at && encounter.ended_at) {
    const startTime = new Date(encounter.started_at).getTime();
    const endTime = new Date(encounter.ended_at).getTime();
    const diffMs = endTime - startTime;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours > 0) {
      const remainingMinutes = diffMinutes % 60;
      totalRuntime = `${diffHours}h ${remainingMinutes}m`;
    } else if (diffMinutes > 0) {
      totalRuntime = `${diffMinutes} minutes`;
    } else {
      totalRuntime = `${diffSeconds} seconds`;
    }
  }

  const handleVictoryChange = (delta: number) => {
    if (!activeSession) return;
    const newCount = Math.max(0, (activeSession.victory_count ?? 0) + delta);
    updateSessionAction({
      sessionId: activeSession.id,
      updated: {
        ...activeSession,
        victory_count: newCount,
      },
    }).catch((e) => {
      console.error("Failed to update session", e);
    });
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8 p-8 max-w-[900px] mx-auto">
      <Card className="p-8 w-full">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold">{encounter.name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-lg">Encounter Completed</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Total Runtime</span>
            <span className="text-2xl font-semibold">{totalRuntime}</span>
          </div>

          {campaign.system === "drawsteel" && activeSession && (
            <div className="flex flex-col gap-3 bg-blue-50 p-4 rounded-md border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-blue-900">
                  Remember to award victories!
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-blue-800">
                    Session Victories:
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleVictoryChange(-1)}
                    disabled={
                      isPending || (activeSession.victory_count ?? 0) === 0
                    }
                    className="h-7 w-7"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-xl font-bold text-blue-900 min-w-[2rem] text-center">
                    {activeSession.victory_count ?? 0}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleVictoryChange(1)}
                    disabled={isPending}
                    className="h-7 w-7"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="text-sm text-blue-800">
                <ul className="space-y-1">
                  <li>
                    • Easy/Standard encounters:{" "}
                    <span className="font-semibold">1 victory</span>
                  </li>
                  <li>
                    • Hard/Deadly encounters:{" "}
                    <span className="font-semibold">2 victories</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => {
                updateEncounter({
                  id: encounter.id,
                  campaign_id: encounter.campaign_id,
                  status: "prep",
                  started_at: null,
                  ended_at: null,
                });
              }}
              variant="secondary"
              size="lg"
            >
              Reset to Prep
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function DifficultySection() {
  const [encounter] = useEncounter();
  const [campaign] = useCampaign();
  const [activeSession] = useActiveGameSession();
  const difficulty = EncounterUtils.difficulty({
    encounter,
    campaign,
  });
  if (difficulty === "no-players") {
    return <div>No players in encounter</div>;
  }
  const difficultyCssClass = EncounterUtils.cssClassForDifficulty(difficulty);

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`flex w-full flex-wrap gap-6 sm:flex-nowrap rounded-md items-center`}
      >
        <div className="flex flex-col">
          <span
            className={clsx(
              "text-lg p-2 rounded-md w-24 text-center",
              difficultyCssClass
            )}
          >
            {difficulty}
          </span>
        </div>

        <div className="flex flex-col items-baseline">
          <span className="text-sm whitespace-nowrap text-gray-400">
            Total {CampaignUtils.crLabel(campaign)}
          </span>
          <span className="">{EncounterUtils.totalCr(encounter)}</span>
        </div>
        {campaign.system === "drawsteel" && (
          <div className="flex flex-col items-center gap-1">
            <LidndLabel label="Session Victories">
              <div className="flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-yellow-600" />
                <span>{activeSession?.victory_count ?? 0} </span>
                <span className="text-gray-400 text-sm">
                  {`(+${Math.floor(
                    (activeSession?.victory_count ?? 0) / 2
                  )} player budgeted)`}
                </span>
              </div>
            </LidndLabel>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <div className="w-full pb-3 pt-3 sm:pb-0">
          <EncounterBudgetSlider />
        </div>
      </div>
    </div>
  );
}

function PreviewSwitch() {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";
  const router = useRouter();
  return (
    <LidndLabel label="Prep" className="flex items-center gap-3">
      <Switch
        id="group-by-tag"
        checked={isPreview}
        onCheckedChange={() => {
          const params = new URLSearchParams(searchParams.toString());
          if (isPreview) {
            params.delete("preview");
          } else {
            params.set("preview", "true");
          }
          router.push(`?${params.toString()}`);
        }}
      />
      <span className="text-sm text-gray-400">Layout</span>
    </LidndLabel>
  );
}

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
      autoFocus={encounter.name.length === 0}
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

export interface RemoveCreatureFromEncounterButtonProps {
  participant: ParticipantWithData;
  moreText?: string;
}

export function RemoveCreatureFromEncounterButton(
  props: RemoveCreatureFromEncounterButtonProps
) {
  const { participant } = props;

  const id = useEncounterId();
  const [encounter] = api.encounterById.useSuspenseQuery(id);
  const { mutate: removeCreatureFromEncounter } =
    useRemoveParticipantFromEncounter();
  return (
    <ButtonWithTooltip
      text="Remove creature"
      variant="ghost"
      className="p-2 text-gray-400"
      onClick={() =>
        removeCreatureFromEncounter({
          encounter_id: encounter.id,
          participant_id: participant.id,
        })
      }
    >
      {props.moreText}
      <TrashIcon className="text-gray-200" />
    </ButtonWithTooltip>
  );
}
function EncounterBudgetSlider() {
  const [campaign] = useCampaign();
  const [encounter] = useEncounter();

  const tiers = EncounterUtils.findCRBudget({
    encounter,
    campaign,
  });

  if (tiers === "no-players") {
    return <div>No players in encounter</div>;
  }

  const max = tiers.hardTier;

  return (
    <div className="w-full h-6 relative border rounded-md ">
      <motion.div
        initial={false}
        animate={{
          x: `${(EncounterUtils.totalCr(encounter) / max) * 100}%`,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
        style={{ position: "relative", zIndex: 10 }}
      >
        <SkullIcon className="bg-white border-2 border-gray-800 rounded-full p-0.5 shadow-lg -translate-x-1/2" />
      </motion.div>
      <SliderTier difficulty="Trivial" />
      <SliderTier difficulty="Easy" />
      <SliderTier difficulty="Standard" />
      <SliderTier difficulty="Hard" />
    </div>
  );
}

function SliderTier({ difficulty }: { difficulty: Difficulty }) {
  const [encounter] = useEncounter();
  const [campaign] = useCampaign();

  const currentDifficulty = EncounterUtils.difficulty({
    encounter,
    campaign,
  });

  console.log({ difficulty, currentDifficulty });

  const res = EncounterUtils.evRangeForDifficulty({
    encounter,
    campaign,
    difficulty,
  });
  const color = EncounterUtils.colorForDifficulty(difficulty);
  if (res === "no-players") {
    return null;
  }
  const { hardTier, bounds } = res;
  const [lowBound, highBound] = bounds;
  const leftPercent = lowBound / hardTier;
  const width = (highBound - lowBound) / hardTier;
  const tailwindClass =
    color === "gray"
      ? "bg-gray-400"
      : color === "blue"
      ? "bg-blue-400"
      : color === "green"
      ? "bg-green-400"
      : color === "yellow"
      ? "bg-yellow-400"
      : "bg-red-400";

  return (
    <div
      className={clsx(`absolute top-0 h-6`, {
        [tailwindClass]: true,
        "bg-opacity-25": difficulty !== currentDifficulty,
      })}
      style={{
        left: `${leftPercent * 100}%`,
        width: `${width * 100}%`,
      }}
    >
      {lowBound !== 0 && (
        <span className="absolute bottom-full -translate-x-1/2 text-gray-500 opacity-100">
          {lowBound}
        </span>
      )}
    </div>
  );
}

function EncounterBattlePreview() {
  const { data: columns } = api.getColumns.useQuery(useEncounterId());
  const { parentWidth, containerRef } = useParentResizeObserver();
  const [encounter] = useEncounter();
  return (
    <div className="flex flex-col">
      <div className="flex gap-2 items-center">
        <EqualizeColumnsButton />
        <div className="p-1 flex gap-2 items-center h-20">
          <ImageAssetAddButton />
          <div className="flex flex-wrap gap-2 mt-2">
            {encounter.assets?.map((asset) => (
              <AssetThumbnail key={asset.id} asset={asset} />
            ))}
          </div>
        </div>
      </div>
      <div
        className="flex min-h-[450px] overflow-hidden w-full h-full border shadow-md"
        ref={containerRef}
      >
        <ParentWidthContext.Provider value={parentWidth}>
          {columns?.map((c, i) => (
            <StatColumnComponent column={c} index={i} key={c.id}>
              <PreviewCardsForColumn column={c} />
              {c.assets.map((asset) => (
                <div key={asset.id} className="flex flex-col relative">
                  <AssetDragButton asset={asset} />
                  <Image
                    src={ImageUtils.url(asset.image)}
                    alt={asset.image.name}
                    key={asset.id}
                    width={asset.image.width}
                    height={asset.image.height}
                  />
                </div>
              ))}
            </StatColumnComponent>
          ))}
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

export const AssetDragButton = observer(function AssetDragButton({
  asset,
}: {
  asset: EncounterAsset;
}) {
  const uiStore = useEncounterUIStore();

  return (
    <Button
      variant="ghost"
      className="absolute top-1 left-1 z-10 cursor-grab p-1 h-auto"
      onDragStart={(e) => {
        typedDrag.set(e.dataTransfer, dragTypes.asset, asset);
        uiStore.startDraggingBattleCard();
      }}
      draggable
    >
      <Grip className="w-4 h-4" />
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
    <div className="flex flex-col max-h-full overflow-hidden">
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
  const uiStore = useEncounterUIStore();
  const tgForParticipant = EncounterUtils.turnGroupForParticipant({
    encounter,
    participant: p,
  });
  const crLabel = CampaignUtils.crLabel;

  return (
    <Card
      key={p.id}
      className={clsx(
        "flex gap-2 items-center max-w-[400px] cursor-grab active:cursor-grabbing max-h-fit p-1 ",
        {
          "border-none shadow-none": tgForParticipant,
        }
      )}
      draggable={encounter.turn_groups.length > 0}
      onDragStart={(e) => {
        if (encounter.turn_groups.length > 0) {
          typedDrag.set(e.dataTransfer, dragTypes.participant, p);
          uiStore.setActiveDragType("participant");
        }
      }}
      onDragEnd={() => {
        uiStore.setActiveDragType(null);
      }}
    >
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
      <div className="ml-auto">
        <ParticipantEditDialog participant={p} />
      </div>
    </Card>
  );
}

const TurnGroupSetup = observer(function TurnGroupSetup() {
  const [encounter] = useEncounter();
  const [campaign] = useCampaign();
  const uiStore = useEncounterUIStore();
  const [creatureAddDialogIsOpen, setCreatureAddDialogIsOpen] = useState(false);
  const [acceptDrop, setAcceptDrop] = useState(0);
  const { mutate: updateParticipant } = useUpdateEncounterParticipant();
  const monstersWihoutGroup = EncounterUtils.monsters(encounter).filter(
    (m) => !m.turn_group_id
  );
  const keyForExistingCreature = getQueryKey(
    api.addExistingCreatureAsParticipant
  );
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

  useHotkey("a", () => {
    setCreatureAddDialogIsOpen(true);
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-8 items-center">
        <LidndLabel label={`Remaining ${CampaignUtils.crLabel(campaign)}`}>
          <span className="text-2xl font-bold">
            {EncounterUtils.remainingCr(encounter, campaign)}
          </span>
        </LidndLabel>
        <LidndDialog
          isOpen={creatureAddDialogIsOpen}
          onClose={() => setCreatureAddDialogIsOpen(false)}
          title="Add adversary"
          content={
            <div className="p-6 flex flex-col gap-5 w-full h-[800px] overflow-hidden">
              <EditModeOpponentForm
                onSubmitSuccess={() => setCreatureAddDialogIsOpen(false)}
              />
            </div>
          }
          trigger={
            <Button
              onClick={() => setCreatureAddDialogIsOpen(true)}
              className=""
            >
              <AngryIcon />
              Upload adversary
              <Kbd>A</Kbd>
            </Button>
          }
        />
        <QuickAddParticipantsButton
          encounterId={encounter.id}
          campaignId={campaign.id}
          trigger={
            <Button variant="secondary" className="gap-2">
              <AngryIcon />
              Existing
            </Button>
          }
        />
      </div>

      <div className={clsx("flex flex-col gap-3")}>
        <div className="flex flex-wrap gap-5 items-center">
          <CreateTurnGroupForm />
        </div>
        <div className={clsx("gap-4", battleStyles.adversaryGrid)}>
          {encounter.turn_groups.map((tg) => (
            <TurnGroupDisplay tg={tg} key={tg.id} />
          ))}
        </div>
        {monstersWihoutGroup.length > 0 || encounter.turn_groups.length > 0 ? (
          <div
            className={clsx(
              "gap-3 gap-x-12 rounded min-h-[150px] border-2",
              battleStyles.adversaryGrid,
              {
                "border-blue-400 bg-blue-50": acceptDrop > 0,
                "border-dashed": uiStore.activeDragType === "participant",
                "border-transparent": uiStore.activeDragType !== "participant",
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
              <div className="col-span-2 text-center text-gray-400 text-sm">
                Drag participants here to remove them from groups
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
});

function AssetThumbnail({
  asset,
}: {
  asset: {
    id: string;
    image: { id: string; name: string; width: number; height: number };
  };
}) {
  const [encounter] = useEncounter();
  const [isPending, startTransition] = useTransition();
  const qc = useQueryClient();

  return (
    <div className="relative group border rounded overflow-hidden">
      <Image
        src={ImageUtils.url(asset.image)}
        alt={asset.image.name}
        width={80}
        height={80}
        className="object-cover"
      />
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-0 right-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white"
        onClick={() => {
          startTransition(async () => {
            await removeImageAssetFromEncounter({
              encounterId: encounter.id,
              assetId: asset.id,
            });
            qc.invalidateQueries();
          });
        }}
        disabled={isPending}
      >
        <Trash className="h-3 w-3" />
      </Button>
    </div>
  );
}

function ImageAssetAddButton() {
  const [encounter] = useEncounter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [uploadImage, setUploadImage] = useState<File | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  const { data: images } = api.imageAssets.useQuery({
    search: debouncedSearch,
  });
  const qc = useQueryClient();
  const { mutate: uploadAsset } = api.upload.useMutation();

  const debouncedSetSearch = useDebouncedCallback((value: string) => {
    setDebouncedSearch(value);
  }, 300);

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const { width, height } = await readImageHeightWidth(file);
      uploadAsset(
        {
          filename: file.name,
          filetype: file.type,
          width,
          height,
        },
        {
          onSuccess: async (data) => {
            try {
              await uploadFileToAWS(file, data.signedUrl);
              await addImageAssetToEncounter({
                encounterId: encounter.id,
                inputAsset: {
                  url: ImageUtils.url(data.image),
                  type: "plain",
                  baseModel: data.image,
                },
              });
              qc.invalidateQueries();
              setUploadImage(undefined);
            } catch (error) {
              console.error("Failed to upload image:", error);
            } finally {
              setIsUploading(false);
            }
          },
          onError: (error) => {
            console.error("Failed to create image asset:", error);
            setIsUploading(false);
          },
        }
      );
    } catch (error) {
      console.error("Failed to read image dimensions:", error);
      setIsUploading(false);
    }
  };

  return (
    <LidndDialog
      title="Add static image"
      trigger={
        <Button variant="secondary">
          <ImageIcon />
          Add static image
        </Button>
      }
      content={
        <div className="p-6 flex flex-col gap-5 w-full h-[800px] overflow-auto">
          <div className="border-b pb-4">
            <h3 className="text-sm font-medium mb-3">Upload New Image</h3>
            <ImageUpload
              image={uploadImage}
              clearImage={() => setUploadImage(undefined)}
              onUpload={handleImageUpload}
              dropText={isUploading ? "Uploading..." : "Drop image to upload"}
              dropIcon={<ImageIcon />}
              fileInputProps={{ disabled: isUploading }}
            />
          </div>
          <div>
            <h3 className="text-sm font-medium mb-3">
              Or Select Existing Image
            </h3>
            <LidndTextInput
              placeholder="Search images..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                debouncedSetSearch(e.target.value);
              }}
            />
          </div>
          <div className="grid grid-cols-3">
            {images?.map((i) => (
              <form
                key={i.baseModel.id}
                className="border p-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  startTransition(async () => {
                    await addImageAssetToEncounter({
                      encounterId: encounter.id,
                      inputAsset: i,
                    });
                    qc.invalidateQueries().catch((err) => {
                      console.error(err);
                    });
                  });
                }}
              >
                <span>{i.baseModel.name}</span>
                <Image
                  key={i.baseModel.id}
                  src={i.url}
                  alt="image"
                  width={100}
                  height={100}
                />
                <Button variant={"ghost"} type="submit">
                  {isPending ? "Adding..." : "Add to encounter"}
                </Button>
              </form>
            ))}
          </div>
        </div>
      }
    />
  );
}

const TurnGroupDisplay = observer(function TurnGroupDisplay({
  tg,
}: {
  tg: TurnGroup;
}) {
  const [encounter] = useEncounter();
  const [campaign] = useCampaign();
  const uiStore = useEncounterUIStore();
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
    <Card
      key={tg.id}
      className={clsx("flex flex-col gap-2  p-3 min-h-[200px]", {
        "border-dashed": uiStore.activeDragType === "participant",
        "border-blue-400 bg-blue-50": acceptDrop > 0,
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
      <div className="flex flex-col gap-1 w-full h-full">
        {participantsInGroup.length === 0 && (
          <span className="flex w-full h-full items-center justify-center text-gray-400 text-sm">
            Drag here to assign
          </span>
        )}
        {participantsInGroup.map((p) => (
          <PrepParticipant participant={p} key={p.id} />
        )) || <span>No participants assigned</span>}
      </div>
    </Card>
  );
});

function CreateTurnGroupForm() {
  const [encounter] = useEncounter();
  const { mutate: createTurnGroup } = api.createTurnGroup.useMutation();
  const [name, setName] = useState("");
  const [hexColor, setHexColor] = useState(labelColors.at(0) || "#FFFFFF");
  return (
    <Card className="p-2 shadow-none">
      <form
        className="flex gap-3"
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
          variant="ghost"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Turn group name"
        />
        <LidndPopover
          className="flex flex-wrap gap-3"
          trigger={
            <Button variant="ghost" className="flex items-center gap-2">
              <span>Color</span>
              <div className="h-4 w-4" style={{ backgroundColor: hexColor }} />
            </Button>
          }
        >
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
        </LidndPopover>
        <Button variant="secondary" type="submit">
          Create turn group
        </Button>
      </form>
    </Card>
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
      <GroupTurnToggles />
      <div
        className="flex relative w-full h-full max-h-full overflow-hidden pb-2 border-t-[1px]"
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

function GroupTurnToggles() {
  const [encounter] = useEncounter();
  const turnGroupsById = EncounterUtils.turnGroupsById(encounter);
  const participantsByTurnGroup =
    EncounterUtils.participantsByTurnGroup(encounter);
  const participantsWithoutTurnGroup =
    EncounterUtils.monstersWithoutTurnGroup(encounter);

  return (
    <div className="flex gap-4 p-2 items-center justify-around w-full sticky top-0 z-20 bg-white">
      <div className="flex gap-3 items-center bg-blue-50 rounded-lg p-2">
        <Shield className="h-4 w-4 text-blue-600" />
        <div className="flex gap-5 flex-wrap">
          {EncounterUtils.players(encounter).map((p) => (
            <TurnTakerQuickView participant={p} key={p.id} />
          ))}
        </div>
      </div>
      <div className="h-12 w-px bg-gray-300" />
      <div className="flex gap-3 items-center bg-red-50 rounded-lg p-2">
        <Swords className="h-4 w-4 text-red-600" />
        <div className="flex gap-5 flex-wrap">
          {participantsWithoutTurnGroup.map((p) => (
            <TurnTakerQuickView participant={p} key={p.id} />
          ))}
          {Object.entries(participantsByTurnGroup).map(
            ([tgId, participants]) => (
              <div key={tgId}>
                <TurnTakerQuickView
                  participant={participants[0]}
                  buttonExtra={
                    <TurnGroupLabel turnGroup={turnGroupsById[tgId]} />
                  }
                />
              </div>
            )
          )}
        </div>
      </div>
    </div>
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
        {/** eventually i'll have to do a column order thing. but not now! */}
        {c.assets.map((asset) => (
          <div key={asset.id} className="w-full h-full relative">
            {uiStore.isEditingInitiative && <AssetDragButton asset={asset} />}
            <Image
              src={ImageUtils.url(asset.image)}
              alt={asset.image.name}
              key={asset.id}
              width={asset.image.width}
              height={asset.image.height}
            />
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
      className={clsx("flex flex-col p-2 rounded-lg transition-all", {
        "opacity-60 border-transparent": hasPlayed,
        "shadow-md bg-white": !hasPlayed,
      })}
    >
      <span
        className={clsx("text-sm font-medium", {
          "text-gray-500": hasPlayed,
          "text-gray-900": !hasPlayed,
        })}
      >
        {turnGroupForParticipant
          ? turnGroupForParticipant.name
          : ParticipantUtils.name(participant)}
      </span>
      <div className="flex w-full gap-2">
        <Button
          variant="outline"
          onClick={() =>
            toggleParticipantHasPlayedThisRound({
              encounter_id: id,
              participant_id: participant.id,
            })
          }
          className={clsx("flex p-2 gap-1 rounded-md bg-transparent border-0", {
            "bg-white shadow-lg": !hasPlayed,
          })}
        >
          {hasPlayed ? (
            <CheckCircle className="h-4 w-4 text-black" />
          ) : (
            <PlayIcon className="h-4 w-4 text-black" />
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
          assets: [],
          id: Math.random().toString(),
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
  // long term, should probably have a more generic op here. if we want to add anything more to columns,
  // we should refactor first.
  const { mutate: assignAssetToColumn } = api.assignAssetToColumn.useMutation({
    onMutate: async (input) => {
      await getColumns.cancel(encounterId);
      const previousColumns = getColumns.getData(encounterId);
      getColumns.setData(encounterId, (old) => {
        if (!old) return old;
        return old.map((col) => {
          if (col.id === input.column_id) {
            return {
              ...col,
              assets: [
                ...col.assets.filter((a) => a.id !== input.asset_id),
                col.assets.find((a) => a.id === input.asset_id) ||
                  old
                    .flatMap((c) => c.assets)
                    .find((a) => a.id === input.asset_id)!,
              ],
            };
          }
          return {
            ...col,
            assets: col.assets.filter((a) => a.id !== input.asset_id),
          };
        });
      });
      return { previousColumns };
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
          const droppedAsset = typedDrag.get(e.dataTransfer, dragTypes.asset);

          if (droppedParticipant) {
            assignParticipantToColumn({
              participant_id: droppedParticipant.id,
              column_id: column.id,
              encounter_id: encounterId,
            });
          } else if (droppedAsset) {
            assignAssetToColumn({
              asset_id: droppedAsset.id,
              column_id: column.id,
              encounter_id: encounterId,
            });
          } else {
            console.error("No participant or asset found when dragging");
            return;
          }
          setAcceptDrop(0);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const hasParticipant = typedDrag.includes(
            e.dataTransfer,
            dragTypes.participant
          );
          const hasAsset = typedDrag.includes(e.dataTransfer, dragTypes.asset);

          if ((!hasParticipant && !hasAsset) || column.is_home_column) {
            return;
          }
          setAcceptDrop((count) => count + 1);
        }}
        onDragOver={(e) => {
          const hasParticipant = typedDrag.includes(
            e.dataTransfer,
            dragTypes.participant
          );
          const hasAsset = typedDrag.includes(e.dataTransfer, dragTypes.asset);

          if (!hasParticipant && !hasAsset) {
            return;
          }
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragLeave={() => setAcceptDrop((count) => count - 1)}
      >
        {column.is_home_column ? (
          <>
            <div className="p-3">
              {encounter.status === "run" ? <EncounterDetails /> : null}
              {encounter.status === "run" ? <MaliceTracker /> : null}
            </div>

            <div className="w-full h-full flex px-3">
              <DescriptionTextArea />
            </div>
          </>
        ) : null}
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
