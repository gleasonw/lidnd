import { getEncounter } from "@/app/encounters/api";

export default async function EncounterLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: any;
}) {
  const encounter = await getEncounter({ encounter_id: params.id });
  return (
    <section>
      <div className={"flex flex-col"}>
        <h1>{encounter?.name}</h1>
        <p>{encounter?.description}</p>
      </div>
      {children}
    </section>
  );
}
