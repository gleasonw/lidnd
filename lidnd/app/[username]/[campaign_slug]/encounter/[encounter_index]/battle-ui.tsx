"use client";

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import React from "react";
import { motion, useIsPresent } from "framer-motion";
import clsx from "clsx";
import { api } from "@/trpc/react";
import type { Participant, ParticipantWithData } from "@/server/api/router";
import { BasePopover } from "@/encounters/base-popover";
import { EffectIcon, StatusInput } from "./status-input";
import { LinearBattleUI } from "./linear-battle-ui";
import { useCampaign } from "@/app/[username]/[campaign_slug]/hooks";
import { observer } from "mobx-react-lite";
import { ParticipantUtils } from "@/utils/participants";
import { ParticipantEffectUtils } from "@/utils/participantEffects";
import { FadeInSuspense } from "@/components/ui/fade-in-suspense";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import { ParticipantHealthForm } from "@/encounters/[encounter_index]/creature-health-form";
import { DescriptionTextArea } from "@/encounters/[encounter_index]/description-text-area";
import { useEncounterId } from "@/encounters/[encounter_index]/encounter-id";
import { GroupBattleUI } from "@/encounters/[encounter_index]/group-battle-ui";
import {
  useRemoveStatusEffect,
  useUpdateEncounterParticipant,
} from "@/encounters/[encounter_index]/hooks";
import { ReminderDialog } from "@/encounters/[encounter_index]/reminder-dialog";
import { useDebouncedCallback } from "use-debounce";
import { EncounterUtils } from "@/utils/encounters";
import { useEncounterUIStore } from "@/encounters/[encounter_index]/EncounterUiStore";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { LidndTextArea } from "@/components/ui/lidnd-text-area";

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
      <div className="flex gap-8 flex-col w-full">
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
  battleCardExtraContent?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

export function BattleCard({
  participant,
  battleCardExtraContent,
  ...props
}: BattleCardProps) {
  const id = useEncounterId();
  const [encounter] = api.encounterById.useSuspenseQuery(id);
  const { mutate: updateParticipant } = useUpdateEncounterParticipant();

  const debouncedUpdate = useDebouncedCallback((participant: Participant) => {
    updateParticipant(participant);
  }, 500);

  const configuredPlaceholder = Placeholder.configure({
    placeholder: "Monster notes",
  });

  const editor = useEditor({
    extensions: [StarterKit, configuredPlaceholder],
    content: participant.notes,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      debouncedUpdate({ ...participant, notes: content });
    },
  });

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
      >
        <BattleCardStatusEffects participant={participant} />
        <BattleCardCreatureName participant={participant} />
        <BattleCardContent>
          <LidndTextArea editor={editor} />
          <div className="flex w-full gap-2 md:gap-6 justify-center h-36">
            <BattleCardCreatureIcon
              participant={participant}
              className="max-h-full max-w-full"
            />
            <BattleCardHealthAndStatus participant={participant} />
          </div>
        </BattleCardContent>
        {battleCardExtraContent}
      </BattleCardLayout>
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
        "bg-white shadow-lg flex flex-col justify-between transition-all group",
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
    <CardContent
      className={clsx("flex flex-col gap-4 px-3 items-center", className)}
    >
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
            <button>
              <EffectIcon effect={se.effect} />
            </button>
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
  const labelColors = [
    "#FF4D4F", // Red
    "#FA8C16", // Orange
    "#FFEC3D", // Yellow
    "#52C41A", // Green
    "#13C2C2", // Teal
    "#1890FF", // Blue
    "#722ED1", // Purple
    "#EB2F96", // Pink
    "#36CFC9", // Cyan
    "#A0D911", // Lime
    "#FAAD14", // Gold
    "#EB2F96", // Magenta
    "#8C8C8C", // Gray
    "#40A9FF", // Light Blue
    "#73D13D", // Light Green
  ];
  const { mutate: updateParticipant } = useUpdateEncounterParticipant();
  return (
    <span className="flex gap-2 justify-center items-center py-3 font-bold text-4xl">
      <CardTitle className="text-2xl  truncate max-w-full">
        {ParticipantUtils.name(participant)}
      </CardTitle>
      <BasePopover
        trigger={
          <Button
            style={{
              backgroundColor: ParticipantUtils.iconHexColor(participant),
            }}
            variant="ghost"
          />
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
                  hex_color: color,
                });
              }}
            />
          ))}
        </div>
      </BasePopover>
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
      <CreatureIcon
        creature={participant.creature}
        size="medium"
        objectFit="contain"
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
