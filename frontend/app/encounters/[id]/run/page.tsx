import EncounterDetails from "@/app/encounters/components/encounter-details";
import { getEncounterCreatures, getEncounter } from "@/app/encounters/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { getGoogleDriveImageLink } from "@/app/encounters/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Page({ params }: { params: { id: string } }) {
  return (
    <div>
      <EncounterDetails id={params.id} />
      <InitiativeOrder id={params.id} />
      <CreatureTurn id={params.id} />
    </div>
  );
}

export async function InitiativeOrder({ id }: { id: string }) {
  const { creatures } = await getEncounterCreatures(id);

  function getCreaturePercentDamage(creature) {
    const missingHp = creature.max_hp - creature.hp;
    return (missingHp / creature.max_hp) * 100;
  }

  return (
    <div className={"flex gap-10 overflow-auto justify-center w-full p-5"}>
      {creatures
        .map((creature) => (
          <div
            key={creature.id}
            className={"flex flex-col gap-3 items-center w-40"}
          >
            <Card key={creature.id} className={"relative"}>
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
        ))
        .sort((a, b) => a.initiative - b.initiative)}
    </div>
  );
}

export async function CreatureTurn({ id }: { id: string }) {
  const encounter = await getEncounter(id);
  const creatures = await getEncounterCreatures(id);

  const activeCreature = creatures.find(
    (creature) => creature.id === encounter.active_creature_id
  );
  return <div>Hello</div>;
}
