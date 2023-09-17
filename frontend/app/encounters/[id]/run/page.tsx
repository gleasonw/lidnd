import {
  getEncounterCreatures,
  EncounterCreature,
  previousTurn,
  nextTurn,
  updateEncounterCreature,
} from "@/app/encounters/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { getGoogleDriveImageLink } from "@/app/encounters/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { StatBlock } from "@/app/encounters/[id]/run/stat-block";
import { CreatureHealthForm } from "@/app/encounters/[id]/run/creature-health-form";

export default function Page({ params }: { params: { id: string } }) {
  console.log("render");
  return (
    <div>
      <BattleUI id={params.id} />
    </div>
  );
}

export async function BattleUI({ id }: { id: string }) {
  const creatures = await getEncounterCreatures({ encounter_id: parseInt(id) });

  function getCreaturePercentDamage(creature: EncounterCreature) {
    const missingHp = creature.max_hp - creature.hp;
    return (missingHp / creature.max_hp) * 100;
  }

  const initiativeSortedCreatures = creatures?.sort(
    (a, b) => a.initiative - b.initiative
  );

  async function previous() {
    "use server";
    await previousTurn({ encounter_id: parseInt(id) });
  }

  async function next() {
    "use server";
    await nextTurn({ encounter_id: parseInt(id) });
  }

  async function editCreature(creature: EncounterCreature) {
    "use server";
    await updateEncounterCreature(
      {
        encounter_id: parseInt(id),
        creature_id: creature.id,
      },
      creature
    );
  }

  const activeCreature = initiativeSortedCreatures?.find(
    (creature) => creature.is_active
  );

  return (
    <div className="flex flex-col gap-5 justify-center items-center">
      <div className={"flex gap-10 overflow-auto justify-center w-full p-5"}>
        {initiativeSortedCreatures?.map((creature) => (
          <div
            key={creature.id}
            className={`flex flex-col gap-3 items-center w-40 }`}
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
                className={`absolute bottom-0 left-0 w-full bg-red-500 bg-opacity-50`}
              />
              <CardHeader>
                <CardTitle>{creature.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <Image
                  src={getGoogleDriveImageLink(creature.icon)}
                  alt={creature.name}
                  width={100}
                  height={100}
                />
              </CardContent>
            </Card>
            <CreatureHealthForm creature={creature} edit={editCreature} />
          </div>
        ))}
      </div>
      <div className="flex flex-col justify-between w-full p-4 md:flex-row">
        <form action={previous}>
          <Button className="w-20">
            <ChevronLeftIcon />
          </Button>
        </form>
        {activeCreature?.stat_block && (
          <StatBlock
            url={activeCreature.stat_block}
            name={activeCreature.name}
            key={activeCreature.id}
          />
        )}
        <form action={next}>
          <Button className="w-20">
            <ChevronRightIcon />
          </Button>
        </form>
      </div>
    </div>
  );
}
