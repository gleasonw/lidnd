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
import { EncounterUtils } from "@/utils/encounters";
import * as R from "remeda";
import { Card } from "@/components/ui/card";
import { useEncounterLinks } from "@/encounters/link-hooks";
import { useRouter } from "next/navigation";
import { CreatureStatBlock } from "@/encounters/[encounter_index]/CreatureStatBlock";

export default function RollPage() {
  const id = useEncounterId();
  const [encounter] = api.encounterById.useSuspenseQuery(id);
  const { mutate: startEncounter } = useStartEncounter();
  const refMap = React.useRef(new Map<string, HTMLDivElement>());
  const { encounter: encounterLink } = useEncounterLinks();
  const router = useRouter();

  function start() {
    startEncounter(id);
    router.push(encounterLink);
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
    <Card className="grid grid-cols-2 h-full p-5">
      {" "}
      <div className="flex flex-col gap-3 overflow-auto">
        {sortedMonsters.map((m) => (
          <CreatureStatBlock
            creature={m.creature}
            key={m.id}
            ref={(el) => {
              if (el && !refMap.current.has(m.id)) {
                refMap.current.set(m.id, el);
              }

              return () => {
                refMap.current.delete(m.id);
              };
            }}
          />
        ))}
      </div>
      <div className="flex flex-col gap-5">
        <PreBattleInputsList>
          {sortedParticipants.map((p) => (
            <PreBattleInput key={p.id} participant={p}>
              <InitiativeInput
                participant={p}
                inputProps={{
                  onFocus: () => {
                    const statBlockRef = refMap.current.get(p.id);
                    if (statBlockRef) {
                      statBlockRef.scrollIntoView({ behavior: "smooth" });
                    }
                  },
                }}
              />
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
    </Card>
  );
}

export function PreBattleInputsList({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={"flex flex-col gap-5 max-w-2xl"}>{children}</div>;
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
    <div key={participant.id} className="flex gap-5">
      {children}
      <span className="flex gap-4 items-end">
        <CreatureIcon creature={participant.creature} size="small" />
        <span>{pName}</span>
      </span>
    </div>
  );
}
