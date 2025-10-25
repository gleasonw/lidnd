"use client";
import { dragTypes, typedDrag } from "@/app/[username]/utils";
import { LidndDialog } from "@/components/ui/lidnd_dialog";
import { ButtonWithTooltip, Tip } from "@/components/ui/tip";
import { Toggle } from "@/components/ui/toggle";
import { HealthMeterOverlay } from "@/encounters/[encounter_index]/battle-ui";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import { useEncounterUIStore } from "@/encounters/[encounter_index]/EncounterUiStore";
import {
  useCycleNextTurn,
  useCyclePreviousTurn,
  useEncounter,
  useUpdateEncounter,
} from "@/encounters/[encounter_index]/hooks";
import InitiativeInput from "@/encounters/[encounter_index]/InitiativeInput";
import type { ParticipantWithData } from "@/server/api/router";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils } from "@/utils/participants";
import clsx from "clsx";
import {
  BookOpen,
  ChevronLeftIcon,
  ChevronRightIcon,
  ListOrdered,
  Pen,
  Plus,
} from "lucide-react";
import { observer } from "mobx-react-lite";
import React, { useState } from "react";
import { OpponentParticipantForm } from "./participant-upload-form";
import Image from "next/image";
import { CreatureUtils } from "@/utils/creatures";
import { EncounterDetails } from "@/encounters/[encounter_index]/EncounterRoundIndicator";

export function ToggleEditingMode() {
  const [encounter] = useEncounter();
  const { mutate: updateEncounter } = useUpdateEncounter();
  return (
    <Toggle
      onClick={(e) =>
        updateEncounter({
          ...encounter,
          is_editing_columns: !encounter?.is_editing_columns,
        })
      }
    >
      {encounter?.is_editing_columns ? (
        <Tip text={"Read-only"}>
          <BookOpen />
        </Tip>
      ) : (
        <Tip text={"Edit columns/add creatures"}>
          <Pen />
        </Tip>
      )}
    </Toggle>
  );
}

export const InitiativeTracker = observer(function InitiativeTracker() {
  const {
    setSelectedParticipantId,
    isEditingInitiative,
    toggleParticipantEdit: toggleEditingInitiative,
  } = useEncounterUIStore();
  const { mutate: cycleNextMutation, isPending: isLoadingNextTurn } =
    useCycleNextTurn();
  const { mutate: cyclePreviousMutation, isPending: isLoadingPreviousTurn } =
    useCyclePreviousTurn();

  function cycleNext() {
    cycleNextMutation({ encounter_id: encounter.id });
    const { newlyActiveParticipant } = EncounterUtils.cycleNextTurn(encounter);
    setSelectedParticipantId(newlyActiveParticipant.id);
  }

  function cyclePrevious() {
    cyclePreviousMutation({ encounter_id: encounter.id });
    const { newlyActiveParticipant } =
      EncounterUtils.cyclePreviousTurn(encounter);
    setSelectedParticipantId(newlyActiveParticipant.id);
  }

  const isTurnLoading = isLoadingNextTurn || isLoadingPreviousTurn;

  const [encounter] = useEncounter();
  const activeIndex = EncounterUtils.activeParticipantIndex(encounter);

  if (encounter.status !== "run") {
    return null;
  }

  return (
    <div
      className={`justify-center flex overflow-visible h-20 flex-shrink-0 z-20 gap-2 w-full bottom-0`}
    >
      <EncounterDetails />
      <ButtonWithTooltip
        className="h-full shadow-lg"
        variant="outline"
        onClick={cyclePrevious}
        disabled={isTurnLoading}
        text="Previous turn"
      >
        <ChevronLeftIcon />
      </ButtonWithTooltip>
      {EncounterUtils.participantsInInitiativeOrder(encounter).map(
        (p, index) => (
          <div className="flex gap-2 flex-col relative h-fit" key={p.id}>
            {ParticipantUtils.isPlayer(p) ? (
              <PlayerCard
                participant={p}
                index={index}
                activeIndex={activeIndex}
              />
            ) : (
              <GMCreatureCard
                participant={p}
                index={index}
                activeIndex={activeIndex}
              />
            )}
            {isEditingInitiative ? (
              <InitiativeInput
                className="absolute top-0 left-0 "
                participant={p}
              />
            ) : null}
          </div>
        )
      )}

      <ButtonWithTooltip
        className="h-full shadow-lg flex items-center"
        onClick={cycleNext}
        disabled={isTurnLoading}
        text="Next turn"
      >
        <ChevronRightIcon />
      </ButtonWithTooltip>
      <LidndDialog
        title={"Add monster"}
        content={<OpponentParticipantForm />}
        trigger={
          <ButtonWithTooltip
            variant="ghost"
            className="self-stretch h-full flex"
            text="Add monster"
          >
            <Plus />
          </ButtonWithTooltip>
        }
      />
      <ButtonWithTooltip
        variant="ghost"
        className="self-stretch h-full flex"
        text="Edit initiative and columns"
        onClick={() => toggleEditingInitiative()}
      >
        <ListOrdered />
      </ButtonWithTooltip>
    </div>
  );
});

type CardProps = {
  children?: React.ReactNode;
  index: number;
  activeIndex: number;
  participant: ParticipantWithData;
  overrideIcon?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

export const imageStyle = { objectFit: "contain" } as const;

export function GMCreatureCard(props: CardProps) {
  const uiStore = useEncounterUIStore();
  const [imageError, setImageError] = useState(false);
  return (
    <TopBarParticipantCard
      onClick={() => uiStore.setSelectedParticipantId(props.participant.id)}
      draggable
      onDragStart={(e) =>
        typedDrag.set(e.dataTransfer, dragTypes.participant, props.participant)
      }
      overrideIcon={
        imageError ? (
          <span className="p-3 font-bold">
            {ParticipantUtils.initials(props.participant)}
          </span>
        ) : (
          <Image
            src={CreatureUtils.awsURL(props.participant.creature, "icon")}
            alt={props.participant.creature.name}
            style={imageStyle}
            width={props.participant.creature.icon_width}
            height={props.participant.creature.icon_height}
            onError={() => setImageError(true)}
          />
        )
      }
      {...props}
    >
      <HealthMeterOverlay participant={props.participant} />
    </TopBarParticipantCard>
  );
}

export function PlayerCard(props: CardProps) {
  return (
    <TopBarParticipantCard
      {...props}
      overrideIcon={
        <Image
          src={CreatureUtils.awsURL(props.participant.creature, "icon")}
          alt={props.participant.creature.name}
          style={imageStyle}
          width={props.participant.creature.icon_width}
          height={props.participant.creature.icon_height}
        />
      }
    />
  );
}

function TopBarParticipantCard({
  participant,
  index,
  activeIndex,
  children,
  overrideIcon,
  ...props
}: CardProps) {
  return (
    <div
      className={clsx(
        "w-auto border-4 flex justify-center items-center transition-all max-h-full overflow-hidden max-w-[200px]",
        participant.is_active ? "h-20" : "h-14",
        index < activeIndex
          ? "opacity-60 hover:opacity-100"
          : "hover:opacity-60"
      )}
      style={{ borderColor: ParticipantUtils.iconHexColor(participant) }}
      {...props}
    >
      {children}
      {overrideIcon ?? (
        <CreatureIcon creature={participant.creature} size="small2" />
      )}
    </div>
  );
}
