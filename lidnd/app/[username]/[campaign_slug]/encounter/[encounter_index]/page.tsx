import { LidndAuth, UserUtils } from "@/app/authentication";
import { appRoutes } from "@/app/routes";
import { encounterFromPathParams } from "@/server/utils";
import { redirect } from "next/navigation";

export default async function EncounterPage({
  params,
}: {
  params: { encounter_index: string; campaign_slug: string };
}) {
  const user = await LidndAuth.getUser();

  if (!user) {
    console.error("No session found, layout should have redirected");
    return <div>User not logged in</div>;
  }

  const userContext = UserUtils.context(user);

  const [campaign, encounter] = await encounterFromPathParams(
    userContext,
    params,
  );

  return redirect(appRoutes.encounter(campaign, encounter, user));
}
