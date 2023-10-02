"use client";

import {
  EncounterCreature,
  useEncounterCreatures,
  usePreviousTurn,
  useNextTurn,
  useEncounter,
  useRemoveCreatureFromEncounter,
} from "@/app/dashboard/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon, Timer, X } from "lucide-react";
import { StatBlock } from "@/app/dashboard/[id]/run/stat-block";
import { CreatureHealthForm } from "@/app/dashboard/[id]/run/creature-health-form";
import { CharacterIcon } from "@/app/dashboard/[id]/character-icon";
import EncounterCreatureAddForm from "@/app/dashboard/[id]/creature-add-form";
import InitiativeInput from "@/app/dashboard/[id]/roll/InitiativeInput";
import React from "react";
import { Flipper, Flipped } from "react-flip-toolkit";
import { EncounterTime } from "@/app/dashboard/[id]/run/encounter-time";

export function BattleUI() {
  const { data: encounterParticipants } = useEncounterCreatures();
  const { data: encounter } = useEncounter();
  const { mutate: nextTurn, isLoading: nextTurnLoading } = useNextTurn();
  const { mutate: previousTurn, isLoading: previousTurnLoading } =
    usePreviousTurn();
  const [addingCreature, setAddingCreature] = React.useState(false);

  const activeParticipant = encounterParticipants?.find(
    (creature) => creature.is_active
  );

  const turnsLoading = nextTurnLoading || previousTurnLoading;

  return (
    <div className="flex flex-col gap-5 justify-center items-center relative">
      <div className={"flex absolute top-0 left-0 gap-3 items-center"}>
        <Timer />
        <EncounterTime time={encounter?.started_at ?? undefined} />
      </div>
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
        flipKey={encounterParticipants?.map((creature) => creature.id).join("")}
        className={"flex gap-10 overflow-auto justify-center w-full p-5"}
      >
        {encounterParticipants
          ?.sort((a, b) => a.initiative - b.initiative)
          .map((participant) => (
            <Flipped flipId={participant.id} key={participant.id}>
              <BattleCard creature={participant} />
            </Flipped>
          ))}
        {addingCreature ? (
          <EncounterCreatureAddForm
            className={"w-[400px] absolute top-0 right-0 z-10"}
            onSuccess={() => setAddingCreature(false)}
          >
            <Button variant={"ghost"} onClick={() => setAddingCreature(false)}>
              Cancel
            </Button>
          </EncounterCreatureAddForm>
        ) : null}
      </Flipper>
      <div className="flex flex-col md:hidden">
        <div className="flex justify-center gap-2">
          <Button
            className="w-20"
            disabled={turnsLoading}
            onClick={(e) => {
              e.stopPropagation();
              previousTurn();
            }}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            disabled={turnsLoading}
            className="w-20"
            onClick={(e) => {
              e.stopPropagation();
              nextTurn();
            }}
          >
            <ChevronRightIcon />
          </Button>
        </div>
        {activeParticipant?.id && (
          <StatBlock
            id={activeParticipant.id}
            name={activeParticipant.name}
            key={activeParticipant.id}
          />
        )}
      </div>
      <div className="w-full p-4 md:flex hidden">
        <Button
          disabled={turnsLoading}
          className="w-20"
          onClick={(e) => {
            e.stopPropagation();
            previousTurn();
          }}
        >
          <ChevronLeftIcon />
        </Button>
        {activeParticipant?.id && (
          <StatBlock
            id={activeParticipant.creature_id}
            name={activeParticipant.name}
            key={activeParticipant.id}
          />
        )}
        <Button
          disabled={turnsLoading}
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

  const { mutate: removeCreatureFromEncounter } =
    useRemoveCreatureFromEncounter();

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
        <div
          className={
            "absolute opacity-0 transition-opacity hover:opacity-100 top-0 left-0 h-full w-full border flex justify-center items-center z-10"
          }
        >
          <Button
            variant="destructive"
            className={"absolute top-0 right-0 w-12"}
            onClick={() => removeCreatureFromEncounter(creature.creature_id)}
          >
            <X />
          </Button>
          {creature.hp > 0 ? (
            <InitiativeInput
              creature={creature}
              className={"flex flex-col m-5 p-5 rounded gap-5"}
            />
          ) : null}
        </div>

        <CardHeader>
          <CardTitle>{creature.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <CharacterIcon id={creature.creature_id} name={creature.name} />
        </CardContent>
      </Card>
      <CreatureHealthForm creature={creature} />
    </div>
  );
}
