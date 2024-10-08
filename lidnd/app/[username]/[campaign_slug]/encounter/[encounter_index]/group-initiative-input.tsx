"use client";
import * as R from "remeda";
import { Button } from "@/components/ui/button";
import type { ParticipantWithData } from "@/server/api/router";
import { api } from "@/trpc/react";
import { ParticipantUtils } from "@/utils/participants";
import { Swords, Zap } from "lucide-react";
import { CreatureIcon } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/character-icon";
import { useEncounterId } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/encounter-id";
import {
  useStartEncounter,
  useUpdateEncounterParticipant,
} from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/hooks";
import InitiativeInput from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/InitiativeInput";
import React from "react";
import { useLidndDialog } from "@/components/ui/lidnd_dialog";

export function GroupInitiativeInput() {
  const id = useEncounterId();
  const [inputState, setInputState] = React.useState<"surprise" | "initiative">(
    "initiative",
  );
  const { close } = useLidndDialog();

  const [encounter] = api.encounterById.useSuspenseQuery(id);
  const { mutate: startEncounter } = useStartEncounter();
  const { mutate: updateParticipant } = useUpdateEncounterParticipant();

  const sortedParticipants = R.sort(encounter.participants, (a, b) =>
    a.id > b.id ? 1 : -1,
  );

  function start() {
    startEncounter(id);
    close();
  }

  if (inputState === "surprise") {
    return (
      <div>
        <PreBattleInputsList>
          {sortedParticipants.map((p) => (
            <PreBattleInput key={p.id} participant={p}>
              <Button
                variant={p.has_surprise ? "default" : "outline"}
                onClick={() =>
                  updateParticipant({
                    ...p,
                    has_surprise: !p.has_surprise,
                  })
                }
                className="flex gap-5"
              >
                <Zap />
                Has surprise
              </Button>
            </PreBattleInput>
          ))}
        </PreBattleInputsList>
        <div className="flex justify-between gap-10">
          <Button variant="ghost" onClick={() => setInputState("initiative")}>
            Back to initiative
          </Button>
          <Button onClick={start}>
            <Swords />
            Commence the battle
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PreBattleInputsList>
        {sortedParticipants.map((p) => (
          <PreBattleInput key={p.id} participant={p}>
            <InitiativeInput participant={p} />
          </PreBattleInput>
        ))}
      </PreBattleInputsList>
      <div className="flex justify-between gap-10">
        <Button variant="outline" onClick={() => setInputState("surprise")}>
          <Zap />
          Assign surprise
        </Button>
        <Button onClick={start}>
          <Swords />
          Commence the battle
        </Button>
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
