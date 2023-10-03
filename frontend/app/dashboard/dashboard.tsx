"use client";

import Link from "next/link";
import {
  useCreateEncounter,
  useDeleteEncounter,
  useEncounterCreatures,
  useEncounters,
} from "@/app/dashboard/encounters/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import React from "react";
import { Card } from "@/components/ui/card";
import { CharacterIcon } from "@/app/dashboard/encounters/[id]/character-icon";
import { Flipper, Flipped } from "react-flip-toolkit";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/hooks";
import { ExternalLink, Plus } from "lucide-react";
import { EncounterTime } from "@/app/dashboard/encounters/[id]/run/encounter-time";

export default function Dashboard() {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: encounters, isLoading } = useEncounters();
  const { mutate: createDefaultEncounter } = useCreateEncounter((encounter) =>
    router.push(`dashboard/encounters/${encounter.id}`)
  );
  const [encounter, setEncounter] = React.useState({
    name: "",
    description: "",
  });

  return (
    <div className="flex flex-col gap-20 mx-auto max-w-screen-xl">
      <section>
        <p
          className={`text-center text-xl ${
            !user ? "opacity-0" : "opacity-100"
          } transition-opacity`}
        >
          Welcome, <span className={"font-bold"}>{user?.username}</span>, to
          LiDnD!
        </p>
      </section>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createDefaultEncounter(encounter);
        }}
      >
        <Button type={"submit"} className={"flex gap-5"}>
          <Plus />
          Create encounter
        </Button>
      </form>
      <div className={"grid grid-cols-3 gap-5"}>
        {encounters &&
          encounters.map((encounter) => (
            <Link
              className="group relative"
              href={
                encounter.started_at
                  ? `/dashboard/encounters/${encounter.id}/run`
                  : `/dashboard/encounters/${encounter.id}`
              }
              key={encounter.id}
            >
              <Card className="flex flex-col gap-5 p-5 hover:shadow-md transition-all w-full h-full ">
                <span
                  className={
                    "absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 text-white bg-black p-2 rounded-full transition-opacity"
                  }
                >
                  <ExternalLink />
                </span>
                <EncounterTime time={encounter?.started_at ?? undefined} />

                <h2 className={"text-2xl pb-5"}>{encounter.name}</h2>
                {encounter.started_at ? (
                  <p>{new Date(encounter.started_at).toLocaleDateString()}</p>
                ) : null}
                <CharacterIconRow id={encounter.id} />
              </Card>
            </Link>
          ))}
      </div>
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
