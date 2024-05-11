"use client";

import { FadePresenceItem } from "@/components/ui/animate/FadePresenceItem";
import { Button } from "@/components/ui/button";
import { CharacterIcon } from "@/encounters/[id]/character-icon";
import { useEncounterId, useStartEncounter } from "@/encounters/[id]/hooks";
import InitiativeInput from "@/encounters/[id]/InitiativeInput";
import { EncounterCreature } from "@/server/api/router";
import { api } from "@/trpc/react";
import { AnimatePresence } from "framer-motion";
import { Swords, Zap } from "lucide-react";
import Link from "next/link";

export function GroupInitiativeInput() {
  const id = useEncounterId();

  const [encounter, encounterQuery] = api.encounterById.useSuspenseQuery(id);
  const { mutate: startEncounter } = useStartEncounter();
  return (
    <AnimatePresence>
      <FadePresenceItem className="flex flex-col gap-10 items-center">
        <div className="flex justify-between gap-10">
          <Link href={`/encounters/${id}`}>
            <Button variant="ghost">Back to prep</Button>
          </Link>
          <Link href={`surprise`}>
            <Button variant="outline">
              <Zap />
              Assign surprise
            </Button>
          </Link>
          <Link href={`run`} onClick={() => encounter && startEncounter(id)}>
            <Button>
              <Swords />
              Commence the battle
            </Button>
          </Link>
        </div>
        <PreBattleInputsList>
          {encounter.participants
            .sort(
              (a, b) =>
                a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
            )
            .map((participant) => (
              <PreBattleInput key={participant.id} participant={participant}>
                <InitiativeInput participant={participant} />
              </PreBattleInput>
            ))}
        </PreBattleInputsList>
      </FadePresenceItem>
    </AnimatePresence>
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
  participant: EncounterCreature;
}) {
  return (
    <div
      key={participant.id}
      className="flex gap-20 items-center justify-between"
    >
      <span className="flex gap-4 items-center">
        <CharacterIcon
          name={participant.name}
          id={participant.creature_id}
          className={"h-20 object-cover"}
        />
        <span>{participant.name}</span>
      </span>

      {children}
    </div>
  );
}
