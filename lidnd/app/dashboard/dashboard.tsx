"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import React from "react";
import { Card } from "@/components/ui/card";
import { CharacterIcon } from "@/app/dashboard/encounters/[id]/character-icon";
import { useRouter } from "next/navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ExternalLink, MoreHorizontal, Plus } from "lucide-react";
import { EncounterTime } from "@/app/dashboard/encounters/[id]/run/encounter-time";
import { LoadingButton } from "@/components/ui/loading-button";
import { api } from "@/trpc/react";
import { Encounter } from "@/server/api/router";
import { getQueryKey } from "@trpc/react-query";
import { useQueryClient } from "@tanstack/react-query";

export default function Dashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: encounters, isLoading } = api.encounters.useQuery();
  const { encounters: encountersQuery } = api.useUtils();
  const { mutate: deleteEncounter } = api.deleteEncounter.useMutation({
    onSettled: async () => {
      await encountersQuery.invalidate();
    },
    onMutate: async (id) => {
      await encountersQuery.cancel();
      const previous = encountersQuery.getData();
      encountersQuery.setData(undefined, (old) => {
        return old?.filter((encounter) => encounter.id !== id);
      });
      return { previous };
    },
  });
  const { mutate: createDefaultEncounter, isLoading: isCreatingEncounter } =
    api.createEncounter.useMutation({
      onSuccess: async (encounter) => {
        router.push(`dashboard/encounters/${encounter.id}`);
        return await queryClient.invalidateQueries(getQueryKey(api.encounters));
      },
    });
  const [encounter, setEncounter] = React.useState({
    name: "Unnamed encounter",
    description: "",
  });

  const displayedEncounters = encounters;

  const startedEncounters = displayedEncounters?.filter(
    (encounter) => encounter.started_at !== null
  );

  const pendingEncounters = displayedEncounters?.filter(
    (encounter) => encounter.started_at === null
  );

  const encounterCategories = [
    { name: "Started", encounters: startedEncounters },
    { name: "Pending", encounters: pendingEncounters },
  ];

  return (
    <div className="flex flex-col gap-14 mx-auto max-w-screen-xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createDefaultEncounter(encounter);
        }}
      >
        <LoadingButton
          isLoading={isCreatingEncounter}
          type={"submit"}
          className={"flex gap-5 w-52"}
        >
          <Plus />
          Create encounter
        </LoadingButton>
      </form>
      {encounterCategories.map(({ name, encounters }) => (
        <section key={name} className={"flex flex-col gap-3"}>
          <h1 className={"text-2xl"}>{name}</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {isLoading
              ? Array(3)
                  .fill(null)
                  .map((_, i) => <EncounterSkeleton key={i} />)
              : encounters?.length === 0
              ? "No encounters"
              : null}
            {encounters?.map((encounter) => (
              <EncounterCard
                encounter={encounter}
                deleteEncounter={deleteEncounter}
                key={encounter.id}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function EncounterSkeleton() {
  return (
    <Card className="flex flex-col transition-all w-full h-44 animate-pulse bg-gray-200" />
  );
}

function EncounterCard({
  encounter,
  deleteEncounter,
}: {
  encounter: Encounter;
  deleteEncounter: (id: string) => void;
}) {
  return (
    <Card className="flex flex-col transition-all w-full" key={encounter.id}>
      <Link
        href={
          encounter.started_at
            ? `/dashboard/encounters/${encounter.id}/run`
            : `/dashboard/encounters/${encounter.id}`
        }
        className="flex hover:bg-gray-200 p-5 justify-center border-b relative group bg-gray-100 rounded-t-lg"
      >
        <span
          className={
            "absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 text-white bg-black p-2 rounded-full transition-opacity"
          }
        >
          <ExternalLink />
        </span>

        <h2 className={"text-2xl pb-5"}>
          {encounter.name ? encounter.name : "Unnamed"}
        </h2>
      </Link>
      <div className="p-3 flex flex-col relative gap-5">
        <Popover>
          <PopoverTrigger asChild className="absolute top-0 right-0">
            <Button variant="ghost" size="icon">
              <MoreHorizontal />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="flex flex-col gap-10">
            <Button
              variant="destructive"
              onClick={() => deleteEncounter(encounter.id)}
            >
              Delete encounter
            </Button>
          </PopoverContent>
        </Popover>
        <CharacterIconRow id={encounter.id} />
        <EncounterTime time={encounter?.started_at ?? undefined} />
      </div>
    </Card>
  );
}

function CharacterIconRow({ id }: { id: string }) {
  const { data: encounters } = api.encounters.useQuery();

  const creatures = encounters
    ?.filter((encounter) => encounter.id === id)
    ?.at(0)?.participants;

  return (
    <div className={"flex gap-3 flex-wrap"}>
      {creatures?.map((creature) => (
        <CharacterIcon
          id={creature.creature_id}
          name={creature.name}
          key={creature.creature_id}
          className={"rounded-full object-cover w-10 h-10"}
          width={100}
          height={100}
        />
      ))}
    </div>
  );
}
