import EncounterPrep from "@/app/encounters/[id]/encounter-prep";

export default function EncounterPage({ params }: { params: { id: string } }) {
  return <EncounterPrep />;
}
