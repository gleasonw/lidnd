"use client";

import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import React, { useEffect } from "react";
import { motion, useIsPresent } from "framer-motion";
import clsx from "clsx";
import type { Participant, ParticipantWithData } from "@/server/api/router";
import { LidndPopover } from "@/encounters/base-popover";
import { EffectIcon, StatusInput } from "./status-input";
import {
  CreateNewColumnButton,
  LinearBattleUI,
  ParentWidthContext,
  StatColumnComponent,
  useParentResizeObserver,
} from "./linear-battle-ui";
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
  useRemoveParticipantFromEncounter,
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
import { EncounterUtils } from "@/utils/encounters";
import { Grip, Play, SidebarClose, SidebarOpen, Trash, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { CreatureUtils } from "@/utils/creatures";
import Image from "next/image";
import type { ColumnWithParticipants } from "@/utils/stat-columns";
import { useEncounterLinks } from "../link-hooks";
import Link from "next/link";
import { InitiativeTracker } from "./battle-bar";
import { EncounterDifficulty } from "./encounter-difficulty";
import {
  AllyParticipantForm,
  OpponentParticipantForm,
} from "./participant-upload-form";
import { dragTypes, typedDrag } from "@/app/[username]/utils";

// TODO: split out layouts/encounter ui into routes, by status (prep, run, roll)
// redirect to proper page based on status?
// TODO: fix forms (no ally/player switch on monster upload, for instance)
// TODO: collapse allies by default, show on toggle

export const EncounterBattleUI = observer(function BattleUI() {
  const [campaign] = useCampaign();
  const [encounter] = useEncounter();

  switch (encounter.status) {
    case "prep":
      return (
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex flex-col gap-3 py-5 w-full items-center">
            <div className="flex w-full gap-5">
              <Card className="flex items-center justify-center">
                <EncounterDifficulty />{" "}
              </Card>
              <Card className="min-h-[100px] w-full flex p-3">
                <DescriptionTextArea />
              </Card>
            </div>
          </div>
          <div className="grid grid-cols-[auto_1fr_auto] gap-5 max-h-full h-full overflow-hidden">
            <AlliesSidebar />
            <EncounterBattlePreview />
            <ParticipantsContainer
              role="monsters"
              extra={<OpponentParticipantForm />}
            />
          </div>
        </div>
      );
    case "run":
      return (
        <section className="flex flex-col overflow-y-auto max-h-full min-h-0 h-full">
          <InitiativeTracker />
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
        </section>
      );
    default: {
      const _: never = encounter.status;
      throw new Error(`Unhandled case: ${encounter.status}`);
    }
  }
});

const ALLIES_SIDEBAR_KEY = "alliesSidebarExpanded";

function AlliesSidebar() {
  const [encounter] = useEncounter();
  const [expanded, setExpanded] = React.useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    const savedState = localStorage.getItem(ALLIES_SIDEBAR_KEY);
    return savedState === "true";
  });

  useEffect(() => {
    localStorage.setItem(ALLIES_SIDEBAR_KEY, expanded.toString());
  }, [expanded]);

  const allies = EncounterUtils.allies(encounter);

  return (
    <ParticipantsContainer
      role="allies"
      extra={expanded ? <AllyParticipantForm /> : null}
      className={`${!expanded && "w-[80px]"}`}
    >
      <Button onClick={() => setExpanded(!expanded)} variant="ghost">
        {expanded ? <SidebarClose /> : <SidebarOpen />}
      </Button>

      {expanded ? (
        allies.length === 0 ? (
          <ParticipantBadgeWrapper role="allies">
            No allies
          </ParticipantBadgeWrapper>
        ) : (
          allies.map((p) => <ParticipantBadge key={p.id} participant={p} />)
        )
      ) : (
        <div className="flex items-center flex-col gap-2 justify-center">
          {allies.map((p) => (
            <CreatureIcon key={p.id} creature={p.creature} size="small" />
          ))}
        </div>
      )}
    </ParticipantsContainer>
  );
}

function EncounterBattlePreview() {
  const [encounter] = useEncounter();
  const { rollEncounter } = useEncounterLinks();
  const { parentWidth, containerRef } = useParentResizeObserver();
  return (
    <Card className="p-3 flex flex-col gap-8 max-h-full overflow-hidden">
      <div className="flex w-full itmes-center justify-center">
        <Link title={"Roll initiative"} href={rollEncounter}>
          <Button className=" text-lg h-full w-full mx-auto max-w-sm flex gap-3">
            Roll initiative
            <Play />
          </Button>
        </Link>
        <div>
          <CreateNewColumnButton />
        </div>
      </div>

      <div
        className="flex relative h-full max-h-full overflow-hidden"
        ref={containerRef}
      >
        <ParentWidthContext.Provider value={parentWidth}>
          {encounter.columns.map((c, i) => (
            <StatColumnComponent column={c} index={i} key={c.id}>
              <PreviewCardsForColumn column={c} />
            </StatColumnComponent>
          ))}
        </ParentWidthContext.Provider>
      </div>
    </Card>
  );
}

function PreviewCardsForColumn({ column }: { column: ColumnWithParticipants }) {
  const participantsInColumn = column.participants.sort(
    ParticipantUtils.sortLinearly
  );
  const { mutate: removeParticipant } = useRemoveParticipantFromEncounter();
  return (
    <div className="flex flex-col max-h-full overflow-hidden ">
      {participantsInColumn.map((p) => (
        <div className="max-h-full flex flex-col overflow-hidden" key={p.id}>
          <div className="w-full flex gap-2 p-4">
            <CreatureIcon creature={p.creature} size="small" />
            <BattleCardCreatureName participant={p} />
            <Button
              onClick={() =>
                removeParticipant({
                  encounter_id: column.encounter_id,
                  participant_id: p.id,
                })
              }
              variant="ghost"
            >
              <Trash />
            </Button>
            <Button
              variant="ghost"
              className="z-10 ml-auto"
              onDragStart={(e) => {
                typedDrag.set(e.dataTransfer, dragTypes.participant, p);
              }}
              draggable
            >
              <Grip />
            </Button>
          </div>

          {/* required for the image to respect the bounds... goodness */}
          <div className="w-full h-full max-h-full overflow-hidden">
            <Image
              quality={100}
              style={{ objectFit: "contain" }}
              className="max-h-full"
              src={CreatureUtils.awsURL(p.creature, "stat_block")}
              alt={p.creature.name}
              width={p.creature.stat_block_width}
              height={p.creature.stat_block_height}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

//TODO: this isn't a participants container anymore, more just a sidebar for allies/monsters uploads
function ParticipantsContainer({
  children,
  extra,
  role,
  className,
}: {
  children?: React.ReactNode;
  extra: React.ReactNode;
  role: "allies" | "monsters";
  className?: string;
}) {
  return (
    <div className={clsx("flex h-full items-baseline w-[500px]", className)}>
      <Card
        className={clsx(
          `flex flex-col gap-4 w-full p-3 items-center shadow-sm h-full`
        )}
      >
        <CardTitle>{role === "allies" ? "Allies" : "Monsters"}</CardTitle>
        <div className="flex flex-wrap gap-2 items-center justify-center">
          {children}
        </div>
        <Separator />
        {extra}
      </Card>
    </div>
  );
}

function ParticipantBadge({
  participant,
}: {
  participant: {
    id: string;
    creature: {
      id: string;
      name: string;
      icon_width: number;
      icon_height: number;
      is_player: boolean;
    };
  };
}) {
  const { mutate: removeParticipant } = useRemoveParticipantFromEncounter();
  const [encounter] = useEncounter();

  return (
    <ParticipantBadgeWrapper
      role={ParticipantUtils.isPlayer(participant) ? "allies" : "monsters"}
    >
      <div>
        <CreatureIcon creature={participant.creature} />
      </div>
      <div className="col-span-2 flex truncate">
        {participant.creature.name}
      </div>
      <Button
        variant="ghost"
        className="p-1"
        onClick={() =>
          removeParticipant({
            participant_id: participant.id,
            encounter_id: encounter.id,
          })
        }
      >
        <X />
      </Button>
    </ParticipantBadgeWrapper>
  );
}

function ParticipantBadgeWrapper({
  children,
  role,
}: {
  children: React.ReactNode;
  role: "allies" | "monsters";
}) {
  return (
    <div
      className={`flex gap-2 border rounded-full items-center justify-between px-2 h-12 max-w-[200px] ${
        role === "allies" ? "bg-blue-100" : "bg-red-100"
      }`}
    >
      {children}
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

export function BattleCardLayout({
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
        className
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
