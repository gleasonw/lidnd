import { LidndAuth, UserUtils } from "@/app/authentication";
import { appRoutes } from "@/app/routes";
import { FadeInSuspense } from "@/components/ui/fade-in-suspense";
import { EncounterBattleUI } from "@/encounters/[encounter_index]/battle-ui";
import { encounterFromPathParams } from "@/server/utils";
import { redirect } from "next/navigation";

export default async function EncounterPage(props: {
  params: Promise<{ encounter_index: string; campaign_slug: string }>;
}) {
  const params = await props.params;
  const user = await LidndAuth.getUser();

  if (!user) {
    console.error("No session found, layout should have redirected");
    return <div>User not logged in</div>;
  }

  const userContext = UserUtils.context(user);

  const [campaign, encounter] = await encounterFromPathParams(
    userContext,
    params
  );

  if (encounter.name.length === 0) {
    return (
      <FadeInSuspense
        fallback={<div>Loading encounter...</div>}
        wrapperClassName="flex h-full overflow-auto max-h-full"
      >
        <EncounterBattleUI />
      </FadeInSuspense>
    );
  } else {
    // just to give the user a pretty URL slug
    return redirect(appRoutes.encounter({ campaign, encounter, user }));
  }
}
