"use client";

import Link from "next/link";
import {
  useCreateEncounter,
  useDeleteEncounter,
  useEncounters,
} from "@/app/encounters/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import React from "react";
import { Card } from "@/components/ui/card";

export default function Encounters() {
  const { data: encounters, isLoading } = useEncounters();
  const { mutate: createDefaultEncounter } = useCreateEncounter();
  const { mutate: deleteEncounter } = useDeleteEncounter();
  const [encounter, setEncounter] = React.useState({
    name: "",
    description: "",
  });

  return (
    <div className="flex flex-col gap-10">
      <Card className="max-w-5xl p-5 m-auto w-full">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createDefaultEncounter(encounter);
          }}
          className="flex flex-col gap-3"
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

          <Button type={"submit"} variant={"secondary"} className={"max-w-sm"}>
            Create encounter
          </Button>
        </form>
      </Card>
      {encounters &&
        encounters.map((encounter) => (
          <Card
            className="flex justify-between gap-5 items-center pr-5"
            key={encounter.id}
          >
            <Link className="w-full p-5" href={`/encounters/${encounter.id}`}>
              {encounter.name}
            </Link>
            {encounter?.started_at ? (
              <Link href={`/encounters/${encounter.id}/run`}>
                <Button>Continue the battle!</Button>
              </Link>
            ) : null}
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
        ))}
    </div>
  );
}
