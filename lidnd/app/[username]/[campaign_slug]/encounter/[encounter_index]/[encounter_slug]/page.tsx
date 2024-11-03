import { LidndAuth } from "@/app/authentication";
import { FadeInSuspense } from "@/components/ui/fade-in-suspense";
import { BattleUI } from "@/encounters/[encounter_index]/battle-ui";

export default async function EncounterPage() {
  const user = await LidndAuth.getUser();

  if (!user) {
    console.error("No session found, layout should have redirected");
    return <div>User not logged in</div>;
  }

  return (
    <FadeInSuspense
      fallback={<div>Loading encounter...</div>}
      wrapperClassName="flex h-full overflow-auto max-h-full"
    >
      <BattleUI />
    </FadeInSuspense>
  );
}
