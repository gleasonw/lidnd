"use client";

import Link from "next/link";
import {
  useCreateEncounter,
  useDeleteEncounter,
  useEncounterCreatures,
  useEncounters,
} from "@/app/encounters/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import React from "react";
import { Card } from "@/components/ui/card";
import { CharacterIcon } from "@/app/encounters/[id]/character-icon";
import { Flipper, Flipped } from "react-flip-toolkit";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/hooks";

export default function Encounters() {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: encounters, isLoading } = useEncounters();
  const { mutate: createDefaultEncounter } = useCreateEncounter((encounter) =>
    router.push(`/encounters/${encounter.id}`)
  );
  const { mutate: deleteEncounter } = useDeleteEncounter();
  const [encounter, setEncounter] = React.useState({
    name: "",
    description: "",
  });

  return (
    <div className="flex flex-col gap-10">
      <section>
        <p className={"text-center"}>
          Welcome, <span className={"font-bold"}>{user?.username}</span>, to
          LiDnD!
        </p>
      </section>
      <Card className="max-w-5xl p-5 m-auto w-full h-full max-h-60">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createDefaultEncounter(encounter);
          }}
          className="flex flex-col gap-10"
        >
          <Input
            placeholder="Name"
            type="text"
            onChange={(e) =>
              setEncounter({ ...encounter, name: e.target.value })
            }
            value={encounter.name}
          />
          <Input
            placeholder="Description"
            type="text"
            onChange={(e) =>
              setEncounter({ ...encounter, description: e.target.value })
            }
            value={encounter.description}
          />

          <Button type={"submit"}>Create encounter</Button>
        </form>
      </Card>
      <Flipper
        flipKey={encounters?.map((encounter) => encounter.id).join("")}
        className={"flex flex-col gap-5"}
      >
        {encounters &&
          encounters.map((encounter) => (
            <Flipped flipId={encounter.id} key={encounter.id}>
              <Card
                className="flex justify-between gap-5 items-center pr-5"
                key={encounter.id}
              >
                <Link
                  className="w-full p-5 flex flex-col"
                  href={
                    encounter.started_at
                      ? `/encounters/${encounter.id}/run`
                      : `/encounters/${encounter.id}`
                  }
                >
                  <h2 className={"text-2xl pb-5"}>{encounter.name}</h2>
                  {encounter.started_at ? (
                    <p>{new Date(encounter.started_at).toLocaleDateString()}</p>
                  ) : null}
                  <CharacterIconRow id={encounter.id} />
                </Link>
                <Button
                  variant={"destructive"}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteEncounter(encounter.id);
                  }}
                >
                  Delete
                </Button>
              </Card>
            </Flipped>
          ))}
      </Flipper>
    </div>
  );
}

function CharacterIconRow({ id }: { id: number }) {
  const { data: creatures } = useEncounterCreatures(id);

  return (
    <div className={"flex gap-3 flex-wrap"}>
      {creatures?.map((creature) => (
        <CharacterIcon
          id={creature.creature_id}
          name={creature.name}
          key={creature.creature_id}
        />
      ))}
    </div>
  );
}
