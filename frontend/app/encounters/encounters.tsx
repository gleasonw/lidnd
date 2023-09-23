"use client";

import { LoadingButton } from "@/app/components/LoadingButton";
import Link from "next/link";
import { useCreateEncounter, useEncounters } from "@/app/encounters/api";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

async function createDefaultEncounter() {
  await useCreateEncounter({
    name: "test",
    description: "test",
  });
}

export default async function Encounters() {
  const encounters = useQuery(["encounters"], useEncounters);

  return (
    <div className="flex flex-col gap-10">
      <form action={createDefaultEncounter}>
        <LoadingButton type={"submit"}>Create encounter</LoadingButton>
      </form>
      {encounters &&
        encounters.map((encounter) => (
          <Link
            key={encounter.id}
            href={`/encounters/${encounter.id}`}
            className="p-5 border hover:bg-white transition-all flex justify-between gap-5"
          >
            {encounter.name}
            {encounter?.started_at ? (
              <Link href={`/encounters/${encounter.id}/run`}>
                <Button>Continue the battle!</Button>
              </Link>
            ) : null}
          </Link>
        ))}
    </div>
  );
}
