import { EncounterId } from "@/encounters/[encounter_index]/encounter-id";
import { EncounterUI } from "@/encounters/[encounter_index]/EncounterUiStore";
import { EncounterTopBar } from "@/encounters/[encounter_index]/encounter-top-bar";
import { isEncounterPathParams } from "@/server/utils";
import { ServerCampaign } from "@/server/sdk/campaigns";
import { LidndAuth } from "@/app/authentication";

export default async function EncounterLayout(props: {
  children: React.ReactNode;
  params: Promise<{ id: string; campaign_slug: string }>;
}) {
  const user = await LidndAuth.getUser();
  if (!user) {
    return <div>User not logged in</div>;
  }
  const param = await props.params;
  if (!isEncounterPathParams(param)) {
    console.error("params object has missing fields");
    return;
  }
  const campaign = await ServerCampaign.campaignFromSlug(
    { user },
    param.campaign_slug
  );
  const encounter = campaign?.encounters.find(
    (e) => e.index_in_campaign === parseInt(param.encounter_index)
  );
  if (!encounter) {
    return <div>No encounter found</div>;
  }
  return (
    <EncounterUI>
      <EncounterId encounterId={encounter.id}>
        <EncounterTopBar />
        <section className="flex flex-col overflow-y-auto max-h-full min-h-0 h-full">
          {props.children}
        </section>
      </EncounterId>
    </EncounterUI>
  );
}
