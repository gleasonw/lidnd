import EncounterPrep from "@/app/campaigns/[campaign]/encounters/[id]/encounter-prep";

export default function EncounterPage({ params }: { params: { id: string } }) {
  return <EncounterPrep />;
}
