"use client";

import { Button } from "@/components/ui/button";
import { Dices, X, Swords, Users2, Check, Plus, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import React, { createContext, useContext, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { api } from "@/trpc/react";
import type { ParticipantWithData } from "@/server/api/router";
import { EncounterUtils } from "@/utils/encounters";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { isStringMeaningful } from "@/app/[username]/utils";
import { useCampaignId } from "@/app/[username]/[campaign_slug]/campaign_id";
import { useEncounterId } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/encounter-id";
import {
  useStartEncounter,
  useRemoveParticipantFromEncounter,
  useEncounter,
  useUpdateEncounterParticipant,
  useEncounterLink,
} from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/hooks";
import { useCampaign } from "@/app/[username]/[campaign_slug]/hooks";
import { appRoutes } from "@/app/routes";
import { useUser } from "@/app/[username]/user-provider";
import Link from "next/link";
import { makeAutoObservable } from "mobx";
import { useEncounterLinks } from "../link-hooks";

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
      onClick={() =>
        removeCreatureFromEncounter({
          encounter_id: encounter.id,
          participant_id: participant.id,
        })
      }
    >
      <X />
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

export function EncounterReminderInput() {
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
          old
        );
      });
      return previousEncounter;
    },
  });

  if (!encounter) {
    return null;
  }

  return (
    <div className="flex gap-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addReminder({
            encounter_id: encounter.id,
            alert_after_round: alertAfterRound ?? 0,
            reminder: reminder,
          });
        }}
        className="flex gap-3"
      >
        <section className="flex gap-3 items-center shadow-md border p-3">
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
                  : undefined
              )
            }
            placeholder="Alert after round (0 for every)"
            className="w-72"
          />
          <Button type="submit">
            <Plus />
          </Button>
        </section>
        {encounter?.reminders
          .slice()
          .sort((a, b) => a.alert_after_round - b.alert_after_round)
          .map((reminder) => (
            <div
              className="flex gap-1 shadow-md border items-center p-3"
              key={reminder.id}
            >
              <span className="flex-grow">{reminder.reminder}</span>
              <span>after round {reminder.alert_after_round}</span>
              <ButtonWithTooltip
                text="Remove reminder"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  removeReminder({
                    reminder_id: reminder.id,
                    encounter_id: encounter.id,
                  });
                }}
              >
                <X />
              </ButtonWithTooltip>
            </div>
          ))}
      </form>
    </div>
  );
}
