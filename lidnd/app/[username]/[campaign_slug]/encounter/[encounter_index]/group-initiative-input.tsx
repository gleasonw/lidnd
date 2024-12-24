"use client";
import { Button } from "@/components/ui/button";
import type { ParticipantWithData } from "@/server/api/router";
import { api } from "@/trpc/react";
import { ParticipantUtils } from "@/utils/participants";
import { Swords } from "lucide-react";
import { CreatureIcon } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/character-icon";
import { useEncounterId } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/encounter-id";
import { useStartEncounter } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/hooks";
import InitiativeInput from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/InitiativeInput";
import React from "react";
import { useLidndDialog } from "@/components/ui/lidnd_dialog";
import { EncounterUtils } from "@/utils/encounters";
import * as R from "remeda";
import { CreatureStatBlockImage } from "../original-size-image";

export function GroupInitiativeInput() {
  const id = useEncounterId();
  const { close } = useLidndDialog();

  const [encounter] = api.encounterById.useSuspenseQuery(id);
  const { mutate: startEncounter } = useStartEncounter();

  function start() {
    startEncounter(id);
    close();
  }

  const sortedParticipants = R.sort(
    EncounterUtils.participantsByName(encounter),
    (a, b) => {
      if (ParticipantUtils.isPlayer(a) && !ParticipantUtils.isPlayer(b)) {
        return -1;
      }
      if (!ParticipantUtils.isPlayer(a) && ParticipantUtils.isPlayer(b)) {
        return 1;
      }
      if (ParticipantUtils.name(a) === ParticipantUtils.name(b)) {
        return a.id > b.id ? 1 : -1;
      }
      return ParticipantUtils.name(a).localeCompare(ParticipantUtils.name(b));
    }
  );

  const sortedMonsters = sortedParticipants.filter((p) =>
    ParticipantUtils.isAdversary(p)
  );

  return (
    <div className="grid grid-cols-2">
      {" "}
      <div className="flex flex-col gap-3">
        {sortedMonsters.map((m) => (
          <CreatureStatBlockImage creature={m.creature} />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <PreBattleInputsList>
          {sortedParticipants.map((p) => (
            <PreBattleInput key={p.id} participant={p}>
              <InitiativeInput participant={p} />
            </PreBattleInput>
          ))}
        </PreBattleInputsList>{" "}
        <div className="flex justify-between gap-10">
          <Button onClick={start}>
            <Swords />
            Commence the battle
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PreBattleInputsList({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={"flex flex-col gap-2 max-w-2xl"}>{children}</div>;
}

export function PreBattleInput({
  children,
  participant,
}: {
  children: React.ReactNode;
  participant: ParticipantWithData;
}) {
  const pName = ParticipantUtils.name(participant);
  return (
    <div
      key={participant.id}
      className="flex gap-20 items-center justify-between"
    >
      <span className="flex gap-4 items-center">
        <CreatureIcon creature={participant.creature} size="small" />
        <span>{pName}</span>
      </span>

      {children}
    </div>
  );
}
