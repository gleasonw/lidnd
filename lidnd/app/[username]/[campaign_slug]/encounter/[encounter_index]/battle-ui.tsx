"use client";

import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import React from "react";
import { motion, useIsPresent } from "framer-motion";
import clsx from "clsx";
import type { Participant, ParticipantWithData } from "@/server/api/router";
import { LidndPopover } from "@/encounters/base-popover";
import { EffectIcon, StatusInput } from "./status-input";
import { LinearBattleUI } from "./linear-battle-ui";
import { useCampaign } from "@/app/[username]/[campaign_slug]/hooks";
import { observer } from "mobx-react-lite";
import { ParticipantUtils } from "@/utils/participants";
import { ParticipantEffectUtils } from "@/utils/participantEffects";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import { ParticipantHealthForm } from "@/encounters/[encounter_index]/creature-health-form";
import { DescriptionTextArea } from "@/encounters/[encounter_index]/description-text-area";
import { GroupBattleUI } from "@/encounters/[encounter_index]/group-battle-ui";
import {
  useEncounter,
  useRemoveStatusEffect,
  useUpdateEncounterParticipant,
} from "@/encounters/[encounter_index]/hooks";
import { useDebouncedCallback } from "use-debounce";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { LidndTextArea } from "@/components/ui/lidnd-text-area";
import { CreatureStatBlockImage } from "@/encounters/original-size-image";
import { Label } from "@/components/ui/label";
import { Reminders } from "@/encounters/[encounter_index]/reminders";
import { useEncounterUIStore } from "./EncounterUiStore";

export const BattleUI = observer(function BattleUI() {
  const [campaign] = useCampaign();
  const [encounter] = useEncounter();

  return (
    <>
      <Reminders />
      <div className="flex gap-4 flex-col w-full max-h-full overflow-auto h-full">
        {/**create space for the overlaid initiative tracker */}
        {encounter.status === "run" && <div className="my-5" />}
        <div className="bg-white p-5">
          <DescriptionTextArea />
        </div>
        {campaign.system?.initiative_type === "linear" ? (
          <LinearBattleUI />
        ) : (
          <GroupBattleUI />
        )}
      </div>
    </>
  );
});

export type BattleCardProps = {
  participant: ParticipantWithData;
  children?: React.ReactNode;
  className?: string;
  isSelected?: boolean;
  extraHeaderButtons?: React.ReactNode;
  ref: (ref: HTMLDivElement) => void;
} & React.HTMLAttributes<HTMLDivElement>;

export function BattleCard({
  participant,
  extraHeaderButtons,
  ref,
  ...props
}: BattleCardProps) {
  const { mutate: updateParticipant } = useUpdateEncounterParticipant();

  const debouncedUpdate = useDebouncedCallback((participant: Participant) => {
    updateParticipant(participant);
  }, 500);

  const configuredPlaceholder = Placeholder.configure({
    placeholder: "Monster notes",
  });

  const { mutate: removeStatusEffect } = useRemoveStatusEffect();

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
    <div
      className={`relative flex-col gap-6 items-center justify-between flex `}
      ref={ref}
      {...props}
    >
      {participant?.minion_count && participant.minion_count > 1 ? (
        <MinionCardStack minionCount={participant.minion_count} />
      ) : null}
      <BattleCardLayout key={participant.id} participant={participant}>
        <div className="absolute top-2 right-2 flex gap-2 items-center">
          {extraHeaderButtons}
        </div>
        <div className="flex gap-4 p-5 items-center w-full">
          <BattleCardContent>
            <div className="flex gap-2 items-center w-full justify-between">
              <BattleCardCreatureIcon
                participant={participant}
                className="flex-shrink-0 flex-grow-0"
              />
              <div className="flex flex-col gap-3 w-full">
                <BattleCardCreatureName participant={participant} />
                <div className="flex flex-wrap gap-3 items-center">
                  {participant.status_effects?.map((se) => (
                    <LidndPopover
                      key={se.id}
                      className="flex flex-col gap-5 items-center"
                      trigger={
                        <Label
                          className={`flex items-center gap-2 hover:bg-gray-100 hover:cursor-pointer`}
                        >
                          <span className="mr-auto flex gap-2 items-center">
                            <EffectIcon effect={se.effect} />
                            {ParticipantEffectUtils.name(se)}
                          </span>
                          {!!se.save_ends_dc && (
                            <span>({se.save_ends_dc})</span>
                          )}
                        </Label>
                      }
                    >
                      {ParticipantEffectUtils.description(se)}
                      <Button
                        onClick={() => removeStatusEffect(se)}
                        variant="ghost"
                        className="text-red-500"
                      >
                        Remove
                      </Button>
                    </LidndPopover>
                  ))}
                  <StatusInput participant={participant} />
                </div>
                <LidndTextArea editor={editor} />
              </div>
            </div>

            <ParticipantHealthForm participant={participant} />
          </BattleCardContent>
        </div>
        <CreatureStatBlockImage creature={participant.creature} />
      </BattleCardLayout>
    </div>
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
  const { selectedParticipantId } = useEncounterUIStore();
  return (
    <Card
      className={clsx(
        "bg-white shadow-sm border-none flex flex-col justify-between transition-all group",
        {
          "shadow-lg shadow-red-800":
            !ParticipantUtils.isFriendly(participant) && participant.is_active,
        },
        {
          "shadow-lg shadow-blue-800":
            ParticipantUtils.isFriendly(participant) && participant.is_active,
        },
        { outline: selectedParticipantId === participant.id },
        className,
      )}
      style={{ outlineColor: ParticipantUtils.iconHexColor(participant) }}
      {...props}
    >
      {children}
    </Card>
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

export function BattleCardCreatureName({
  participant,
}: BattleCardParticipantProps) {
  // todo: maybe at some point just allow a color picker and save previous values
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
  const labelColors = [...pastelLabels, ...solidColors];
  const { mutate: updateParticipant } = useUpdateEncounterParticipant();
  return (
    <span className="flex gap-2 items-center font-bold">
      <CardTitle className="text-xl  truncate max-w-full">
        {ParticipantUtils.name(participant)}
      </CardTitle>
      <LidndPopover
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
                  hex_color: color === participant.hex_color ? null : color,
                });
              }}
            />
          ))}
        </div>
      </LidndPopover>
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
        size="small2"
        objectFit="contain"
      />
    </div>
  );
}

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
