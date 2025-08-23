"use client";

import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import React, { useState } from "react";
import { motion, useIsPresent } from "framer-motion";
import clsx from "clsx";
import type { Participant, ParticipantWithData } from "@/server/api/router";
import { LidndPopover } from "@/encounters/base-popover";
import { EffectIcon } from "./status-input";
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
import {
  ReminderInput,
  Reminders,
} from "@/encounters/[encounter_index]/reminders";
import { Grip, MoreHorizontal, User } from "lucide-react";
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
import { EncounterUtils } from "@/utils/encounters";
import { appRoutes } from "@/app/routes";
import { useUser } from "@/app/[username]/user-provider";
import { useEncounterLinks } from "@/encounters/link-hooks";

// TODO: existing creatures for ally/player upload?

export const EncounterBattleUI = observer(function BattleUI() {
  const [campaign] = useCampaign();
  const [encounter] = useEncounter();
  const { rollEncounter } = useEncounterLinks();
  const user = useUser();

  switch (encounter.status) {
    case "prep":
      return (
        <div className="flex flex-col max-h-full overflow-auto h-full">
          <div className="flex flex-col w-full">
            <div className="flex gap-2 justify-evenly items-center p-8 flex-wrap ml-[var(--campaign-nav-width)]">
              <div className="flex items-center gap-1">
                {EncounterUtils.allies(encounter).map((a) => (
                  <CreatureIcon key={a.id} creature={a.creature} size="small" />
                ))}
                <Link href={appRoutes.party({ campaign, user })}>
                  <Button variant="outline">Edit party</Button>
                </Link>
              </div>

              <ReminderInput />

              <Link href={rollEncounter}>
                <Button>Start</Button>
              </Link>
            </div>
          </div>
          <div className="flex max-w-full max-h-full">
            <div className="w-[700px] flex mx-auto justify-center flex-col gap-5">
              <div className="">
                <Card className="shadow-lg  h-[850px] p-3 flex flex-col gap-5">
                  <section className="items-center flex gap-3 flex-col">
                    <EncounterDifficulty />
                  </section>
                  <OpponentParticipantForm />
                </Card>
              </div>
            </div>

            <div className="w-full flex gap-3 h-full p-5">
              <EncounterBattlePreview />
            </div>
          </div>
        </div>
      );
    case "run":
      return (
        <section className="flex flex-col max-h-full min-h-0 h-full">
          <InitiativeTracker />
          <Reminders />
          <div className="flex gap-4 flex-col w-full max-h-full h-full overflow-hidden">
            {/**create space for the overlaid initiative tracker */}
            {encounter.status === "run" && <div className="my-1" />}
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
              <PreviewCardsForColumn column={c} />
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
  const participantsInColumn = EncounterUtils.participantsForColumn(
    encounter,
    column
  );
  const { mutate: removeParticipant } = useRemoveParticipantFromEncounter();

  return (
    <div className="flex flex-col max-h-full overflow-hidden h-full">
      {participantsInColumn.length === 0 ? (
        <div className="">No stat blocks yet</div>
      ) : null}
      {participantsInColumn.map((p) => (
        <div
          className="max-h-full h-full flex flex-col overflow-hidden"
          key={p
            .sort(ParticipantUtils.sortLinearly)
            .map((p) => p.id)
            .join("-")}
        >
          {p.map((p, i) => (
            <div className="w-full flex gap-2 p-4" key={p.id}>
              <CreatureIcon creature={p.creature} size="small" />
              <BattleCardCreatureName participant={p} />
              {i === 0 ? (
                <BattleCardTools participant={p} />
              ) : (
                <LidndPopover
                  trigger={
                    <ButtonWithTooltip
                      text="More"
                      variant="ghost"
                      className="ml-auto"
                    >
                      <MoreHorizontal />
                    </ButtonWithTooltip>
                  }
                  className="ml-auto flex"
                >
                  <Button
                    onClick={() =>
                      removeParticipant({
                        encounter_id: p.encounter_id,
                        participant_id: p.id,
                      })
                    }
                    variant="destructive"
                  >
                    Remove participant
                  </Button>
                </LidndPopover>
              )}
            </div>
          ))}

          {p[0]?.creature ? (
            <div className="w-full h-full max-h-full overflow-hidden">
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
  ref: (ref: HTMLDivElement) => void;
} & React.HTMLAttributes<HTMLDivElement>;

export const ParticipantBattleData = observer(function BattleCard({
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
            <div className="flex gap-2 w-full justify-between">
              <BattleCardCreatureIcon
                participant={participant}
                className="flex-shrink-0 flex-grow-0"
              />
              <div className="flex flex-col gap-3 w-full ">
                <div className="flex justify-between">
                  <BattleCardCreatureName participant={participant} />
                  <BattleCardTools participant={participant} />
                </div>
                <LidndTextArea editor={editor} />
                <ParticipantHealthForm participant={participant} />
              </div>
            </div>
          </BattleCardContent>
        </div>
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
        "bg-white h-full max-h-full overflow-hidden  shadow-sm w-full flex flex-col transition-all group",
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
