"use client";

import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import React, { useState } from "react";
import { motion, useIsPresent } from "framer-motion";
import clsx from "clsx";
import type { Participant, ParticipantWithData } from "@/server/api/router";
import { LidndPopover } from "@/encounters/base-popover";
import { EffectIcon, StatusInput } from "./status-input";
import {
  LinearBattleUI,
  ParentWidthContext,
  StatColumnComponent,
  useParentResizeObserver,
} from "./linear-battle-ui";
import { useCampaign } from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { observer } from "mobx-react-lite";
import { ParticipantUtils } from "@/utils/participants";
import { ParticipantEffectUtils } from "@/utils/participantEffects";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import { ParticipantHealthForm } from "@/encounters/[encounter_index]/creature-health-form";
import { DescriptionTextArea } from "@/encounters/[encounter_index]/description-text-area";
import { GroupBattleUI } from "@/encounters/[encounter_index]/group-battle-ui";
import {
  useEncounter,
  useRemoveParticipantFromEncounter,
  useRemoveStatusEffect,
  useUpdateEncounterParticipant,
} from "@/encounters/[encounter_index]/hooks";
import { useDebouncedCallback } from "use-debounce";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { LidndTextArea } from "@/components/ui/lidnd-text-area";
import { Label } from "@/components/ui/label";
import {
  ReminderInput,
  Reminders,
} from "@/encounters/[encounter_index]/reminders";
import { Grip, MoreHorizontal, PlayIcon, User } from "lucide-react";
import { useEncounterLinks } from "../link-hooks";
import Link from "next/link";
import { imageStyle, InitiativeTracker } from "./battle-bar";
import { EncounterDifficulty } from "./encounter-difficulty";
import { OpponentParticipantForm } from "./participant-upload-form";
import { dragTypes, typedDrag } from "@/app/[username]/utils";
import { useEncounterId } from "@/encounters/[encounter_index]/encounter-id";
import { api } from "@/trpc/react";
import type { StatColumn } from "@/server/api/columns-router";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { useEncounterUIStore } from "@/encounters/[encounter_index]/EncounterUiStore";
import { CreatureStatBlock } from "@/encounters/[encounter_index]/CreatureStatBlock";
import { CreatureUtils } from "@/utils/creatures";
import Image from "next/image";

// TODO: existing creatures for ally/player upload?

export const EncounterBattleUI = observer(function BattleUI() {
  const [campaign] = useCampaign();
  const [encounter] = useEncounter();
  const { rollEncounter } = useEncounterLinks();

  switch (encounter.status) {
    case "prep":
      return (
        <div className="flex flex-col max-h-full overflow-hidden h-full gap-3">
          <div className="flex flex-col w-full">
            <div className="flex gap-2 items-baseline ml-[var(--campaign-nav-width)]">
              <Card className="flex shadow-none w-[800px] items-center justify-between p-3 gap-3 ">
                <EncounterDifficulty />
                <Link href={rollEncounter} className="text-lg">
                  <ButtonWithTooltip text={"Roll initiative"}>
                    <PlayIcon />
                  </ButtonWithTooltip>
                </Link>
              </Card>
              <ReminderInput />
            </div>
          </div>

          <div className="w-full overflow-hidden flex gap-3 h-full">
            <Card className="p-4 overflow-auto w-[700px] h-full">
              <OpponentParticipantForm />
            </Card>
            <EncounterBattlePreview />
          </div>
        </div>
      );
    case "run":
      return (
        <section className="flex flex-col max-h-full min-h-0 h-full">
          <InitiativeTracker />
          <Reminders />
          <div className="flex gap-4 flex-col w-full max-h-full overflow-hidden h-full">
            {/**create space for the overlaid initiative tracker */}
            {encounter.status === "run" && <div className="my-5" />}
            {encounter.description ? (
              <div className="bg-white p-5">
                <DescriptionTextArea />
              </div>
            ) : null}

            {campaign.system?.initiative_type === "linear" ? (
              <LinearBattleUI />
            ) : (
              <GroupBattleUI />
            )}
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

function EncounterBattlePreview() {
  const { data: columns } = api.getColumns.useQuery(useEncounterId());
  const { parentWidth, containerRef } = useParentResizeObserver();
  return (
    <div className="flex flex-col gap-8 max-h-full overflow-hidden w-full h-full">
      <div
        className="flex relative h-full max-h-full overflow-hidden"
        ref={containerRef}
      >
        <ParentWidthContext.Provider value={parentWidth}>
          {columns?.map((c, i) => (
            <StatColumnComponent column={c} index={i} key={c.id}>
              <div className="flex flex-col gap-5 border border-t-0 w-full max-h-full overflow-hidden h-full bg-white">
                <PreviewCardsForColumn column={c} />
              </div>
            </StatColumnComponent>
          ))}
        </ParentWidthContext.Provider>
      </div>
    </div>
  );
}

function BattleCardTools({ participant }: { participant: Participant }) {
  const { mutate: removeParticipant } = useRemoveParticipantFromEncounter();
  const uiStore = useEncounterUIStore();

  return (
    <>
      <Button
        variant="ghost"
        className="z-10 ml-auto cursor-grab"
        onDragStart={(e) => {
          typedDrag.set(e.dataTransfer, dragTypes.participant, participant);
          uiStore.startDraggingBattleCard();
        }}
        draggable
      >
        <Grip />
      </Button>
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
  const participantsInColumn = encounter.participants
    .filter((p) => p.column_id === column.id)
    .sort(ParticipantUtils.sortLinearly);
  return (
    <div className="flex flex-col max-h-full overflow-hidden h-full">
      {participantsInColumn.map((p) => (
        <div
          className="max-h-full h-full flex flex-col overflow-hidden"
          key={p.id}
        >
          <div className="w-full flex gap-2 p-4">
            <CreatureIcon creature={p.creature} size="small" />
            <BattleCardCreatureName participant={p} />
            <BattleCardTools participant={p} />
          </div>

          <div className="w-full h-full max-h-full overflow-hidden">
            <CreatureStatBlock creature={p.creature} />
          </div>
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
} & React.HTMLAttributes<HTMLDivElement>;

export const BattleCard = observer(function BattleCard({
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
    <div className={`relative flex-col gap-6 w-full flex`} ref={ref} {...props}>
      {participant?.minion_count && participant.minion_count > 1 ? (
        <MinionCardStack minionCount={participant.minion_count} />
      ) : null}
      <BattleCardLayout key={participant.id} participant={participant}>
        <div className="flex gap-4 p-5 items-center w-full">
          <BattleCardContent>
            <div className="flex gap-2 items-center w-full justify-between">
              <BattleCardCreatureIcon
                participant={participant}
                className="flex-shrink-0 flex-grow-0"
              />
              <div className="flex flex-col gap-3 w-full ">
                <div className="flex justify-between">
                  <BattleCardCreatureName participant={participant} />
                  <BattleCardTools participant={participant} />
                </div>
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
        <CreatureStatBlock creature={participant.creature} />
      </BattleCardLayout>
    </div>
  );
});

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
        "bg-white h-full shadow-sm w-full flex flex-col transition-all group",
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

export const BattleCardCreatureName = observer(function BattleCardCreatureName({
  participant,
}: BattleCardParticipantProps) {
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
});

export const BattleCardCreatureIcon = observer(function BattleCardCreatureIcon({
  participant,
  className,
}: BattleCardParticipantProps & {
  className?: string;
}) {
  const uiStore = useEncounterUIStore();
  const [error, setError] = useState<boolean>(false);
  return participant.creature_id === "pending" ? (
    <span>Loading</span>
  ) : (
    <div
      className={clsx("relative border-4", className, {
        "opacity-50": !(uiStore.selectedParticipantId === participant.id),
      })}
      style={{ borderColor: ParticipantUtils.iconHexColor(participant) }}
    >
      {error ? (
        <User className="w-36 h-36" />
      ) : (
        <Image
          src={CreatureUtils.awsURL(participant.creature, "icon")}
          alt={participant.creature.name}
          style={imageStyle}
          width={participant.creature.icon_width}
          height={participant.creature.icon_height}
          className="w-36 h-36"
          onError={() => setError(true)}
        />
      )}
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
