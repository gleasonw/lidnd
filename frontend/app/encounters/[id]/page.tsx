import SingleEncounter from "@/app/encounters/[id]/single-encounter";

export default function EncounterPage({ params }: { params: { id: string } }) {
  return <SingleEncounter />;
}
