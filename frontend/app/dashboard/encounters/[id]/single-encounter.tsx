"use client";

import EncounterCreatureAddForm from "@/app/dashboard/encounters/[id]/creature-add-form";
import { DamageType, ResistanceSelector } from "@/app/dashboard/encounters/[id]/resistance-selector";
import {
  AnimationListItem,
  BattleCard,
} from "@/app/dashboard/encounters/[id]/run/battle-ui";
import {
  useEncounter,
  useEncounterCreatures,
  useStartEncounter,
} from "@/app/dashboard/encounters/api";
import { useEncounterId } from "@/app/dashboard/encounters/hooks";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

export default function SingleEncounter() {
  const { data: encounterParticipants } = useEncounterCreatures();
  const { data: encounter } = useEncounter();
  const { mutate: startEncounter } = useStartEncounter();
  const id = useEncounterId();
  const [damageTypes, setDamageTypes] = useState<DamageType[]>([]);


  return (
    <div className={"flex flex-col items-center gap-10"}>
      {encounter?.started_at ? (
        <Link href={`${id}/run`}>
          <Button>Continue the battle!</Button>
        </Link>
      ) : (
        <Link href={`${id}/run`} onClick={() => startEncounter()}>
          <Button>Commence the battle!</Button>
        </Link>
      )}
      <AnimatePresence>
        <div className={"flex gap-10 overflow-auto justify-center w-full p-5"}>
          {encounterParticipants
            ?.sort((a, b) => a.initiative - b.initiative)
            .map((participant) => (
              <AnimationListItem key={participant.id}>
                <BattleCard creature={participant} />
              </AnimationListItem>
            ))}
        </div>
      </AnimatePresence>
      <EncounterCreatureAddForm
        className={"w-full max-w-xl"}
        formFields={
          <>
            Strategy notes
            <Textarea />
            <div>
              <label htmlFor="resistances">Resistances</label>
              <div className="flex gap-5">
                {damageTypes.map((type) => (
                  <div key={type}>{type}</div>
                ))}
              </div>
            </div>
            <ResistanceSelector value={damageTypes} onChange={setDamageTypes} />
          </>
        }
      />
    </div>
  );
}
