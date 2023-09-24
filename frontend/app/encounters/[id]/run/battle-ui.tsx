"use client";

import {
  EncounterCreature,
  useEncounterCreatures,
  useNextTurn,
  usePreviousTurn,
} from "@/app/encounters/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { StatBlock } from "@/app/encounters/[id]/run/stat-block";
import { CreatureHealthForm } from "@/app/encounters/[id]/run/creature-health-form";
import { CharacterIcon } from "@/app/encounters/[id]/character-icon";
import CreatureAddForm from "@/app/encounters/[id]/creature-add-form";
import InitiativeInput from "@/app/encounters/[id]/roll/InitiativeInput";
import React from "react";
import { Flipper, Flipped } from "react-flip-toolkit";

export function BattleUI() {
  const { data: creatures } = useEncounterCreatures();
  const { mutate: nextTurn } = useNextTurn();
  const { mutate: previousTurn } = usePreviousTurn();
  const [addingCreature, setAddingCreature] = React.useState(false);

  const activeCreature = creatures?.find((creature) => creature.is_active);

  return (
    <div className="flex flex-col gap-5 justify-center items-center relative">
      {!addingCreature ? (
        <Button
          variant="outline"
          className={
            "justify-self-center self-center absolute top-0 right-0 z-10"
          }
          onClick={() => setAddingCreature(true)}
        >
          Creature +
        </Button>
      ) : null}
      <Flipper
        flipKey={
          creatures?.map((creature) => creature.id).join("") + "creature-add"
        }
        className={"flex gap-10 overflow-auto justify-center w-full p-5"}
      >
        {creatures?.map((creature) => (
          <Flipped flipId={creature.id} key={creature.id}>
            <BattleCard creature={creature} />
          </Flipped>
        ))}
        {addingCreature ? (
          <Flipped key={"creature-add"} flipId={"creature-add"}>
            <CreatureAddForm
              className={"w-[400px] absolute top-0 right-0 z-10"}
              onSuccess={() => setAddingCreature(false)}
            >
              <Button
                variant={"ghost"}
                onClick={() => setAddingCreature(false)}
              >
                Cancel
              </Button>
            </CreatureAddForm>
          </Flipped>
        ) : null}
      </Flipper>
      <div className="flex flex-col md:hidden">
        <div className="flex justify-center gap-2">
          <Button
            className="w-20"
            onClick={(e) => {
              e.stopPropagation();
              previousTurn();
            }}
          >
            <ChevronLeftIcon />
          </Button>
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
        {activeCreature?.id && (
          <StatBlock
            id={activeCreature.id}
            name={activeCreature.name}
            key={activeCreature.id}
          />
        )}
      </div>
      <div className="w-full p-4 md:flex hidden">
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
    </div>
  );
}

function BattleCard({ creature }: { creature: EncounterCreature }) {
  function getCreaturePercentDamage(creature: EncounterCreature) {
    let missingHp = creature.max_hp - creature.hp;
    missingHp = Math.min(missingHp, creature.max_hp);
    return (missingHp / creature.max_hp) * 100;
  }
  return (
    <div
      key={creature.id}
      className={`flex relative flex-col gap-6 items-center w-40 justify-between }`}
    >
      <Card
        key={creature.id}
        className={`relative h-full ${
          creature.is_active &&
          `outline-4 outline transform scale-110 transition-all select-none`
        }`}
      >
        <div
          style={{ height: `${getCreaturePercentDamage(creature)}%` }}
          className={`absolute rounded bottom-0 left-0 w-full ${
            getCreaturePercentDamage(creature) === 100
              ? "bg-gray-500"
              : "bg-red-500"
          } bg-opacity-50 transition-all`}
        />
        {creature.hp > 0 ? (
          <div
            className={
              "absolute opacity-0 transition-opacity hover:opacity-100 top-0 left-0 h-full w-full border flex justify-center items-center z-10"
            }
          >
            <InitiativeInput
              creature={creature}
              className={"flex flex-col m-5 p-5 rounded gap-5"}
            />
          </div>
        ) : null}

        <CardHeader>
          <CardTitle>{creature.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <CharacterIcon id={creature.id} name={creature.name} />
        </CardContent>
      </Card>
      <CreatureHealthForm creature={creature} />
    </div>
  );
}
