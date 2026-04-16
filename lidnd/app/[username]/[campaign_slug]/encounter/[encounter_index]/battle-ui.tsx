"use client";

import { Card } from "@/components/ui/card";
import { Button, type ButtonProps } from "@/components/ui/button";
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
  Encounter,
  Participant,
  ParticipantWithData,
} from "@/server/api/router";
import { LidndPopover } from "@/encounters/base-popover";
import { EffectIcon } from "./status-input";
import {
  useCampaign,
  useActiveGameSession,
  useHotkey,
} from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { CreateNewSessionModal } from "@/app/[username]/[campaign_slug]/CreateNewSessionModal";
import { SessionDisplay } from "@/app/[username]/[campaign_slug]/SessionDisplay";
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
  ActiveReminders,
  ReminderInput,
  Reminders,
} from "@/encounters/[encounter_index]/reminders";
import {
  AngryIcon,
  Circle,
  CheckCircle,
  Columns,
  FileEdit,
  Grip,
  GripVertical,
  Group,
  ImageIcon,
  Maximize2,
  MoreHorizontal,
  PlayIcon,
  PlusIcon,
  Shield,
  SkullIcon,
  StickyNoteIcon,
  Swords,
  Trash,
  TrashIcon,
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
import {
  type FocusedTurnTarget,
  useEncounterUIStore,
} from "@/encounters/[encounter_index]/EncounterUiStore";
import { CreatureStatBlock } from "@/encounters/[encounter_index]/CreatureStatBlock";
import { CreatureUtils } from "@/utils/creatures";
import Image from "next/image";
import { EncounterUtils, type Difficulty } from "@/utils/encounters";
import { useEncounterLinks } from "@/encounters/link-hooks";
import {
  EncounterDetails,
  EncounterRunTools,
} from "@/encounters/[encounter_index]/EncounterRoundIndicator";
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
import { ParticipantEditDialog } from "@/encounters/[encounter_index]/ParticipantEditDialog";
import { EncounterTagger } from "@/encounters/EncounterTagger";
import { DeleteEncounterButton } from "@/encounters/[encounter_index]/DeleteEncounterButton";
import { addImageAssetToEncounter } from "@/app/[username]/actions";
import { ImageUtils } from "@/utils/images";
import { ImageUpload } from "@/encounters/image-upload";
import {
  uploadFileToAWS,
  readImageHeightWidth,
} from "@/app/[username]/[campaign_slug]/CreatureUploadForm";
import { MaliceTracker } from "@/encounters/[encounter_index]/MaliceTracker";
import { AddPlayerToEncounter } from "@/encounters/[encounter_index]/AddPlayerToEncounter";
import { appRoutes } from "@/app/routes";
import { useUser } from "@/app/[username]/user-provider";

const ENCOUNTER_PREP_FORM_COOKIE_NAME = "encounter_prep_form";
const ENCOUNTER_PREP_FORM_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

const encounterPrepForms = [
  "notes",
  "participants",
  "partyMembers",
  "images",
  "reminders",
  "turnGroups",
] as const;

type EncounterPrepForm = (typeof encounterPrepForms)[number];

const isEncounterPrepForm = (
  value: string | null | undefined,
): value is EncounterPrepForm =>
  value != null && (encounterPrepForms as readonly string[]).includes(value);

const readEncounterPrepFormCookie = (): EncounterPrepForm | null => {
  if (typeof document === "undefined") {
    return null;
  }

  const cookieValue = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${ENCOUNTER_PREP_FORM_COOKIE_NAME}=`))
    ?.split("=")[1];

  if (!cookieValue) {
    return null;
  }

  const decodedValue = decodeURIComponent(cookieValue);
  return isEncounterPrepForm(decodedValue) ? decodedValue : null;
};

const persistEncounterPrepFormCookie = (value: EncounterPrepForm) => {
  document.cookie = `${ENCOUNTER_PREP_FORM_COOKIE_NAME}=${encodeURIComponent(
    value,
  )}; path=/; max-age=${ENCOUNTER_PREP_FORM_COOKIE_MAX_AGE}`;
};

export const EncounterBattleUI = observer(function BattleUI() {
  const [campaign] = useCampaign();
  const [activeSession] = useActiveGameSession();
  const [encounter] = useEncounter();
  const { mutate: startEncounter } = useStartEncounter();
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

  const monsters = EncounterUtils.monsters(encounter);
  const monstersWithoutColumn =
    EncounterUtils.participantsWithNoColumn(encounter);

  const [activePrepForm, setActivePrepForm] = useState<EncounterPrepForm>(
    monsters.length === 0 ? "participants" : "notes",
  );

  useEffect(() => {
    const storedForm = readEncounterPrepFormCookie();
    if (storedForm && monsters.length > 0) {
      setActivePrepForm(storedForm);
    }
  }, []);

  useEffect(() => {
    if (activePrepForm === "turnGroups" && monsters.length === 0) {
      setActivePrepForm("notes");
    }
  }, [activePrepForm, monsters.length]);

  useEffect(() => {
    persistEncounterPrepFormCookie(activePrepForm);
  }, [activePrepForm]);

  switch (encounter.status) {
    case "prep":
      return (
        <div className="flex flex-col max-h-full h-full">
          <div
            className={clsx(
              "flex w-full xl:max-h-full flex-wrap lg:flex-nowrap pt-5 px-10 gap-5",
              battleStyles.root,
            )}
          >
            <div className="flex gap-5 flex-col w-full">
              <div className="w-full flex gap-5 items-center">
                <EncounterNameInput />
                <div className="flex-grow-0">
                  <EncounterTagger />
                </div>
                <DifficultyBadgePopover />
                <div className="flex gap-5 ml-auto items-center">
                  {!activeSession ? (
                    <CreateNewSessionModal
                      trigger={
                        <Button variant="secondary">
                          <PlayIcon />
                          Start
                        </Button>
                      }
                      afterBegin={() => startEncounter(encounter.id)}
                    />
                  ) : campaign.system === "dnd5e" ? (
                    <Link href={rollEncounter}>
                      <Button variant="secondary">Start</Button>
                    </Link>
                  ) : (
                    <Button
                      onClick={() => {
                        startEncounter(encounter.id);
                      }}
                      variant="secondary"
                    >
                      <PlayIcon />
                      Start
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex gap-3 flex-wrap items-center">
                <EncounterPrepFormChooser
                  activeForm={activePrepForm}
                  onFormChange={setActivePrepForm}
                  showTurnGroups={monsters.length > 0}
                />
              </div>
              {encounter.reminders?.length > 0 ? (
                <div className="flex flex-col gap-3 w-full">
                  <ActiveReminders />
                </div>
              ) : null}

              <div className="flex flex-wrap lg:flex-nowrap gap-5 items-start">
                <EncounterPrepFormPanel activeForm={activePrepForm} />
                <div
                  className="w-full min-w-0 xl:max-h-full flex flex-col gap-3"
                  data-value="prep"
                >
                  {EncounterUtils.monsters(encounter).length > 0 ? (
                    <div className={clsx(battleStyles.adversarySection)}>
                      {campaign.system === "drawsteel" ? (
                        <MonsterSection />
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex gap-3 h-full">
                    <EncounterBattlePreview />
                  </div>
                </div>
              </div>
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
            {monstersWithoutColumn.length > 0 ? (
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

function EndedEncounterDisplay() {
  const [encounter] = useEncounter();
  const user = useUser();
  const [campaign] = useCampaign();
  const { mutate: updateEncounter } = useUpdateEncounter();

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

          <div className="flex justify-center">
            <SessionDisplay />
          </div>

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
            <Link href={appRoutes.campaign({ user, campaign })}>
              <Button>Back to campaign</Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

function DifficultyBadgePopover() {
  const [encounter] = useEncounter();
  const [campaign] = useCampaign();
  const difficulty = EncounterUtils.difficulty({
    encounter,
    campaign,
  });

  if (difficulty === "no-players") {
    return null;
  }

  const difficultyCssClass = EncounterUtils.cssClassForDifficulty(difficulty);

  return (
    <LidndPopover
      trigger={
        <button
          className={clsx(
            "rounded-md px-2 py-1 text-center cursor-pointer hover:opacity-80 transition-opacity flex flex-col items-center min-w-[90px]",
            difficultyCssClass,
          )}
        >
          <span className="text-sm font-medium">{difficulty}</span>
        </button>
      }
      className="w-[650px]"
    >
      <EncounterDifficultyDashboard className="p-4" />
    </LidndPopover>
  );
}

function EncounterDifficultyDashboard({ className }: { className?: string }) {
  const [encounter] = useEncounter();
  const [campaign] = useCampaign();
  const difficulty = EncounterUtils.difficulty({
    encounter,
    campaign,
  });

  if (difficulty === "no-players") {
    return (
      <div className={clsx("text-sm text-gray-500", className)}>
        Add players to see the encounter difficulty budget.
      </div>
    );
  }

  const difficultyCssClass = EncounterUtils.cssClassForDifficulty(difficulty);
  const remainingCr = EncounterUtils.remainingCr(encounter, campaign);
  const isAtTargetDifficulty = EncounterUtils.isAtTargetDifficulty(
    encounter,
    campaign,
  );

  return (
    <div className={clsx("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-500">Current Difficulty: </span>
            <span
              className={clsx(
                "font-semibold",
                difficultyCssClass.split(" ")[0],
              )}
            >
              {difficulty}
            </span>
            <span className="text-sm text-gray-500">
              {" "}
              ({EncounterUtils.totalCr(encounter)} EV)
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Target:</span>
          <TargetDifficultySelect />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <EncounterBudgetSlider />
      </div>

      <div className="flex justify-center">
        {isAtTargetDifficulty ? (
          <div className="text-gray-500 text-sm">
            <span className="flex gap-2 items-baseline w-full">
              {remainingCr === 0 ? (
                <>
                  <span>At maximum EV for</span>
                  <span className="font-medium">
                    {encounter.target_difficulty}
                  </span>
                  <span>difficulty.</span>
                </>
              ) : (
                <>
                  <span>Within budget for</span>
                  <span className="font-medium">
                    {encounter.target_difficulty}
                  </span>
                  <span>difficulty. Can spend up to</span>
                  <span className="text-xl font-bold text-black">
                    {remainingCr}
                  </span>
                  <span>more EV.</span>
                </>
              )}
            </span>
          </div>
        ) : (
          <div className="flex gap-2 items-baseline text-gray-500 text-sm">
            <span>{remainingCr < 0 ? "Remove" : "Add up to"}</span>
            <span className="text-xl font-bold text-black w-8 text-center">
              {Math.abs(remainingCr)}
            </span>
            <span>EV worth of monsters for</span>
            <span className="font-medium">{encounter.target_difficulty}</span>
            <span>difficulty</span>
          </div>
        )}
      </div>
    </div>
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
  props: RemoveCreatureFromEncounterButtonProps,
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
  return (
    <div className="flex flex-col w-full">
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

  return (
    <Button
      variant="ghost"
      className="z-10 cursor-grab px-2"
      onDragStart={(e) => {
        typedDrag.set(e.dataTransfer, dragTypes.participant, participant);
        uiStore.startDraggingBattleCard();
      }}
      draggable
    >
      <GripVertical />
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
    column,
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
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  className="z-10 cursor-grab"
                  onDragStart={(e) => {
                    typedDrag.set(e.dataTransfer, dragTypes.participant, p[0]!);
                    uiStore.startDraggingBattleCard();
                  }}
                  draggable
                >
                  <Grip />
                </Button>
                <StatBlockFullscreenButton creature={p[0].creature} />
              </div>
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

function StatBlockFullscreenButton({ creature }: { creature: Creature }) {
  return (
    <LidndDialog
      title={`${creature.name} stat block`}
      trigger={
        <ButtonWithTooltip
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          text="Fullscreen"
        >
          <Maximize2 />
        </ButtonWithTooltip>
      }
      content={
        <div className="flex justify-center">
          <Image
            priority
            quality={100}
            src={CreatureUtils.awsURL(creature, "statBlock")}
            alt={creature.name}
            width={creature.stat_block_width}
            height={creature.stat_block_height}
            className="h-auto max-h-[85vh] w-auto max-w-full object-contain"
          />
        </div>
      }
    />
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
          <div className="flex gap-2 items-center justify-between py-2">
            <div className="flex flex-col gap-1 w-full">
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
                  <div className="flex w-full items-center flex-wrap">
                    <BattleCardCreatureName participant={participant} />
                    {indexInGroup === 0 ? (
                      <div className="text-gray-300">
                        <ColumnDragButton participant={participant} />
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

          {encounterUiStore.isEditingInitiative && (
            <div className="flex w-full flex-wrap">
              <GroupParticipantHPOverride participant={participant} />
              <div className="text-gray-500">
                <BattleCardTools participant={participant} />
              </div>
            </div>
          )}
        </div>
      </BattleCardLayout>
    </div>
  );
});

export function ParticipantNotes({
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
      participant.max_hp_override?.toString() ?? "",
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
  },
);

export function EqualizeColumnsButton(props?: {
  size?: ButtonProps["size"];
  className?: string;
}) {
  const { mutate: updateColumnBatch } = api.updateColumnBatch.useMutation();
  const [encounter] = useEncounter();

  const sumColumnPercents = Math.round(
    R.sumBy(encounter.columns, (c) => c.percent_width),
  );
  const aNegativeWidthColumn = encounter.columns.find(
    (c) => c.percent_width < 0,
  );
  return (
    <ButtonWithTooltip
      text="Equalize columns"
      variant="ghost"
      size={props?.size}
      className={clsx("flex text-gray-400 p-2", props?.className)}
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
      {aNegativeWidthColumn && aNegativeWidthColumn.participants[0]
        ? `column ${ParticipantUtils.name(
            aNegativeWidthColumn.participants[0],
          )} has negative width, click me`
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
        {
          "opacity-60 grayscale": ParticipantUtils.isDead(participant),
        },
        className,
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
  turnGroup?: Pick<TurnGroup, "hex_color">;
  className?: string;
}) {
  if (!turnGroup) {
    return null;
  }
  const { hex_color } = turnGroup;

  return (
    <span
      className={clsx(
        "inline-block h-5 w-5 shrink-0 rounded-sm shadow-lg",
        className,
      )}
      style={{ background: hex_color ?? "" }}
    />
  );
}

export const BattleCardCreatureName = observer(function BattleCardCreatureName({
  participant,
}: BattleCardParticipantProps) {
  const [encounter] = useEncounter();
  const { mutate: updateParticipant } = useUpdateEncounterParticipant();
  const isDead = ParticipantUtils.isDead(participant);
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
            {isDead ? (
              <LidndTooltip text="Defeated">
                <SkullIcon className="h-4 w-4 text-gray-500" />
              </LidndTooltip>
            ) : null}
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
            participant,
          ),
        },
        "relative flex flex-shrink-0 h-10 w-10",
      )}
      style={{ borderColor: ParticipantUtils.iconHexColor(participant) }}
    >
      <Image
        src={CreatureUtils.awsURL(participant.creature, "icon")}
        alt={ParticipantUtils.name(participant)}
        style={imageStyle}
        width={participant.creature.icon_width}
        height={participant.creature.icon_height}
        onError={() => setError(true)}
      />
    </div>
  );
});

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
        },
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
        "flex gap-2 items-center active:cursor-grabbing max-h-fit p-1 ",
        {
          "border-none shadow-none": tgForParticipant,
          "cursor-grab": encounter.turn_groups.length > 0,
        },
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
        <RemoveCreatureFromEncounterButton participant={p} />
      </div>
    </Card>
  );
}

function EncounterPrepFormChooser({
  activeForm,
  onFormChange,
  showTurnGroups,
}: {
  activeForm: EncounterPrepForm;
  onFormChange: (form: EncounterPrepForm) => void;
  showTurnGroups: boolean;
}) {
  const choices: Array<{
    form: EncounterPrepForm;
    label: string;
    icon: React.ReactNode;
    importance: "primary" | "secondary";
  }> = [
    {
      form: "notes",
      label: "Notes",
      icon: <StickyNoteIcon />,
      importance: "primary",
    },
    {
      form: "participants",
      label: "Adversaries",
      icon: <AngryIcon />,
      importance: "primary",
    },
    ...(showTurnGroups
      ? [
          {
            form: "turnGroups" as const,
            label: "Turn groups",
            icon: <Group />,
            importance: "primary" as const,
          },
        ]
      : []),
    {
      form: "partyMembers",
      label: "Party members",
      icon: <UsersIcon />,
      importance: "secondary",
    },
    {
      form: "images",
      label: "Static images",
      icon: <ImageIcon />,
      importance: "secondary",
    },
    {
      form: "reminders",
      label: "Reminders",
      icon: <FileEdit />,
      importance: "secondary",
    },
  ];

  const primaryChoices = choices.filter((c) => c.importance === "primary");
  const secondaryChoices = choices.filter((c) => c.importance === "secondary");

  return (
    <div className="flex w-full justify-between">
      <div className="flex gap-2 flex-wrap items-center">
        {primaryChoices.map((choice) => (
          <Button
            key={choice.form}
            variant={activeForm === choice.form ? "secondary" : "ghost"}
            onClick={() => onFormChange(choice.form)}
            className="gap-2"
          >
            {choice.icon}
            {choice.label}
          </Button>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap items-center text-gray-500 text-sm">
        {secondaryChoices.map((choice) => (
          <ButtonWithTooltip
            key={choice.form}
            variant={activeForm === choice.form ? "secondary" : "ghost"}
            onClick={() => onFormChange(choice.form)}
            className="gap-2"
            text={choice.label}
          >
            {choice.icon}
          </ButtonWithTooltip>
        ))}
      </div>
    </div>
  );
}

function EncounterPrepFormPanel({
  activeForm,
}: {
  activeForm: EncounterPrepForm;
}) {
  return (
    <Card className="w-full max-w-[500px] 2xl:w-[550px] 2xl:min-w-[550px] min-h-[320px] h-full overflow-auto p-4 shadow-sm">
      <div className="flex flex-col gap-4 h-full">
        {activeForm === "notes" && <DescriptionTextArea />}
        {activeForm === "participants" && <EditModeOpponentForm />}
        {activeForm === "partyMembers" && <AddPlayerToEncounter inline />}
        {activeForm === "images" && <ImageAssetAddButton inline />}
        {activeForm === "reminders" && <ReminderInput inline />}
        {activeForm === "turnGroups" && <CreateTurnGroupForm inline />}
      </div>
    </Card>
  );
}

const MonsterSection = observer(function TurnGroupSetup() {
  const [encounter] = useEncounter();
  const uiStore = useEncounterUIStore();
  const [creatureAddDialogIsOpen, setCreatureAddDialogIsOpen] = useState(false);
  const [acceptDrop, setAcceptDrop] = useState(0);
  const { mutate: updateParticipant } = useUpdateEncounterParticipant();
  const monsters = EncounterUtils.monsters(encounter);
  const monstersWihoutGroup = monsters.filter((m) => !m.turn_group_id);

  useHotkey("a", () => {
    setCreatureAddDialogIsOpen(true);
  });

  return (
    <div className="flex flex-col gap-5 w-full">
      <div
        className={clsx({
          "grid grid-cols-2": creatureAddDialogIsOpen,
        })}
      >
        <div className={clsx("flex flex-col gap-5")}>
          <div className="flex flex-col gap-4">
            {monstersWihoutGroup.length > 0 ||
            encounter.turn_groups.length > 0 ? (
              <div
                className={clsx(
                  "gap-3 gap-x-12 rounded border-2 min-h-[80px]",
                  battleStyles.adversaryGrid,
                  {
                    "border-blue-400 bg-blue-50": acceptDrop > 0,
                    "border-dashed": uiStore.activeDragType === "participant",
                    "border-transparent":
                      uiStore.activeDragType !== "participant",
                  },
                )}
                onDrop={(e) => {
                  e.preventDefault();
                  const droppedParticipant = typedDrag.get(
                    e.dataTransfer,
                    dragTypes.participant,
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
                  if (
                    typedDrag.includes(e.dataTransfer, dragTypes.participant)
                  ) {
                    e.preventDefault();
                  }
                }}
                onDragEnter={(e) => {
                  if (
                    typedDrag.includes(e.dataTransfer, dragTypes.participant)
                  ) {
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
            {encounter.turn_groups.length > 0 && (
              <div className={clsx("gap-4", battleStyles.adversaryGrid)}>
                {encounter.turn_groups.map((tg) => (
                  <TurnGroupDisplay tg={tg} key={tg.id} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

function TargetDifficultySelect() {
  const [encounter] = useEncounter();
  const { mutate: updateEncounter } = useUpdateEncounter();

  return (
    <Select
      onValueChange={(v) => {
        console.log(v);
        updateEncounter({
          ...encounter,
          target_difficulty: v as Encounter["target_difficulty"],
        });
      }}
      defaultValue={encounter.target_difficulty || undefined}
    >
      <SelectTrigger className="w-32">
        <SelectValue placeholder="Select difficulty" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="easy">easy</SelectItem>
        <SelectItem value="standard">standard</SelectItem>
        <SelectItem value="hard">hard</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function ImageAssetAddButton({ inline = false }: { inline?: boolean }) {
  const [encounter] = useEncounter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [uploadImage, setUploadImage] = useState<File | undefined>(undefined);
  const [imageName, setImageName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { data: images } = api.imageAssets.useQuery({
    search: debouncedSearch,
  });
  const qc = useQueryClient();
  const { mutateAsync: uploadAsset } = api.upload.useMutation();

  const debouncedSetSearch = useDebouncedCallback((value: string) => {
    setDebouncedSearch(value);
  }, 300);

  const handleImageUpload = async (file: File) => {
    if (!imageName.trim()) {
      return;
    }
    setIsUploading(true);
    try {
      const { width, height } = await readImageHeightWidth(file);
      const data = await uploadAsset({
        filename: file.name,
        filetype: file.type,
        width,
        height,
        name: imageName.trim(),
      });
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
        await qc.invalidateQueries();
        setUploadImage(undefined);
        setImageName("");
      } catch (error) {
        console.error("Failed to upload image asset:", error);
        setIsUploading(false);
      } finally {
        setIsUploading(false);
      }
    } catch (error) {
      console.error("Failed to read image dimensions:", error);
      setIsUploading(false);
    }
  };

  const content = (
    <div className="p-6 flex flex-col gap-5 w-full max-h-[800px] overflow-auto">
      <div className="border-b pb-4">
        <h3 className="text-sm font-medium mb-3">Upload New Image</h3>
        <div className="flex flex-col gap-3">
          <LidndTextInput
            placeholder="Image name (required)"
            value={imageName}
            onChange={(e) => setImageName(e.target.value)}
            disabled={isUploading}
          />
          <ImageUpload
            image={uploadImage}
            clearImage={() => {
              setUploadImage(undefined);
              setImageName("");
            }}
            onUpload={handleImageUpload}
            dropText={
              !imageName.trim()
                ? "Enter a name first"
                : isUploading
                  ? "Uploading..."
                  : "Drop image to upload"
            }
            dropIcon={<ImageIcon />}
            fileInputProps={{ disabled: isUploading || !imageName.trim() }}
          />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-3">Or Select Existing Image</h3>
        <LidndTextInput
          placeholder="Search images..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            debouncedSetSearch(e.target.value);
          }}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {images?.map((i) => (
          <form
            key={i.baseModel.id}
            className="border p-2 flex flex-col gap-2"
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
            <Button variant="ghost" type="submit">
              {isPending ? "Adding..." : "Add to encounter"}
            </Button>
          </form>
        ))}
      </div>
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <LidndDialog
      title="Add static image"
      trigger={
        <ButtonWithTooltip text="Add static image" variant="ghost" size="icon">
          <ImageIcon />
        </ButtonWithTooltip>
      }
      content={content}
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
    ParticipantUtils.challengeRating(p),
  );
  const tiers = EncounterUtils.findCRBudget({
    encounter,
    campaign,
  });
  const oneHeroStrength = tiers !== "no-players" ? tiers.oneHeroStrength : null;
  const setTurnGroupColor = (hexColor: string | null) =>
    updateTurnGroup({
      ...tg,
      encounter_id: encounter.id,
      hex_color: hexColor,
    });
  return (
    <Card
      key={tg.id}
      className={clsx("flex flex-col gap-2 min-h-[200px]", {
        "border-dashed": uiStore.activeDragType === "participant",
        "border-blue-400 bg-blue-50": acceptDrop > 0,
      })}
      onDrop={(e) => {
        e.preventDefault();
        const droppedParticipant = typedDrag.get(
          e.dataTransfer,
          dragTypes.participant,
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
      <div className="flex gap-3 items-center p-2 bg-gray-100">
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
        <span className="truncate">{tg.name}</span>
        <span className="flex gap-3 ml-auto">
          <span>
            {totalCr} / {oneHeroStrength}
          </span>
          <span>{crLabel(campaign)}</span>
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
      <div className="flex flex-col gap-1 p-2 w-full h-full">
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

function CreateTurnGroupForm({ inline = false }: { inline?: boolean }) {
  const [encounter] = useEncounter();
  const { mutate: createTurnGroup } = api.createTurnGroup.useMutation();
  const [name, setName] = useState("");
  const [hexColor, setHexColor] = useState(labelColors.at(0) || "#FFFFFF");
  const content = (
    <div className="p-2 shadow-none">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          createTurnGroup({
            encounter_id: encounter.id,
            name,
            hex_color: hexColor,
          });
          setName("");
        }}
      >
        <LidndTextInput
          variant="ghost"
          className="w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Turn group name"
        />
        <div className="flex items-center gap-3">
          <LidndPopover
            className="flex flex-wrap gap-3"
            trigger={
              <Button variant="ghost" className="flex items-center gap-2">
                <span>Color</span>
                <div
                  className="h-4 w-4"
                  style={{ backgroundColor: hexColor }}
                />
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
          <Button
            className="ml-auto"
            variant="outline"
            type="submit"
            disabled={!name}
          >
            <PlusIcon />
            Create turn group
          </Button>
        </div>
      </form>
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <LidndPopover
      className="w-fit"
      trigger={
        <Button variant="outline">
          <Group /> Create turn group
        </Button>
      }
    >
      {content}
    </LidndPopover>
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
          <div className="overflow-auto w-full h-full flex items-stretch">
            <StatColumns />
          </div>
        </ParentWidthContext.Provider>
      </div>
    </div>
  );
});

const GroupTurnToggles = observer(function GroupTurnToggles() {
  const [encounter] = useEncounter();
  const uiStore = useEncounterUIStore();
  const turnGroupsById = EncounterUtils.turnGroupsById(encounter);
  const participantsByTurnGroup =
    EncounterUtils.participantsByTurnGroup(encounter);
  const participantsWithoutTurnGroup =
    EncounterUtils.monstersWithoutTurnGroup(encounter);

  if (uiStore.focusedTurn) {
    return <FocusedTurnControls focusedTurn={uiStore.focusedTurn} />;
  }

  return (
    <div className="flex gap-10 p-2 items-center justify-center w-full sticky top-0 z-20 bg-white">
      <div className="flex gap-3 items-center bg-blue-50 rounded-lg p-2">
        <Shield className="h-4 w-4 text-blue-600" />
        <div className="flex gap-5 flex-wrap">
          {EncounterUtils.players(encounter).map((p) => (
            <TurnTakerQuickView
              participant={p}
              participantType="player"
              key={p.id}
            />
          ))}
        </div>
      </div>
      <div className="h-12 w-px bg-gray-300" />
      <div className="flex gap-3 items-center bg-red-50 rounded-lg p-2">
        <Swords className="h-4 w-4 text-red-600" />
        <div className="flex gap-5 flex-wrap">
          {participantsWithoutTurnGroup.map((p) => (
            <TurnTakerQuickView
              participant={p}
              participantType="adversary"
              key={p.id}
            />
          ))}
          {Object.entries(participantsByTurnGroup).map(
            ([tgId, participants]) => (
              <div key={tgId}>
                <TurnTakerQuickView
                  participant={participants[0]}
                  participantType="adversary"
                  labelExtra={
                    <TurnGroupLabel turnGroup={turnGroupsById[tgId]} />
                  }
                />
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
});

function FocusedTurnControls({
  focusedTurn,
}: {
  focusedTurn: FocusedTurnTarget;
}) {
  const encounterId = useEncounterId();
  const [encounter] = useEncounter();
  const uiStore = useEncounterUIStore();
  const { mutate: toggleParticipantHasPlayedThisRound } = useToggleGroupTurn();
  const turnGroupsById = EncounterUtils.turnGroupsById(encounter);
  const focusedParticipant = encounter.participants.find(
    (p) => p.id === focusedTurn.participantId,
  );

  const label =
    focusedTurn.type === "group"
      ? (turnGroupsById[focusedTurn.groupId]?.name ??
        (focusedParticipant
          ? ParticipantUtils.name(focusedParticipant)
          : "Turn"))
      : focusedParticipant
        ? ParticipantUtils.name(focusedParticipant)
        : "Turn";

  const turnGroup =
    focusedTurn.type === "group"
      ? turnGroupsById[focusedTurn.groupId]
      : undefined;

  return (
    <div className="flex p-2 items-center justify-center w-full sticky top-0 z-20 bg-white">
      <div className="flex flex-wrap gap-3 items-center rounded-lg border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
        <Swords className="h-4 w-4 text-red-600" />
        <div className="flex items-center gap-2">
          <span className="text-sm text-red-700">Running turn:</span>
          <span className="font-medium text-gray-900">{label}</span>
          <TurnGroupLabel turnGroup={turnGroup} className="h-4 w-4" />
        </div>
        <Button
          disabled={!focusedParticipant}
          onClick={() => {
            toggleParticipantHasPlayedThisRound({
              encounter_id: encounterId,
              participant_id: focusedTurn.participantId,
            });
            uiStore.clearFocusedTurn();
          }}
        >
          Done
        </Button>
        <Button variant="ghost" onClick={() => uiStore.clearFocusedTurn()}>
          Cancel
        </Button>
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
  const participantsByColumn = EncounterUtils.participantsByColumn(encounter, {
    focusedTurn: uiStore.focusedTurn,
  });
  const visibleColumns = uiStore.focusedTurn
    ? columns?.filter((c) => (participantsByColumn[c.id]?.length ?? 0) > 0)
    : columns;
  const { registerBattleCardRef } = useEncounterUIStore();

  return visibleColumns?.map((c, index) => (
    <StatColumnComponent column={c} index={index} key={c.id}>
      <div
        className={clsx(
          "flex flex-col gap-2 h-full",
          battleStyles.parentContainer,
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
                .sort((a, b) => {
                  const aTurnGroupId = a.turn_group_id;
                  const bTurnGroupId = b.turn_group_id;

                  if (aTurnGroupId == null && bTurnGroupId == null) return 0;
                  if (aTurnGroupId == null) return 1;
                  if (bTurnGroupId == null) return -1;

                  if (aTurnGroupId < bTurnGroupId) return -1;
                  if (aTurnGroupId > bTurnGroupId) return 1;
                  return 0;
                })
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
          <div key={asset.id} className="w-full relative">
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

const TurnTakerQuickView = observer(function TurnTakerQuickView({
  participant,
  participantType,
  labelExtra,
}: {
  participant: ParticipantWithData;
  participantType: "player" | "adversary";
  labelExtra?: React.ReactNode;
}) {
  const id = useEncounterId();
  const [encounter] = useEncounter();
  const uiStore = useEncounterUIStore();
  const turnGroupsById = EncounterUtils.turnGroupsById(encounter);
  const turnGroupForParticipant =
    turnGroupsById[participant.turn_group_id ?? ""];
  const { mutate: toggleParticipantHasPlayedThisRound } = useToggleGroupTurn();
  const hasPlayed = EncounterUtils.participantHasPlayed(encounter, participant);

  const onAction = () => {
    if (participantType === "player" || hasPlayed) {
      toggleParticipantHasPlayedThisRound({
        encounter_id: id,
        participant_id: participant.id,
      });
      return;
    }

    uiStore.focusTurnForParticipant(participant);
  };

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
          onClick={onAction}
          className={clsx("flex p-2 gap-1 rounded-md bg-transparent border-0", {
            "bg-white shadow-lg": !hasPlayed,
          })}
        >
          {participantType === "player" ? (
            hasPlayed ? (
              <CheckCircle className="h-4 w-4 text-black" />
            ) : (
              <Circle className="h-4 w-4 text-black" />
            )
          ) : hasPlayed ? (
            <CheckCircle className="h-4 w-4 text-black" />
          ) : (
            <PlayIcon className="h-4 w-4 text-black" />
          )}
        </Button>
        {labelExtra}
      </div>
    </div>
  );
});

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
            newColumn.participant_id,
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
        className={clsx(`flex flex-col relative border`)}
        style={{ width: `${column.percent_width}%` }}
        onDrop={(e) => {
          const droppedParticipant = typedDrag.get(
            e.dataTransfer,
            dragTypes.participant,
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
            dragTypes.participant,
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
            dragTypes.participant,
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
            <div className="p-3 flex flex-col gap-2">
              {encounter.status === "run" ? (
                <>
                  <EncounterDetails showActions={false} />

                  <div className="flex gap-3 flex-wrap">
                    <Card className="p-2">
                      <EncounterRunTools />
                    </Card>
                    <Card className="p-2">
                      <MaliceTracker compact />
                    </Card>
                  </div>
                </>
              ) : null}
            </div>

            <div className="w-full flex px-3">
              {encounter.status === "run" ? <DescriptionTextArea /> : null}
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
            },
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
