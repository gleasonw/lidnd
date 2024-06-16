"use client";

import { AnimationListItem } from "@/encounters/[id]/run/battle-ui";
import {
  useEncounter,
  useEncounterId,
  useUpdateEncounterParticipant,
} from "@/encounters/[id]/hooks";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Dices,
  Play,
  Skull,
  X,
  Swords,
  Sword,
  Angry,
  Users2,
  Check,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import React, { useState } from "react";
import { getAWSimageURL } from "@/encounters/utils";
import { useDebouncedCallback } from "use-debounce";
import { api } from "@/trpc/react";
import {
  useRemoveParticipantFromEncounter,
  useStartEncounter,
} from "@/encounters/[id]/hooks";
import { GroupBattleLayout } from "@/encounters/[id]/run/group-battle-ui";
import { ParticipantWithData } from "@/server/api/router";
import { useCampaignId } from "@/campaigns/hooks";
import { BasePopover } from "@/encounters/base-popover";
import { CharacterIcon } from "@/encounters/[id]/character-icon";
import {
  AllyUpload,
  MonsterUpload,
} from "@/encounters/[id]/run/participant-add-form";
import { OriginalSizeImage } from "@/encounters/original-size-image";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils } from "@/utils/participants";
import { LidndDialog, LidndPlusDialog } from "@/components/ui/lidnd_dialog";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { isStringMeaningful } from "@/app/dashboard/utils";
import { DescriptionTextArea } from "@/encounters/[id]/description-text-area";
import { FadeInSuspense } from "@/components/ui/fade-in-suspense";

// TODO:
// - max hp and challenge rating required
// - allow creature editing / deletion

export default function EncounterPrep() {
  const [selectedParticipantId, setSelectedParticipantId] = React.useState<
    string | null
  >(null);

  return (
    <FadeInSuspense
      fallback={<div>Loading encounter...</div>}
      wrapperClassName="flex"
    >
      <div className="flex flex-col gap-3 flex-grow ml-auto mr-auto max-w-[860px] min-w-0">
        <EncounterDetailsTopBar>
          <EncounterStats />
        </EncounterDetailsTopBar>
        <EncounterNameInput />
        <DescriptionTextArea
          tiptapReadyGate={
            <>
              <EncounterParticipantRow
                onSelectParticipant={setSelectedParticipantId}
              />
              {selectedParticipantId && (
                <OriginalSizeImage
                  src={getAWSimageURL(selectedParticipantId, "stat_block")}
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
      <EncounterDetailsSidebar>
        <EncounterStats />
        <EncounterReminderInput />
      </EncounterDetailsSidebar>
    </FadeInSuspense>
  );
}

export function EncounterNameInput() {
  const id = useEncounterId();
  const { encounterById } = api.useUtils();
  const [encounter] = api.encounterById.useSuspenseQuery(id);
  const { mutate: updateEncounter } = api.updateEncounter.useMutation({
    onSettled: async () => {
      return await encounterById.invalidate(id);
    },
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
      className="px-0 text-2xl"
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
  const id = useEncounterId();
  return (
    <div className="flex items-center gap-1 flex-wrap md:hidden">
      {encounter?.started_at ? (
        <Link href={`${id}/run`}>
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

function EncounterDetailsSidebar({ children }: { children: React.ReactNode }) {
  const [encounter] = useEncounter();
  const id = useEncounterId();
  return (
    <div className="flex-col h-screen bg-gray-50 p-3 items-center gap-5 max-w-[300px] hidden md:flex -m-[var(--main-content-padding)]">
      {encounter?.started_at ? (
        <Link href={`${id}/run`}>
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
  const [encounter] = api.encounterById.useSuspenseQuery(id);
  const [campaign] = api.campaignById.useSuspenseQuery(campaignId);
  const { mutate: startEncounter } = useStartEncounter();
  return (
    <span className="flex gap-2 items-center">
      {campaign.system?.initiative_type === "group" ? (
        <Link
          href={`${id}/run`}
          onClick={async () => encounter && startEncounter(id)}
        >
          <Button>
            <Swords />
            Commence the battle
          </Button>
        </Link>
      ) : (
        <Link href={`${id}/roll`}>
          <Button>
            <Dices />
            Roll initiative!
          </Button>
        </Link>
      )}
    </span>
  );
}

function EncounterParticipantRow(props: {
  onSelectParticipant: (id: string) => void;
}) {
  const { onSelectParticipant } = props;
  const id = useEncounterId();
  const [encounter] = api.encounterById.useSuspenseQuery(id);

  const monsters = EncounterUtils.monsters(encounter);
  const players = EncounterUtils.allies(encounter);

  return (
    <>
      <GroupBattleLayout
        playerTitle={
          <h1 className="flex gap-5 text-xl items-center">
            Allies <Sword />{" "}
            <LidndPlusDialog text="Add ally">
              <AllyUpload />
            </LidndPlusDialog>
          </h1>
        }
        monsterTitle={
          <h1 className="flex gap-5 text-xl items-center">
            Monsters <Angry />
            <LidndPlusDialog text="Add monster">
              <MonsterUpload />
            </LidndPlusDialog>
          </h1>
        }
        monsters={
          monsters?.length > 0
            ? monsters.map((participant, index) => (
                <div
                  onClick={() => onSelectParticipant(participant.creature_id)}
                  key={participant.id + index}
                >
                  <PrepParticipantCard participant={participant} />
                </div>
              ))
            : [
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
              ]
        }
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
      <div className="flex flex-col items-center gap-3">
        <Card className="flex flex-col justify-center w-32">
          <CardHeader>
            <CardTitle>{ParticipantUtils.name(participant)}</CardTitle>
          </CardHeader>
          <CharacterIcon
            id={participant.creature_id}
            name={ParticipantUtils.name(participant)}
            className="object-cover w-32 h-32"
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
    <Button
      variant="ghost"
      onClick={() =>
        removeCreatureFromEncounter({
          encounter_id: encounter.id,
          participant_id: participant.id,
        })
      }
    >
      <X />
    </Button>
  );
}

export function MonsterParticipantActions(props: ParticipantCreatureProps) {
  const { participant } = props;

  const { mutate: updateCreature } = useUpdateEncounterParticipant();
  const { data: settings } = api.settings.useQuery();

  const [status, setStatus] = useState<"idle" | "input">("idle");
  const [minionCount, setMinionCount] = useState<number | null>(
    participant.minion_count,
  );

  if (status === "input") {
    return (
      <span className="flex items-center gap-2">
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
    <span className="flex gap-3">
      <RemoveCreatureFromEncounterButton participant={participant} />
      {settings?.enable_minions && (
        <Button variant="outline" onClick={() => setStatus("input")}>
          <Users2 />
        </Button>
      )}
    </span>
  );
}

function EncounterStats() {
  const id = useEncounterId();
  const { data: settings } = api.settings.useQuery();
  const { data: encounter } = api.encounterById.useQuery(id);

  const [estimatedTurnSeconds, setEstimatedTurnSeconds] = React.useState<
    number | null
  >(null);
  const [playerLevel, setPlayerLevel] = React.useState<number | null>(null);
  const [localNumPlayers, setLocalNumPlayers] = React.useState<number | null>(
    null,
  );
  const [estimatedRounds, setEstimatedRounds] = React.useState<number | null>(
    null,
  );

  const finalTurnSeconds =
    estimatedTurnSeconds ?? settings?.average_turn_seconds ?? 180;
  const finalPlayerLevel = playerLevel ?? settings?.default_player_level ?? 1;
  const finalNumPlayers =
    localNumPlayers ??
    encounter?.participants?.filter((p) => ParticipantUtils.isPlayer(p))
      ?.length ??
    4;
  const finalEstimatedRounds = estimatedRounds ?? 3;

  const numParticipants = encounter?.participants?.length ?? 0;

  const estimatedEncounterDuration =
    (numParticipants * finalEstimatedRounds * finalTurnSeconds) / 60;

  const totalCr =
    encounter?.participants?.reduce((acc, p) => {
      if (p.is_ally) return acc;
      return acc + ParticipantUtils.challengeRating(p);
    }, 0) ?? 0;

  const crBudget = encounterCRPerCharacter.find(
    (cr) => cr.level === finalPlayerLevel,
  );

  const alliesWeighted =
    encounter?.participants?.reduce((acc, participant) => {
      if (!participant.is_ally) {
        return acc;
      }

      // rough approximation from monster cr to player level
      return acc + ParticipantUtils.challengeRating(participant) * 4;
    }, 0) ?? 0;

  const playersAndAllies = finalNumPlayers + alliesWeighted;

  const easyTier = (crBudget?.easy ?? 0) * playersAndAllies;
  const standardTier = (crBudget?.standard ?? 0) * playersAndAllies;
  const hardTier = (crBudget?.hard ?? 0) * playersAndAllies;

  let difficulty = "";
  if (totalCr <= easyTier) {
    difficulty = "Easy";
  } else if (totalCr <= standardTier) {
    difficulty = "Standard";
  } else if (totalCr <= hardTier) {
    difficulty = "Hard";
  } else {
    difficulty = "Deadly";
  }

  let encounterTime = "";
  const hourTime = estimatedEncounterDuration / 60;
  const hourCount = Math.floor(hourTime);
  const minuteRemainder = estimatedEncounterDuration % 60;
  if (hourTime >= 1) {
    encounterTime = `${hourCount} hour${hourCount > 1 ? "s" : ""} ${
      minuteRemainder ? `${Math.floor(minuteRemainder)} minutes` : ""
    }`;
  } else {
    encounterTime = `${Math.floor(estimatedEncounterDuration % 60)} minutes`;
  }

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
            {difficulty}
          </Button>
        }
        className="flex flex-col items-center gap-5"
      >
        <span>Total CR: {totalCr}</span>
        <span>
          Budget: {easyTier} / {standardTier} / {hardTier}
        </span>
        <label>
          Number of players in encounter
          <Input
            type={"number"}
            value={finalNumPlayers}
            onChange={(e) => setLocalNumPlayers(parseInt(e.target.value))}
          />
        </label>
        <label>
          Player level
          <Input
            type={"number"}
            value={finalPlayerLevel}
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
              value={finalTurnSeconds}
              onChange={(e) =>
                setEstimatedTurnSeconds(parseInt(e.target.value))
              }
            />
          </label>
          <label>
            Estimated rounds
            <Input
              type={"number"}
              value={finalEstimatedRounds}
              onChange={(e) => setEstimatedRounds(parseInt(e.target.value))}
            />
          </label>
        </div>
      </BasePopover>
    </>
  );
}

const encounterCRPerCharacter = [
  { level: 1, easy: 0.125, standard: 0.125, hard: 0.25, cap: 1 },
  { level: 2, easy: 0.125, standard: 0.25, hard: 0.5, cap: 3 },
  { level: 3, easy: 0.25, standard: 0.5, hard: 0.75, cap: 4 },
  { level: 4, easy: 0.5, standard: 0.75, hard: 1, cap: 6 },
  { level: 5, easy: 1, standard: 1.5, hard: 2.5, cap: 8 },
  { level: 6, easy: 1.5, standard: 2, hard: 3, cap: 9 },
  { level: 7, easy: 2, standard: 2.5, hard: 3.5, cap: 10 },
  { level: 8, easy: 2.5, standard: 3, hard: 4, cap: 13 },
  { level: 9, easy: 3, standard: 3.5, hard: 4.5, cap: 13 },
  { level: 10, easy: 3.5, standard: 4, hard: 5, cap: 15 },
  { level: 11, easy: 4, standard: 4.5, hard: 5.5, cap: 16 },
  { level: 12, easy: 4.5, standard: 5, hard: 6, cap: 17 },
  { level: 13, easy: 5, standard: 5.5, hard: 6.5, cap: 19 },
  { level: 14, easy: 5.5, standard: 6, hard: 7, cap: 20 },
  { level: 15, easy: 6, standard: 6.5, hard: 7.5, cap: 22 },
  { level: 16, easy: 6.5, standard: 7, hard: 8, cap: 24 },
  { level: 17, easy: 7, standard: 7.5, hard: 8.5, cap: 25 },
  { level: 18, easy: 7.5, standard: 8, hard: 9, cap: 26 },
  { level: 19, easy: 8, standard: 8.5, hard: 9.5, cap: 28 },
  { level: 20, easy: 8.5, standard: 9, hard: 10, cap: 30 },
];

function EncounterReminderInput() {
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
          <div className="grid grid-cols-3 gap-3">
            <span>{reminder.reminder}</span>
            <span>{reminder.alert_after_round}</span>
            <Button
              variant="destructive"
              className="w-20"
              onClick={(e) => {
                e.preventDefault();
                removeReminder({
                  reminder_id: reminder.id,
                  encounter_id: encounter.id,
                });
              }}
            >
              <X />
            </Button>
          </div>
        ))}
      </form>
    </div>
  );
}
