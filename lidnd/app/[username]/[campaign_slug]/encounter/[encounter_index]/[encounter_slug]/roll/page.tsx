import { FadeInSuspense } from "@/components/ui/fade-in-suspense";
import { GroupInitiativeInput } from "@/encounters/[encounter_index]/group-initiative-input";

export default async function RollPage({ params }: { params: unknown }) {
  return (
    <FadeInSuspense fallback={<div>Loading...</div>}>
      <GroupInitiativeInput />;
    </FadeInSuspense>
  );
}
