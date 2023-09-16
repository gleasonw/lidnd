import EncounterDetails from "@/app/encounters/components/encounter-details";
import {
  getEncounterCreatures,
  getEncounter,
  EncounterCreature,
} from "@/app/encounters/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { getGoogleDriveImageLink } from "@/app/encounters/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

export default function Page({ params }: { params: { id: string } }) {
  return (
    <div>
      <EncounterDetails id={params.id} />
      <BattleUI id={params.id} />
    </div>
  );
}

export async function BattleUI({ id }: { id: string }) {
  const encounter = await getEncounter({ encounter_id: parseInt(id) });
  const creatures = await getEncounterCreatures({ encounter_id: parseInt(id) });

  function getCreaturePercentDamage(creature: EncounterCreature) {
    const missingHp = creature.max_hp - creature.hp;
    return (missingHp / creature.max_hp) * 100;
  }

  const activeCreature = creatures?.find(
    (creature) => creature.id === encounter?.active_creature_id
  );

  const initiativeSortedCreatures = creatures?.sort(
    (a, b) => b.initiative - a.initiative
  );

  return (
    <div className="flex flex-col gap-5 justify-center items-center">
      <div className={"flex gap-10 overflow-auto justify-center w-full p-5"}>
        {initiativeSortedCreatures?.map((creature) => (
          <div
            key={creature.id}
            className={`flex flex-col gap-3 items-center w-40 }`}
          >
            <Card
              key={creature.id}
              className={`relative ${
                creature.id === encounter?.active_creature_id &&
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
            <form className={"flex gap-2 flex-col"}>
              <Input placeholder="Modify HP" type="text" />
              <Button variant="default" className={"bg-red-700"}>
                Damage
              </Button>
              <Button variant="default" className={"bg-green-700"}>
                Heal
              </Button>
            </form>
          </div>
        ))}
      </div>
      <div className="flex flex-col justify-between w-full p-4 md:flex-row">
        <Button className="w-20">
          <ChevronLeftIcon />
        </Button>
        {activeCreature?.stat_block && (
          <Image
            src={getGoogleDriveImageLink(activeCreature?.stat_block)}
            alt={"stat block for " + activeCreature?.name}
            height={600}
            width={600}
          />
        )}
        <Button className="w-20">
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}
