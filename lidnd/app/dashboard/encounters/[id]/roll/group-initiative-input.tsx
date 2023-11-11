"use client";

import InitiativeInput from "@/app/dashboard/encounters/[id]/InitiativeInput";
import { CharacterIcon } from "@/app/dashboard/encounters/[id]/character-icon";
import { useEncounterId } from "@/app/dashboard/encounters/hooks";
import { FadePresenceItem } from "@/components/ui/animate/FadePresenceItem";
import { Button } from "@/components/ui/button";
import { EncounterCreature } from "@/server/api/router";
import { api } from "@/trpc/react";
import { AnimatePresence } from "framer-motion";
import { Sword, Zap } from "lucide-react";
import Link from "next/link";

export function GroupInitiativeInput() {
  const id = useEncounterId();
  const { encounterById } = api.useUtils();

  const [encounter, encounterQuery] = api.encounterById.useSuspenseQuery(id);
  const { mutate: startEncounter } = api.startEncounter.useMutation({
    onSettled: async () => {
      return await encounterById.invalidate(id);
    },
  });
  return (
    <AnimatePresence>
      <FadePresenceItem>
        <Link
          href={`surprise`}
          onClick={() => encounter && startEncounter(encounter.id)}
        >
          <Button>
            <Zap />
            Assign surprise
          </Button>
        </Link>
        <PreBattleInputsList>
          {encounter.participants
            .sort(
              (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
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
  return (
    <div className={"flex flex-col gap-2 max-w-2xl mx-auto"}>{children}</div>
  );
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
      className="flex gap-3 items-center justify-between"
    >
      <span className="flex gap-2">
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
