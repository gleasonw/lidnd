"use client";

import { Button } from "@/components/ui/button";
import {
  Clock,
  Dices,
  Skull,
  X,
  Swords,
  Users2,
  Check,
  Plus,
  FileText,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useDebouncedCallback } from "use-debounce";
import { api } from "@/trpc/react";
import type { ParticipantWithData } from "@/server/api/router";
import { LidndPopover } from "@/app/[username]/[campaign_slug]/encounter/base-popover";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils } from "@/utils/participants";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { isStringMeaningful } from "@/app/[username]/utils";
import { useCampaignId } from "@/app/[username]/[campaign_slug]/campaign_id";
import { CreatureIcon } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/character-icon";
import { useEncounterId } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/encounter-id";
import {
  useStartEncounter,
  useRemoveParticipantFromEncounter,
  useEncounter,
  useUpdateEncounterParticipant,
  useEncounterLink,
  useUpdateEncounter,
} from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/hooks";
import { AnimationListItem } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/battle-ui";
import { useCampaign } from "@/app/[username]/[campaign_slug]/hooks";
import { appRoutes } from "@/app/routes";
import { useUser } from "@/app/[username]/user-provider";
import Link from "next/link";
import { makeAutoObservable } from "mobx";
import { observer } from "mobx-react-lite";
import {
  ContextMenu,
  createShapeId,
  DefaultContextMenuContent,
  registerDefaultExternalContentHandlers,
  registerDefaultSideEffects,
  TldrawUi,
  useEditor,
  useToasts,
  useTranslation,
  type TLEditorSnapshot,
  type TLUiComponents,
} from "tldraw";
import {
  uiOverrides,
  overrideComponents,
} from "@/encounters/[encounter_index]/_canvas/ui-overrides";
import { customShapeTypes } from "@/encounters/[encounter_index]/_canvas/encounter-canvas-editor";

class EncounterPrepStore {
  selectedeParticipantId: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  setSelectedParticipant = (id: string) => {
    this.selectedeParticipantId = id;
  };
}

const encounterPrepStore = new EncounterPrepStore();
const EncounterPrepContext = createContext<EncounterPrepStore | null>(null);
const useEncounterPrepStore = () => {
  const store = useContext(EncounterPrepContext);
  if (!store) {
    throw new Error(
      "useEncounterPrepStore must be used within a EncounterPrepProvider",
    );
  }
  return store;
};

const EncounterPrep = observer(function EncounterPrep() {
  return (
    <EncounterPrepContext.Provider value={encounterPrepStore}>
      <div className="w-full h-full relative">
        <EncounterCanvas />
        <EncounterCanvasInitializer />
        <EncounterCanvasPersistence />
      </div>
    </EncounterPrepContext.Provider>
  );
});

export function EncounterCanvas() {
  return (
    <TldrawUi
      onUiEvent={(data) => console.log(data)}
      components={customUiComponents}
      overrides={uiOverrides}
    >
      <EncounterCanvasMainContent />
    </TldrawUi>
  );
}

function EncounterCanvasMainContent() {
  const editor = useEditor();
  const toasts = useToasts();
  const msg = useTranslation();

  useEffect(() => {
    registerDefaultExternalContentHandlers(
      editor,
      {
        maxImageDimension: 5000,
        maxAssetSize: 10 * 1024 * 1024, // 10mb
        acceptedImageMimeTypes: ["image/png", "image/jpeg", "image/gif"],
        acceptedVideoMimeTypes: ["video/mp4", "video/webm"],
      },
      {
        toasts,
        msg,
      },
    );

    const cleanupSideEffects = registerDefaultSideEffects(editor);

    return () => {
      cleanupSideEffects();
    };
  }, [editor, msg, toasts]);
  return (
    <ContextMenu>
      <DefaultContextMenuContent />
    </ContextMenu>
  );
}

const customUiComponents: TLUiComponents = {
  ...overrideComponents,
};

function EncounterCanvasInitializer() {
  // ideally we would do this on the server or something. we're just loading in the starter shapes

  const editor = useEditor();
  const encounterId = useEncounterId();
  const [encounter] = useEncounter();
  const [snapshot] = api.initCanvasSnapshotShapes.useSuspenseQuery(encounterId);
  const isFirstRender = useRef(true);
  const { mutate: updateEncounter } = useUpdateEncounter();

  useEffect(() => {
    if (!encounter.is_canvas_initialized && isFirstRender.current) {
      editor.run(() => {
        const viewCenter = editor.getViewportScreenCenter();
        editor.createShape({
          id: createShapeId(),
          type: "text",
          props: { text: encounter.name },
          x: viewCenter.x,
          y: viewCenter.y,
        });
        let offset = 0;
        encounter.participants.forEach((p) => {
          offset += 100;
          editor.createShape({
            id: createShapeId(),
            type: customShapeTypes.battleCard,
            props: { participantId: p.id },
            x: viewCenter.x + offset,
            y: viewCenter.y,
          });
        });
      });

      isFirstRender.current = false;
      updateEncounter({
        ...encounter,
        is_canvas_initialized: true,
      });
    }
  }, [editor, snapshot, encounter]);

  return null;
}

function EncounterCanvasPersistence() {
  const [encounter] = useEncounter();
  const editor = useEditor();

  const { mutate: updateSnapshot } = api.updateCanvasSnapshot.useMutation();

  const debounceUpdateSnapshot = useDebouncedCallback(
    (storeSnapshot: TLEditorSnapshot) => {
      const snapshot = JSON.stringify(storeSnapshot);
      updateSnapshot({ encounter_id: encounter.id, snapshot });
    },
    1500,
  );

  const unlisten = editor.store.listen(() => {
    debounceUpdateSnapshot(editor.getSnapshot());
  });

  useEffect(() => {
    return () => unlisten();
  }, [unlisten]);

  return null;
}

export default EncounterPrep;

export function EncounterNameInput() {
  const id = useEncounterId();
  const { encounterById } = api.useUtils();
  const [encounter] = api.encounterById.useSuspenseQuery(id);
  const [campaign] = useCampaign();
  const user = useUser();

  const { mutate: updateEncounter } = api.updateEncounter.useMutation({
    onSettled: async () => {
      return await encounterById.invalidate(id);
    },
    onSuccess: (newEncounter) =>
      newEncounter &&
      history.replaceState(
        {},
        "",
        appRoutes.encounter(campaign, newEncounter, user),
      ),
  });

  const [encounterName, setEncounterName] = React.useState(
    encounter?.name ?? "",
  );

  const debouncedNameUpdate = useDebouncedCallback((name: string) => {
    encounter &&
      updateEncounter({
        ...encounter,
        name,
        description: encounter?.description ?? "",
      });
  }, 500);

  return (
    <LidndTextInput
      variant="ghost"
      value={encounterName}
      placeholder={
        isStringMeaningful(encounterName) ? encounterName : "Unnamed encounter"
      }
      className="px-0 text-3xl text-medium"
      onChange={(e) => {
        setEncounterName(e.target.value);
        debouncedNameUpdate(e.target.value);
      }}
    />
  );
}

export function EncounterStartButton() {
  const id = useEncounterId();
  const campaignId = useCampaignId();
  const [campaign] = api.campaignById.useSuspenseQuery(campaignId);
  const { mutate: startEncounter } = useStartEncounter();
  const runLink = useEncounterLink("run");
  const rollLink = useEncounterLink("roll");
  return (
    <span className="flex gap-2 items-center">
      {campaign.system?.initiative_type === "group" ? (
        <Link href={runLink}>
          <Button
            onClick={() => {
              startEncounter(id);
            }}
          >
            <Swords />
            Commence the battle
          </Button>
        </Link>
      ) : (
        <Link href={rollLink}>
          <Button>
            <Dices />
            Roll initiative!
          </Button>
        </Link>
      )}
    </span>
  );
}

export interface ParticipantCreatureProps {
  participant: ParticipantWithData;
}

export function PrepParticipantCard({ participant }: ParticipantCreatureProps) {
  return (
    <AnimationListItem key={participant.id}>
      <div className="flex flex-col items-center gap-3 h-full w-32">
        <Card className="flex flex-col w-32 h-full">
          <CardHeader className="p-3">
            <CardTitle className="text-xl text-center">
              {ParticipantUtils.name(participant)}
            </CardTitle>
          </CardHeader>
          <div className="mt-auto">
            <CreatureIcon
              creature={participant.creature}
              size="medium"
              objectFit="contain"
            />
          </div>
        </Card>
        <ParticipantActions participant={participant} />
      </div>
    </AnimationListItem>
  );
}

function ParticipantActions({
  participant,
}: {
  participant: ParticipantWithData;
}) {
  if (ParticipantUtils.isPlayer(participant)) {
    return <RemoveCreatureFromEncounterButton participant={participant} />;
  }

  return <MonsterParticipantActions participant={participant} />;
}

export interface RemoveCreatureFromEncounterButtonProps {
  participant: ParticipantWithData;
}

export function RemoveCreatureFromEncounterButton(
  props: RemoveCreatureFromEncounterButtonProps,
) {
  const { participant } = props;

  const { mutate: removeCreatureFromEncounter } =
    useRemoveParticipantFromEncounter();
  const id = useEncounterId();
  const [encounter] = api.encounterById.useSuspenseQuery(id);
  return (
    <ButtonWithTooltip
      text="Remove creature"
      variant="ghost"
      onClick={() =>
        removeCreatureFromEncounter({
          encounter_id: encounter.id,
          participant_id: participant.id,
        })
      }
    >
      <X />
    </ButtonWithTooltip>
  );
}

export function MonsterParticipantActions(props: ParticipantCreatureProps) {
  const { participant } = props;

  const { setSelectedParticipant } = useEncounterPrepStore();
  const { mutate: updateCreature } = useUpdateEncounterParticipant();
  const { data: settings } = api.settings.useQuery();

  const [status, setStatus] = useState<"idle" | "input">("idle");
  const [minionCount, setMinionCount] = useState<number | null>(
    participant.minion_count,
  );

  if (status === "input") {
    return (
      <span className="flex items-center">
        <Input
          type="number"
          className="w-32"
          value={minionCount ?? ""}
          onChange={(e) => setMinionCount(parseInt(e.target.value))}
        />
        <Button
          onClick={() => {
            updateCreature({ ...participant, minion_count: minionCount });
            setStatus("idle");
          }}
        >
          <Check />
        </Button>
      </span>
    );
  }

  return (
    <span className="flex flex-wrap">
      <RemoveCreatureFromEncounterButton participant={participant} />
      <ButtonWithTooltip
        text="Show stat block"
        variant="ghost"
        onClick={() => setSelectedParticipant(participant.id)}
      >
        <FileText />
      </ButtonWithTooltip>
      {settings?.enable_minions && (
        <Button variant="outline" onClick={() => setStatus("input")}>
          <Users2 />
        </Button>
      )}
    </span>
  );
}

export function EncounterStats() {
  const { data: settings } = api.settings.useQuery();
  const [encounter] = useEncounter();
  const [campaign] = useCampaign();

  const [estimatedTurnSeconds, setEstimatedTurnSeconds] = React.useState<
    number | null
  >(null);
  const [playerLevel, setPlayerLevel] = React.useState<number>(
    campaign?.party_level ?? 1,
  );
  const [estimatedRounds, setEstimatedRounds] = React.useState<number | null>(
    null,
  );

  const encounterTime = EncounterUtils.durationEstimate(
    encounter,
    estimatedRounds,
    estimatedTurnSeconds,
    settings,
  );

  const { easyTier, standardTier, hardTier } = EncounterUtils.findCRBudget(
    encounter,
    playerLevel,
  );

  return (
    <>
      <LidndPopover
        trigger={
          <Button
            className="flex text-xl items-center gap-2 w-44"
            variant="outline"
            size="sm"
          >
            <Skull />
            {EncounterUtils.difficulty(encounter, playerLevel)}
          </Button>
        }
        className="flex flex-col items-center gap-5"
      >
        <span>Total CR: {EncounterUtils.totalCr(encounter)}</span>
        <span>
          Budget: {easyTier} / {standardTier} / {hardTier}
        </span>
        <label>
          Player level
          <Input
            type={"number"}
            min={1}
            max={20}
            value={playerLevel}
            onChange={(e) => setPlayerLevel(parseInt(e.target.value))}
          />
        </label>
      </LidndPopover>
      <LidndPopover
        className="flex flex-col items-center gap-5"
        trigger={
          <Button
            className="flex gap-5 items-center text-xl whitespace-nowrap"
            variant="outline"
            size="sm"
          >
            <Clock className="flex-shrink-0" />
            {encounterTime}
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <label>
            Estimated turn seconds
            <Input
              type={"number"}
              value={
                estimatedTurnSeconds ?? settings?.average_turn_seconds ?? 180
              }
              onChange={(e) =>
                setEstimatedTurnSeconds(parseInt(e.target.value))
              }
            />
          </label>
          <label>
            Estimated rounds
            <Input
              type={"number"}
              value={estimatedRounds ?? 2}
              onChange={(e) => setEstimatedRounds(parseInt(e.target.value))}
            />
          </label>
        </div>
      </LidndPopover>
    </>
  );
}

export function EncounterReminderInput() {
  const [encounter] = useEncounter();
  const { encounterById } = api.useUtils();
  const [alertAfterRound, setAlertAfterRound] = React.useState<
    number | undefined
  >(undefined);
  const [reminder, setReminder] = React.useState<string | undefined>(undefined);
  const { mutate: removeReminder } = api.removeEncounterReminder.useMutation({
    onSettled: async () => {
      return await encounterById.invalidate(encounter.id);
    },
    onMutate: async ({ reminder_id }) => {
      await encounterById.cancel(encounter.id);
      const previousEncounter = encounterById.getData(encounter.id);
      encounterById.setData(encounter.id, (old) => {
        if (!old) {
          return;
        }
        return EncounterUtils.removeReminder(reminder_id, old);
      });
      return previousEncounter;
    },
  });
  const { mutate: addReminder } = api.addEncounterReminder.useMutation({
    onSettled: async () => {
      return await encounterById.invalidate(encounter.id);
    },
    onMutate: async (newReminder) => {
      await encounterById.cancel(encounter.id);
      const previousEncounter = encounterById.getData(encounter.id);
      encounterById.setData(encounter.id, (old) => {
        if (!old) {
          return;
        }
        return EncounterUtils.addReminder(
          {
            id: Math.random().toString(),
            reminder: newReminder.reminder ?? "",
            ...newReminder,
          },
          old,
        );
      });
      return previousEncounter;
    },
  });

  if (!encounter) {
    return null;
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-xl">Round reminders</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addReminder({
            encounter_id: encounter.id,
            alert_after_round: alertAfterRound ?? 0,
            reminder: reminder,
          });
        }}
        className="flex flex-col gap-3"
      >
        <section className="flex gap-3 flex-wrap items-center">
          <LidndTextInput
            variant="ghost"
            placeholder="Reminder text"
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
          />
          <LidndTextInput
            variant="ghost"
            type="number"
            value={alertAfterRound}
            onChange={(e) =>
              setAlertAfterRound(
                !isNaN(parseInt(e.target.value))
                  ? parseInt(e.target.value)
                  : undefined,
              )
            }
            placeholder="Alert after round (0 for every)"
            className="w-72"
          />
          <Button type="submit">
            <Plus /> Add{" "}
          </Button>
        </section>
        {encounter?.reminders.map((reminder) => (
          <div
            className="flex gap-1 shadow-md border items-center p-3"
            key={reminder.id}
          >
            <span className="flex-grow">{reminder.reminder}</span>
            <span>after round {reminder.alert_after_round}</span>
            <ButtonWithTooltip
              text="Remove reminder"
              variant="ghost"
              onClick={(e) => {
                e.preventDefault();
                removeReminder({
                  reminder_id: reminder.id,
                  encounter_id: encounter.id,
                });
              }}
            >
              <X />
            </ButtonWithTooltip>
          </div>
        ))}
      </form>
    </div>
  );
}
