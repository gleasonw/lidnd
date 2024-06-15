"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { ChevronUp, Plus } from "lucide-react";
import { ParticipantHealthForm } from "@/app/dashboard/campaigns/[campaign]/encounters/[id]/run/creature-health-form";
import { CharacterIcon } from "@/app/dashboard/campaigns/[campaign]/encounters/[id]/character-icon";
import InitiativeInput from "@/app/dashboard/campaigns/[campaign]/encounters/[id]/InitiativeInput";
import React, { createContext, Suspense, useContext } from "react";
import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import clsx from "clsx";
import { api } from "@/trpc/react";
import { useEncounterId } from "../hooks";
import { ParticipantWithData } from "@/server/api/router";
import { useRemoveStatusEffect } from "@/app/dashboard/campaigns/[campaign]/encounters/[id]/hooks";
import { FadePresenceItem } from "@/components/ui/animate/FadePresenceItem";
import { BasePopover } from "@/app/dashboard/campaigns/[campaign]/encounters/base-popover";
import { StatusInput } from "./status-input";
import { effectIconMap } from "./effectIconMap";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tip } from "@/components/ui/tip";
import { LinearBattleUI } from "./linear-battle-ui";
import { GroupBattleUI } from "@/app/dashboard/campaigns/[campaign]/encounters/[id]/run/group-battle-ui";
import { EncounterTime } from "@/app/dashboard/campaigns/[campaign]/encounters/[id]/run/encounter-time";
import { useCampaign } from "@/app/dashboard/campaigns/[campaign]/hooks";
import { ParticipantUpload } from "@/encounters/[id]/run/participant-add-form";
import { makeAutoObservable } from "mobx";
import { observer } from "mobx-react-lite";
import { ReminderDialog } from "@/encounters/[id]/run/reminder-dialog";
import { ParticipantUtils } from "@/utils/participants";
import { ParticipantEffectUtils } from "@/utils/participantEffects";
import { EncounterUtils } from "@/utils/encounters";
import { EncounterWithData } from "@/server/encounters";
import { Reminder } from "@/app/dashboard/types";

export function BattleUILoader() {
  return (
    <AnimatePresence>
      <Suspense fallback={<div>Loading...</div>}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.1 } }}
        >
          <BattleUI />
        </motion.div>
      </Suspense>
    </AnimatePresence>
  );
}

/**
 * Manages ui state like dialogs, etc. I'm curious to see how this scales. A bit spooky to
 * persist reminders outside react query.
 */
class BattleUIStore {
  remindersToDisplay: Reminder[] = [];

  constructor() {
    makeAutoObservable(this);
  }

  displayReminders = (encounter: EncounterWithData) => {
    const { updatedRoundNumber } = EncounterUtils.cycleNextTurn(encounter);

    const remindersToTrigger = EncounterUtils.activeReminders(
      encounter,
      updatedRoundNumber,
    );

    if (remindersToTrigger && remindersToTrigger.length > 0) {
      this.remindersToDisplay = remindersToTrigger;
    } else {
      this.remindersToDisplay = [];
    }
  };

  hideReminders = () => {
    this.remindersToDisplay = [];
  };

  get shouldShowReminders() {
    return this.remindersToDisplay.length > 0;
  }
}

const battleUIStore = new BattleUIStore();
const BattleUIContext = createContext<BattleUIStore | null>(null);

export function useBattleUIStore() {
  const store = useContext(BattleUIContext);
  if (!store) {
    throw new Error("useBattleUIStore must be used within a BattleUIProvider");
  }
  return store;
}

export const BattleUI = observer(function BattleUI() {
  const id = useEncounterId();
  const { data: encounter } = api.encounterById.useQuery(id);

  const { data: campaign } = useCampaign();

  const roundText =
    encounter?.current_round === 0
      ? "Surprise round"
      : `Round ${encounter?.current_round}`;

  return (
    <BattleUIContext.Provider value={battleUIStore}>
      <ReminderDialog />
      <div className="flex gap-8 flex-col">
        <div className="flex gap-10 flex-wrap items-center justify-center">
          <h1 className="text-xl text-center">{roundText}</h1>
          <EncounterTime time={encounter?.started_at ?? undefined} />
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus /> Add creature
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl overflow-auto max-h-screen">
              <div
                className={"flex gap-10 flex-wrap w-full justify-center h-full"}
              >
                <ParticipantUpload />
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {encounter?.description && (
          <CardDescription className="whitespace-pre-wrap">
            {encounter.description}
          </CardDescription>
        )}

        {campaign?.system?.initiative_type === "linear" ? (
          <LinearBattleUI />
        ) : (
          <GroupBattleUI />
        )}
      </div>
    </BattleUIContext.Provider>
  );
});

export interface SimpleIconBattleCardProps {
  children?: React.ReactNode;
  participant: ParticipantWithData;
  className?: string;
  index: number;
  activeIndex: number;
}

export function SimpleIconBattleCard({
  children,
  participant,
  className,
  index,
  activeIndex,
}: SimpleIconBattleCardProps) {
  const [encounter] = api.encounterById.useSuspenseQuery(useEncounterId());
  const { encounterById } = api.useUtils();

  const { mutate: removeStatusEffect } = api.removeStatusEffect.useMutation({
    onSettled: async () => {
      return await encounterById.invalidate(encounter.id);
    },
    onMutate: async (newStatusEffect) => {
      await encounterById.cancel(encounter.id);
      const previousEncounter = encounterById.getData(encounter.id);
      encounterById.setData(encounter.id, (old) => {
        if (!old) return old;
        return {
          ...old,
          participants: old.participants.map((participant) => {
            if (participant.id === newStatusEffect.encounter_participant_id) {
              return {
                ...participant,
                status_effects: participant.status_effects.filter(
                  (effect) => effect.id !== newStatusEffect.status_effect_id,
                ),
              };
            }
            return participant;
          }),
        };
      });
      return previousEncounter;
    },
  });
  return (
    <span className="flex flex-col gap-2">
      {participant.status_effects?.map((se) => (
        <BasePopover
          key={se.id}
          trigger={
            <Button variant="outline" className="w-10 h-10">
              {effectIconMap[se.effect.name as keyof typeof effectIconMap]}
            </Button>
          }
          className="flex flex-col gap-2 text-sm f."
        >
          {se.effect.description}
          {!!se.save_ends_dc && <span>Save ends ({se.save_ends_dc})</span>}
          <Button onClick={() => removeStatusEffect(se)}>Remove</Button>
        </BasePopover>
      ))}
      <Tip text={ParticipantUtils.name(participant)}>
        <Card
          data-active={participant.is_active}
          className={clsx(
            "w-28 h-40 shadow-lg relative select-none mb-8 rounded-sm justify-between overflow-hidden pt-3 gap-0 items-center flex flex-col transition-all",
            {
              "h-48 mb-0": participant.is_active,
              "opacity-40":
                (encounter?.current_round === 0 && !participant.has_surprise) ||
                index < activeIndex,
            },
            className,
          )}
        >
          <HealthMeterOverlay participant={participant} />
          {participant.creature_id === "pending" ? (
            <span>Loading</span>
          ) : (
            <CharacterIcon
              id={participant.creature_id}
              name={ParticipantUtils.name(participant)}
              width={400}
              height={400}
              className="h-60 object-cover"
            />
          )}
          {children}
        </Card>
      </Tip>

      <div className={"flex justify-center "}>
        {participant.is_active && <ChevronUp />}
      </div>
    </span>
  );
}

export type BattleCardProps = {
  participant: ParticipantWithData;
  children?: React.ReactNode;
  className?: string;
  isSelected?: boolean;
  header?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

export function BattleCard({
  participant,
  className,
  isSelected,
  header,
  ...props
}: BattleCardProps) {
  const id = useEncounterId();
  const [encounter] = api.encounterById.useSuspenseQuery(id);

  return (
    <div
      className={`relative flex-col gap-6 items-center justify-between flex`}
      {...props}
    >
      {participant?.minion_count && participant.minion_count > 1 ? (
        <MinionCardStack minionCount={participant.minion_count} />
      ) : null}
      <BattleCardLayout
        key={participant.id}
        data-active={participant.is_active}
        className={clsx(className, {
          "outline-zinc-900 outline": isSelected,
          "opacity-40":
            encounter?.current_round === 0 && !participant.has_surprise,
        })}
      >
        <BattleCardStatusEffects participant={participant} />
        <BattleCardCreatureName participant={participant} />
        <BattleCardContent>
          <span className="flex justify-between">
            <BattleCardCreatureIcon participant={participant} />
            <InitiativeInput participant={participant} key={participant.id} />
          </span>
          <BattleCardHealthAndStatus participant={participant} />
        </BattleCardContent>
      </BattleCardLayout>
      <AnimatePresence>
        <div className={"flex absolute -bottom-8 flex-row gap-2"}>
          {participant.is_active && (
            <FadePresenceItem>
              <ChevronUp />
            </FadePresenceItem>
          )}
        </div>
      </AnimatePresence>
    </div>
  );
}

export function BattleCardLayout({
  className,
  children,
  ...props
}: {
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Card
      className={clsx(
        "bg-white w-[300px] shadow-lg flex flex-col justify-between transition-all hover:rounded-xl group",
        className,
      )}
      {...props}
    >
      {children}
    </Card>
  );
}

export function BattleCardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <CardContent className={clsx("flex flex-col gap-2", className)}>
      {children}
    </CardContent>
  );
}

type BattleCardParticipantProps = {
  participant: ParticipantWithData;
};

export function BattleCardStatusEffects({
  participant,
}: BattleCardParticipantProps) {
  const { mutate: removeStatusEffect } = useRemoveStatusEffect();

  return (
    <span className={"h-12 flex gap-1 flex-wrap items-center"}>
      {participant.status_effects?.map((se) => (
        <BasePopover
          key={se.id}
          trigger={
            <Button variant="outline">
              {
                effectIconMap[
                  ParticipantEffectUtils.name(se) as keyof typeof effectIconMap
                ]
              }
            </Button>
          }
          className="flex flex-col gap-2 text-sm"
        >
          {ParticipantEffectUtils.description(se)}
          {!!se.save_ends_dc && <span>Save ends ({se.save_ends_dc})</span>}
          <Button onClick={() => removeStatusEffect(se)}>Remove</Button>
        </BasePopover>
      ))}
    </span>
  );
}

export function BattleCardCreatureName({
  participant,
}: BattleCardParticipantProps) {
  return (
    <CardHeader className="flex pt-0 flex-col gap-2 justify-between items-center">
      <CardTitle className="text-xl truncate max-w-full group-hover:opacity-50">
        {ParticipantUtils.name(participant)}
      </CardTitle>
    </CardHeader>
  );
}

export function BattleCardCreatureIcon({
  participant,
  className,
}: BattleCardParticipantProps & {
  className?: string;
}) {
  return participant.creature_id === "pending" ? (
    <span>Loading</span>
  ) : (
    <div className={clsx("relative", className)}>
      <CharacterIcon
        id={participant.creature_id}
        name={ParticipantUtils.name(participant)}
        width={200}
        height={200}
        className="object-cover w-32 h-32"
      />
      <HealthMeterOverlay participant={participant} />
    </div>
  );
}

export function BattleCardHealthAndStatus({
  participant,
}: BattleCardParticipantProps) {
  return (
    <div className="flex flex-col gap-3">
      {!ParticipantUtils.isPlayer(participant) && (
        <ParticipantHealthForm participant={participant} />
      )}
      <StatusInput participant={participant} />
    </div>
  );
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
  const maxHP = ParticipantUtils.maxHp(participant);
  const creaturePercentDamage = (participant.hp / maxHP) * 100;
  return (
    <div
      style={{ height: `${creaturePercentDamage}%` }}
      className={clsx(
        "absolute rounded bottom-0 left-0 w-full bg-opacity-70 transition-all",
        {
          "bg-gray-500": creaturePercentDamage === 100,
          "bg-red-500": creaturePercentDamage !== 100,
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
