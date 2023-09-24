"use client";

import {
  EncounterCreature,
  useEncounterCreatures,
  useNextTurn,
  usePreviousTurn,
  useUpdateEncounterCreature,
} from "@/app/encounters/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { StatBlock } from "@/app/encounters/[id]/run/stat-block";
import { CreatureHealthForm } from "@/app/encounters/[id]/run/creature-health-form";
import { CharacterIcon } from "@/app/encounters/[id]/character-icon";
import CreatureAddForm from "@/app/encounters/[id]/creature-add-form";

export function BattleUI() {
  const { data: creatures } = useEncounterCreatures();
  const { mutate: nextTurn } = useNextTurn();
  const { mutate: previousTurn } = usePreviousTurn();
  const { mutate: editCreature } = useUpdateEncounterCreature();

  function getCreaturePercentDamage(creature: EncounterCreature) {
    let missingHp = creature.max_hp - creature.hp;
    missingHp = Math.min(missingHp, creature.max_hp);
    return (missingHp / creature.max_hp) * 100;
  }

  const activeCreature = creatures?.find((creature) => creature.is_active);

  return (
    <div className="flex flex-col gap-5 justify-center items-center">
      <div className={"flex gap-10 overflow-auto justify-center w-full p-5"}>
        {creatures?.map((creature) => (
          <div
            key={creature.id}
            className={`flex flex-col gap-3 items-center w-40 justify-between }`}
          >
            {creature.initiative}
            <Card
              key={creature.id}
              className={`relative ${
                creature.is_active &&
                `outline-4 outline-blue-500 outline transform scale-110 transition-all`
              }`}
            >
              <div
                style={{ height: `${getCreaturePercentDamage(creature)}%` }}
                className={`absolute bottom-0 left-0 w-full ${
                  getCreaturePercentDamage(creature) === 100
                    ? "bg-gray-500"
                    : "bg-red-500"
                } bg-opacity-50 transition-all`}
              />
              <CardHeader>
                <CardTitle>{creature.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <CharacterIcon id={creature.id} name={creature.name} />
              </CardContent>
            </Card>
            <CreatureHealthForm creature={creature} />
          </div>
        ))}
      </div>
      <div className="flex flex-col justify-between w-full p-4 md:flex-row">
        <Button
          className="w-20"
          onClick={(e) => {
            e.stopPropagation();
            previousTurn();
          }}
        >
          <ChevronLeftIcon />
        </Button>
        {activeCreature?.id && (
          <StatBlock
            id={activeCreature.id}
            name={activeCreature.name}
            key={activeCreature.id}
          />
        )}
        <Button
          className="w-20"
          onClick={(e) => {
            e.stopPropagation();
            nextTurn();
          }}
        >
          <ChevronRightIcon />
        </Button>
      </div>
      <CreatureAddForm />
    </div>
  );
}
