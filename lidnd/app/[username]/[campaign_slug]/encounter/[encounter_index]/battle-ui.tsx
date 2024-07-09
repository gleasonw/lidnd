"use client";

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { ChevronUp } from "lucide-react";
import React from "react";
import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import clsx from "clsx";
import { api } from "@/trpc/react";
import { Participant, ParticipantWithData } from "@/server/api/router";
import { FadePresenceItem } from "@/components/ui/animate/FadePresenceItem";
import { BasePopover } from "@/app/[username]/[campaign_slug]/encounter/base-popover";
import { StatusInput } from "./status-input";
import { effectIconMap } from "./effectIconMap";
import { LinearBattleUI } from "./linear-battle-ui";
import { useCampaign } from "@/app/[username]/[campaign_slug]/hooks";
import { observer } from "mobx-react-lite";
import { ParticipantUtils } from "@/utils/participants";
import { ParticipantEffectUtils } from "@/utils/participantEffects";
import { FadeInSuspense } from "@/components/ui/fade-in-suspense";
import { CharacterIcon } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/character-icon";
import { ParticipantHealthForm } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/creature-health-form";
import { DescriptionTextArea } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/description-text-area";
import { useEncounterId } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/encounter-id";
import { GroupBattleUI } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/group-battle-ui";
import {
  useRemoveStatusEffect,
  useUpdateEncounterParticipant,
} from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/hooks";
import InitiativeInput from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/InitiativeInput";
import { ReminderDialog } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/reminder-dialog";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { useDebouncedCallback } from "use-debounce";
import { EncounterUtils } from "@/utils/encounters";
import { useEncounterUIStore } from "@/encounters/[encounter_index]/EncounterUiStore";

export function BattleUILoader() {
  return (
    <FadeInSuspense fallback={<div>Loading...</div>}>
      <BattleUI />
    </FadeInSuspense>
  );
}

export const BattleUI = observer(function BattleUI() {
  const [campaign] = useCampaign();

  return (
    <>
      <ReminderDialog />
      <div className="flex gap-4 flex-col w-full">
        <DescriptionTextArea
          tiptapReadyGate={
            campaign.system?.initiative_type === "linear" ? (
              <LinearBattleUI />
            ) : (
              <GroupBattleUI />
            )
          }
        />
      </div>
    </>
  );
});

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
  const { mutate: updateParticipant } = useUpdateEncounterParticipant();

  const debouncedUpdate = useDebouncedCallback((participant: Participant) => {
    updateParticipant(participant);
  }, 500);
  const [notes, setNotes] = React.useState(participant.notes);

  const activeParticipant = EncounterUtils.activeParticipant(encounter);

  const { selectedParticipantId: dmSelectedCreature } = useEncounterUIStore();

  const selectedId = dmSelectedCreature ?? activeParticipant?.id ?? null;

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
        data-active={participant.id === selectedId}
        className={clsx(className, {
          "opacity-40":
            encounter?.current_round === 0 && !participant.has_surprise,
          "outline-zinc-900 outline": participant.id === selectedId,
        })}
      >
        <BattleCardStatusEffects participant={participant} />
        <BattleCardCreatureName participant={participant} />
        <BattleCardContent>
          <LidndTextInput
            placeholder="Notes"
            className="w-full"
            variant="ghost"
            value={notes ?? ""}
            onChange={(e) => {
              setNotes(e.target.value);
              debouncedUpdate({
                ...participant,
                notes: e.target.value,
              });
            }}
          />
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
        "bg-white w-[300px] shadow-lg flex flex-col justify-between transition-all group",
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

  if (!participant.status_effects?.length) {
    return null;
  }

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
    <span className="flex flex-col gap-2 justify-between items-center py-3 font-bold text-3xl">
      <CardTitle className="text-lg  truncate max-w-full group-hover:opacity-50">
        {ParticipantUtils.name(participant)}
      </CardTitle>
    </span>
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
