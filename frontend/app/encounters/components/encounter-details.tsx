import { getEncounter } from "@/app/encounters/api";

export default async function EncounterDetails({ id }: { id: string }) {
  const encounter = await getEncounter({ encounter_id: parseInt(id) });

  return (
    <div className={"flex flex-col"}>
      <h1>{encounter?.name}</h1>
      <p>{encounter?.description}</p>
    </div>
  );
}
