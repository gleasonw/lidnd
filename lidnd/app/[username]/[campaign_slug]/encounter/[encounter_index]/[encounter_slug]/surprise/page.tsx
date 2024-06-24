import { FadeInSuspense } from "@/components/ui/fade-in-suspense";
import { GroupSurpriseInput } from "@/encounters/[encounter_index]/group-surprise-input";

export default async function SurprisePage({ params }: { params: unknown }) {
  return (
    <FadeInSuspense fallback={<div>Loading...</div>}>
      <GroupSurpriseInput />;
    </FadeInSuspense>
  );
}
