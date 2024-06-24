import { LidndAuth, UserUtils } from "@/app/authentication";
import { FadeInSuspense } from "@/components/ui/fade-in-suspense";
import { BattleUI } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/battle-ui";
import { EncounterId } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/encounter-id";
import EncounterPrep from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/encounter-prep";
import { encounterFromPathParams } from "@/server/utils";
import { CampaignId } from "@/app/[username]/[campaign_slug]/campaign_id";

export default async function EncounterPage({ params }: { params: unknown }) {
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

  //todo: move campaignid/encounterid to layout
  return (
    <FadeInSuspense
      fallback={<div>Loading encounter...</div>}
      wrapperClassName="flex"
    >
      <CampaignId value={campaign.id}>
        <EncounterId value={encounter.id}>
          {encounter.started_at ? <BattleUI /> : <EncounterPrep />}
        </EncounterId>
      </CampaignId>
    </FadeInSuspense>
  );
}
