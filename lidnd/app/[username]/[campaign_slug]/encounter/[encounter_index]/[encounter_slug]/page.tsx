import { LidndAuth } from "@/app/authentication";
import { FadeInSuspense } from "@/components/ui/fade-in-suspense";
import EncounterPrep from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/encounter-prep";

export default async function EncounterPage({ params }: { params: unknown }) {
  const user = await LidndAuth.getUser();

  if (!user) {
    console.error("No session found, layout should have redirected");
    return <div>User not logged in</div>;
  }

  return (
    <FadeInSuspense
      fallback={<div>Loading encounter...</div>}
      wrapperClassName="flex gap-[var(--main-content-padding)] h-full w-full"
    >
      <EncounterPrep />
    </FadeInSuspense>
  );
}
