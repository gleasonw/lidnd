"use client";

import { LoadingButton } from "@/app/components/LoadingButton";
import Link from "next/link";
import { useCreateEncounter, useEncounters } from "@/app/encounters/api";
import { Button } from "@/components/ui/button";

export default function Encounters() {
  const { data: encounters, isLoading } = useEncounters();
  const { mutate: createDefaultEncounter } = useCreateEncounter();

  return (
    <div className="flex flex-col gap-10">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createDefaultEncounter({
            description: "This is assuredly a cool encounter",
            name: "Wow, client side!",
          });
        }}
      >
        <LoadingButton type={"submit"}>Create encounter</LoadingButton>
      </form>
      {encounters &&
        encounters.map((encounter) => (
          <div
            className="border hover:bg-white transition-all flex justify-between gap-5 items-center pr-5"
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
          </div>
        ))}
    </div>
  );
}
