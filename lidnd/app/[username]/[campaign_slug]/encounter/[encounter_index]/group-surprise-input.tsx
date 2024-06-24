"use client";

import { FadePresenceItem } from "@/components/ui/animate/FadePresenceItem";
import { api } from "@/trpc/react";
import { AnimatePresence } from "framer-motion";
import React from "react";
import { Button } from "@/components/ui/button";
import { Swords, Zap } from "lucide-react";
import Link from "next/link";
import { ParticipantUtils } from "@/utils/participants";
import { useEncounterId } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/encounter-id";
import {
  PreBattleInputsList,
  PreBattleInput,
} from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/group-initiative-input";
import { useUpdateEncounterParticipant } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/hooks";

export function GroupSurpriseInput() {
  const id = useEncounterId();
  const { encounterById } = api.useUtils();
  const { mutate: updateParticipant } = useUpdateEncounterParticipant();

  const [encounter] = api.encounterById.useSuspenseQuery(id);
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
            <Button variant="ghost">Back to initiative</Button>
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
                ParticipantUtils.name(a).localeCompare(
                  ParticipantUtils.name(b),
                ) || a.id.localeCompare(b.id),
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
