import SingleEncounter from "@/app/dashboard/encounters/[id]/single-encounter";

export default function EncounterPage({ params }: { params: { id: string } }) {
  return <SingleEncounter />;
}
