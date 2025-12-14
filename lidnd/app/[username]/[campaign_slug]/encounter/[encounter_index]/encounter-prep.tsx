"use client";

import { Button } from "@/components/ui/button";
import { Users2, Check, FileText, TrashIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import React, { createContext, useContext, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { api } from "@/trpc/react";
import type { ParticipantWithData } from "@/server/api/router";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { isStringMeaningful } from "@/app/[username]/utils";
import { useEncounterId } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/encounter-id";
import {
  useRemoveParticipantFromEncounter,
  useUpdateEncounterParticipant,
} from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/hooks";
import { useCampaign } from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { appRoutes } from "@/app/routes";
import { useUser } from "@/app/[username]/user-provider";
import { makeAutoObservable } from "mobx";

class EncounterPrepStore {
  selectedeParticipantId: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  setSelectedParticipant = (id: string) => {
    this.selectedeParticipantId = id;
  };
}

const EncounterPrepContext = createContext<EncounterPrepStore | null>(null);
const useEncounterPrepStore = () => {
  const store = useContext(EncounterPrepContext);
  if (!store) {
    throw new Error(
      "useEncounterPrepStore must be used within a EncounterPrepProvider"
    );
  }
  return store;
};

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
        appRoutes.encounter({ campaign, encounter: newEncounter, user })
      ),
  });

  const [encounterName, setEncounterName] = React.useState(
    encounter?.name ?? ""
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

export interface ParticipantCreatureProps {
  participant: ParticipantWithData;
}

export interface RemoveCreatureFromEncounterButtonProps {
  participant: ParticipantWithData;
  moreText?: string;
}

export function RemoveCreatureFromEncounterButton(
  props: RemoveCreatureFromEncounterButtonProps
) {
  const { participant } = props;

  const id = useEncounterId();
  const [encounter] = api.encounterById.useSuspenseQuery(id);
  const { mutate: removeCreatureFromEncounter } =
    useRemoveParticipantFromEncounter();
  return (
    <ButtonWithTooltip
      text="Remove creature"
      variant="ghost"
      className="p-2 text-gray-300"
      onClick={() =>
        removeCreatureFromEncounter({
          encounter_id: encounter.id,
          participant_id: participant.id,
        })
      }
    >
      {props.moreText}
      <TrashIcon className="text-gray-200" />
    </ButtonWithTooltip>
  );
}

export function MonsterParticipantActions(props: ParticipantCreatureProps) {
  const { participant } = props;

  const { setSelectedParticipant } = useEncounterPrepStore();
  const { mutate: updateCreature } = useUpdateEncounterParticipant();
  const { data: settings } = api.settings.useQuery();

  const [status, setStatus] = useState<"idle" | "input">("idle");
  const [minionCount, setMinionCount] = useState<number | null>(
    participant.minion_count
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
        onClick={() => setSelectedParticipant(participant.id)}
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
