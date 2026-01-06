import { ServerCampaign } from "@/server/sdk/campaigns";
import { appRoutes } from "@/app/routes";
import { redirect } from "next/navigation";
import { LidndAuth, UserUtils } from "@/app/authentication";
import { CreateEncounterButton } from "@/app/[username]/[campaign_slug]/CreateEncounterButton";
import { SessionButton } from "@/app/[username]/[campaign_slug]/SessionButton";
import { ServerEncounter } from "@/server/sdk/encounters";
import { CampaignEncounters } from "@/app/[username]/[campaign_slug]/CampaignEncounters";

export default async function CampaignPage(props: {
  params: Promise<{
    campaign_slug: string;
    user_id: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const user = await LidndAuth.getUser();

  if (!user) {
    console.error("No session found, layout should have redirected");
    return redirect(appRoutes.login);
  }

  const campaignData = await ServerCampaign.campaignFromSlug(
    UserUtils.context(user),
    params.campaign_slug
  );

  if (!campaignData) {
    console.error("No campaign found, layout should have redirected");
    return <div>No campaign found... this is a bug</div>;
  }

  const encounterSearch = searchParams?.encounterSearch as string | undefined;
  const filteredTagId = searchParams?.tagId as string | undefined;

  //The big learning has been that trying to have server functions fetching AND RENDERING data causes
  // lots of headaches around invaliding the next router cache after RQ mutations. The simplest way forward
  // seems to be using placeholderData, which just avoids any layout flickers, but doesn't impact the RQ cache.
  // RQ cache should be our absolute SOT.
  const encountersInCampaign = await ServerEncounter.encountersInCampaign({
    ctx: UserUtils.context(user),
    campaign: { id: campaignData.id },
    search: encounterSearch,
    tagId: filteredTagId,
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pb-6">
      <section className="flex flex-col gap-6">
        <div className="flex w-full justify-center">
          <div className="flex gap-3 flex-col max-w-2xl w-full">
            <SessionButton campaignId={campaignData.id} />
            <CreateEncounterButton />
          </div>
        </div>
        <CampaignEncounters encountersInCampaign={encountersInCampaign} />
      </section>
    </div>
  );
}
