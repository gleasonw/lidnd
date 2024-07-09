"use client";

import { Button } from "@/components/ui/button";
import {
  Clock,
  Dices,
  Play,
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
import React, { createContext, useContext, useState } from "react";
import { getAWSimageURL } from "@/app/[username]/[campaign_slug]/encounter/utils";
import { useDebouncedCallback } from "use-debounce";
import { api } from "@/trpc/react";
import { ParticipantWithData } from "@/server/api/router";
import { BasePopover } from "@/app/[username]/[campaign_slug]/encounter/base-popover";
import { OriginalSizeImage } from "@/app/[username]/[campaign_slug]/encounter/original-size-image";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils } from "@/utils/participants";
import { LidndDialog, LidndPlusDialog } from "@/components/ui/lidnd_dialog";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { isStringMeaningful } from "@/app/[username]/utils";
import { useCampaignId } from "@/app/[username]/[campaign_slug]/campaign_id";
import { CharacterIcon } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/character-icon";
import { DescriptionTextArea } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/description-text-area";
import { useEncounterId } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/encounter-id";
import { GroupBattleLayout } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/group-battle-ui";
import {
  useStartEncounter,
  useRemoveParticipantFromEncounter,
  useEncounter,
  useUpdateEncounterParticipant,
  useEncounterLink,
} from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/hooks";
import {
  AllyUpload,
  MonsterUpload,
} from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/participant-add-form";
import { AnimationListItem } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/battle-ui";
import { useCampaign } from "@/app/[username]/[campaign_slug]/hooks";
import { appRoutes } from "@/app/routes";
import { useUser } from "@/app/[username]/user-provider";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import _ from "lodash";
import { makeAutoObservable } from "mobx";
import { observer } from "mobx-react-lite";

class EncounterPrepStore {
  selectedCreatureId: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  setselectedCreatureId = (id: string) => {
    this.selectedCreatureId = id;
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
  const { selectedCreatureId } = encounterPrepStore;
  return (
    <EncounterPrepContext.Provider value={encounterPrepStore}>
      <div className="flex flex-col gap-5 flex-grow ml-auto mr-auto max-w-[860px] min-w-0">
        <EncounterDetailsTopBar>
          <EncounterStats />
        </EncounterDetailsTopBar>
        <EncounterNameInput />
        <DescriptionTextArea
          tiptapReadyGate={
            <>
              <Separator />
              <EncounterParticipantRow />
              {selectedCreatureId && (
                <OriginalSizeImage
                  src={getAWSimageURL(selectedCreatureId, "stat_block")}
                  alt={"monster stat block"}
                />
              )}
              <div className="flex md:hidden">
                <EncounterReminderInput />
              </div>
            </>
          }
        />
      </div>
    </EncounterPrepContext.Provider>
  );
});

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

interface EncounterDetailsTopBarProps {
  children?: React.ReactNode;
}

function EncounterDetailsTopBar(props: EncounterDetailsTopBarProps) {
  const { children } = props;
  const [encounter] = useEncounter();
  const runLink = useEncounterLink("run");
  return (
    <div className="flex items-center gap-1 flex-wrap md:hidden">
      {encounter?.started_at ? (
        <Link href={runLink}>
          <Button>
            <Play />
            Continue the battle!
          </Button>
        </Link>
      ) : (
        <EncounterStartButton />
      )}
      {children}
    </div>
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

function EncounterParticipantRow() {
  const id = useEncounterId();
  const [encounter] = api.encounterById.useSuspenseQuery(id);

  const monsters = EncounterUtils.monsters(encounter);
  const players = EncounterUtils.allies(encounter);

  return (
    <>
      <GroupBattleLayout
        playerTitle={
          <h1 className="flex gap-5 text-xl items-center">
            Allies
            <LidndPlusDialog text="Add ally">
              <AllyUpload />
            </LidndPlusDialog>
          </h1>
        }
        monsterTitle={
          <h1 className="flex gap-5 text-xl items-center">
            Monsters
            <LidndPlusDialog text="Add monster">
              <MonsterUpload />
            </LidndPlusDialog>
          </h1>
        }
        monsters={[
          ...monsters.map((participant, index) => (
            <PrepParticipantCard
              participant={participant}
              key={participant.id + index}
            />
          )),
          <Card
            className="flex flex-col justify-center items-center w-32 h-60"
            key="monster-placeholder"
          >
            <LidndDialog
              trigger={
                <ButtonWithTooltip
                  text="Add monster"
                  className="w-full h-full"
                  variant="ghost"
                >
                  <Plus />
                </ButtonWithTooltip>
              }
              content={<MonsterUpload />}
            />
          </Card>,
        ]}
        players={players.map((participant, index) => (
          <PrepParticipantCard
            key={participant.id + index}
            participant={participant}
          />
        ))}
      />
      {encounter?.participants?.length === 0 && (
        <h1 className={"text-2xl text-center"}>
          No creatures in this encounter
        </h1>
      )}
    </>
  );
}

export interface ParticipantCreatureProps {
  participant: ParticipantWithData;
}

function PrepParticipantCard({ participant }: ParticipantCreatureProps) {
  return (
    <AnimationListItem key={participant.id}>
      <div className="flex flex-col items-center gap-3 h-full w-32">
        <Card className="flex flex-col justify-center w-32 h-full">
          <CardHeader className="p-3">
            <CardTitle className="text-xl text-center">
              {ParticipantUtils.name(participant)}
            </CardTitle>
          </CardHeader>
          <CharacterIcon
            id={participant.creature_id}
            name={ParticipantUtils.name(participant)}
            className="object-cover w-32 h-32 mt-auto"
          />
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

  const { setselectedCreatureId } = useEncounterPrepStore();
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
        onClick={() =>
          setselectedCreatureId(ParticipantUtils.creatureId(participant))
        }
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

  const [estimatedTurnSeconds, setEstimatedTurnSeconds] = React.useState<
    number | null
  >(null);
  const [playerLevel, setPlayerLevel] = React.useState<number | null>(null);
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
    playerLevel ?? settings?.default_player_level ?? 1,
  );

  return (
    <>
      <BasePopover
        trigger={
          <Button
            className="flex text-xl items-center gap-2 w-44"
            variant="outline"
            size="sm"
          >
            <Skull />
            {EncounterUtils.difficulty(encounter, playerLevel, settings)}
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
            value={playerLevel ?? settings?.default_player_level ?? 1}
            onChange={(e) => setPlayerLevel(parseInt(e.target.value))}
          />
        </label>
      </BasePopover>
      <BasePopover
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
      </BasePopover>
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
          <div className="flex gap-1 shadow-md border items-center p-3">
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
