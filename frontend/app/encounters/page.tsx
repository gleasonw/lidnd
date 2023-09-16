import { LoadingButton } from "@/app/components/LoadingButton";
import Link from "next/link";
import { createEncounter, getUserEncounters } from "@/app/encounters/api";

async function createDefaultEncounter() {
  "use server";
  await createEncounter({
    name: "test",
    description: "test",
  });
}

export default async function Encounters() {
  const encounters = await getUserEncounters();

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
            className="p-5 border hover:bg-white transition-all"
          >
            {encounter.name} {encounter.id}
          </Link>
        ))}
    </div>
  );
}
