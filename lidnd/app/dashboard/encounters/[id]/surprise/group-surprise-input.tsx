"use client";

import { useEncounterId } from "@/app/dashboard/encounters/hooks";
import { FadePresenceItem } from "@/components/ui/animate/FadePresenceItem";
import { api } from "@/trpc/react";
import { AnimatePresence } from "framer-motion";
import React from "react";
import {
  PreBattleInput,
  PreBattleInputsList,
} from "@/app/dashboard/encounters/[id]/roll/group-initiative-input";
import { Button } from "@/components/ui/button";
import { Swords, Zap } from "lucide-react";
import { useUpdateEncounterParticipant } from "@/app/dashboard/encounters/[id]/hooks";
import Link from "next/link";

export function GroupSurpriseInput() {
  const id = useEncounterId();
  const { encounterById } = api.useUtils();
  const { mutate: updateParticipant } = useUpdateEncounterParticipant();

  const [encounter, encounterQuery] = api.encounterById.useSuspenseQuery(id);
  const { mutate: startEncounter } = api.startEncounter.useMutation({
    onSettled: async () => {
      return await encounterById.invalidate(id);
    },
  });
  return (
    <AnimatePresence>
      <FadePresenceItem className="flex flex-col gap-10 items-center"> 
        <div className="flex justify-between gap-10">
          <Link href={`roll`}>
            <Button variant="outline">Back to initiative</Button>
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
              (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
            )
            .map((participant) => (
              <PreBattleInput key={participant.id} participant={participant}>
                <Button
                  variant={participant.has_surprise ? "default" : "outline"}
                  onClick={() =>
                    updateParticipant({
                      ...participant,
                      has_surprise: !participant.has_surprise,
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
      </FadePresenceItem>
    </AnimatePresence>
  );
}
