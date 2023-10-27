"use client";

import EncounterCreatureAddForm, {
  CustomCreature,
  ExistingCreature,
  ImageUpload,
} from "@/app/dashboard/encounters/[id]/creature-add-form";
import {
  AnimationListItem,
  BattleCard,
} from "@/app/dashboard/encounters/[id]/run/battle-ui";
import {
  useAddCreatureToEncounter,
  useEncounter,
  useEncounterCreatures,
  useRemoveCreatureFromEncounter,
  useStartEncounter,
  useUpdateEncounter,
} from "@/app/dashboard/encounters/api";
import { useEncounterId } from "@/app/dashboard/encounters/hooks";
import { Button } from "@/components/ui/button";
import { AnimatePresence } from "framer-motion";
import { Play, Plus, X } from "lucide-react";
import Link from "next/link";
import { FullCreatureAddForm } from "@/app/dashboard/full-creature-add-form";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import React from "react";
import { sortEncounterCreatures } from "@/app/dashboard/encounters/utils";
import { Spinner } from "@/components/ui/spinner";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function SingleEncounter() {
  const { data: encounterParticipants, isLoading } = useEncounterCreatures();
  const { data: encounter } = useEncounter();
  const { mutate: startEncounter } = useStartEncounter();
  const { mutate: updateEncounter, isPending: isUpdatePending } =
    useUpdateEncounter();
  const id = useEncounterId();
  const [encounterName, setEncounterName] = React.useState(
    encounter?.name ?? ""
  );
const { mutate: removeCreatureFromEncounter } =
    useRemoveCreatureFromEncounter();

  return (
    <div className={"flex flex-col items-center gap-10 relative"}>
      <div className="flex gap-5 items-center justify-between w-full">
        <div className="flex gap-5">
          <Input
            value={encounterName}
            placeholder="Encounter name"
            onChange={(e) => setEncounterName(e.target.value)}
          />
          <LoadingButton
            isLoading={isUpdatePending}
            className={"flex items-center justify-center w-32"}
            onClick={() =>
              updateEncounter({
                ...encounter,
                name: encounterName,
                description: encounter?.description ?? "",
              })
            }
          >
            Save
          </LoadingButton>
        </div>

        {encounter?.started_at ? (
          <Link href={`${id}/run`}>
            <Button>
              <Play />
              Continue the battle!
            </Button>
          </Link>
        ) : (
          <Link href={`${id}/run`} onClick={startEncounter}>
            <Button>
              <Play />
              Commence the battle!
            </Button>
          </Link>
        )}
      </div>

      <AnimatePresence>
        <div className={"flex gap-10 overflow-auto p-5 max-w-full"}>
          {encounterParticipants
            ?.slice()
            .sort(sortEncounterCreatures)
            .map((participant) => (
              <AnimationListItem key={participant.id}>
                <BattleCard creature={participant}>
                  <Button
                    className={"absolute top-0 right-0"}
                    variant="ghost"
                    onClick={() => removeCreatureFromEncounter(participant.id)}
                  >
                    <X />
                  </Button>
                </BattleCard>
              </AnimationListItem>
            ))}
          {encounterParticipants?.length === 0 && (
            <div className="h-56 justify-evenly w-40 gap-0 items-center flex flex-col">
              <h1 className={"text-2xl text-center"}>
                No creatures in this encounter
              </h1>
            </div>
          )}
          {isLoading &&
            Array(5)
              .fill(null)
              .map((_, i) => (
                <Card
                  key={i}
                  className="h-56 justify-evenly w-40 gap-0 items-center flex flex-col animate-pulse"
                />
              ))}
        </div>
      </AnimatePresence>
      <div className={"flex flex-col w-full gap-3"}>
        <div className={"flex flex-wrap w-full justify-center gap-5"}>
          <Collapsible defaultOpen={true} asChild>
            <Card className="max-w-[600px] w-full p-3">
              <CollapsibleTrigger
                className={"w-full p-2 hover:bg-gray-100 transition-all"}
              >
                <CardTitle>Add new creature</CardTitle>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className={"flex flex-col gap-3"}>
                  <FullCreatureAddForm />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Collapsible defaultOpen={true} asChild>
            <Card className={"max-w-[600px] w-full p-3"}>
              <CollapsibleTrigger
                className={"w-full p-2 hover:bg-gray-100 transition-all"}
              >
                <CardTitle>Add existing creature</CardTitle>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className={"flex flex-col gap-3"}>
                  <ExistingCreature />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}


const encounterCRPerCharacter = [
  { level: 1, easy: 0.125, standard: 0.125, hard: 0.25, cap: 1 },
  { level: 2, easy: 0.125, standard: 0.25, hard: 0.5, cap: 3 },
  { level: 3, easy: 0.25, standard: 0.5, hard: 0.75, cap: 4 },
  { level: 4, easy: 0.5, standard: 0.75, hard: 1, cap: 6 },
  { level: 5, easy: 1, standard: 1.5, hard: 2.5, cap: 8 },
  { level: 6, easy: 1.5, standard: 2, hard: 3, cap: 9 },
  { level: 7, easy: 2, standard: 2.5, hard: 3.5, cap: 10 },
  { level: 8, easy: 2.5, standard: 3, hard: 4, cap: 13 },
  { level: 9, easy: 3, standard: 3.5, hard: 4.5, cap: 13 },
  { level: 10, easy: 3.5, standard: 4, hard: 5, cap: 15 },
  { level: 11, easy: 4, standard: 4.5, hard: 5.5, cap: 16 },
  { level: 12, easy: 4.5, standard: 5, hard: 6, cap: 17 },
  { level: 13, easy: 5, standard: 5.5, hard: 6.5, cap: 19 },
  { level: 14, easy: 5.5, standard: 6, hard: 7, cap: 20 },
  { level: 15, easy: 6, standard: 6.5, hard: 7.5, cap: 22 },
  { level: 16, easy: 6.5, standard: 7, hard: 8, cap: 24 },
  { level: 17, easy: 7, standard: 7.5, hard: 8.5, cap: 25 },
  { level: 18, easy: 7.5, standard: 8, hard: 9, cap: 26 },
  { level: 19, easy: 8, standard: 8.5, hard: 9.5, cap: 28 },
  { level: 20, easy: 8.5, standard: 9, hard: 10, cap: 30 },
];
