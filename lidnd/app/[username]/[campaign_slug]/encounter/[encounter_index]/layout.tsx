import { EncounterId } from "@/encounters/[encounter_index]/encounter-id";
import { EncounterUI } from "@/encounters/[encounter_index]/EncounterUiStore";
import { isEncounterPathParams } from "@/server/utils";
import { ServerCampaign } from "@/server/sdk/campaigns";
import { LidndAuth } from "@/app/authentication";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { appRoutes } from "@/app/routes";
import { Home } from "lucide-react";
import css from "./EncounterLayout.module.css";
import { EncounterRoundIndicator } from "@/encounters/[encounter_index]/EncounterRoundIndicator";
import { ButtonWithTooltip } from "@/components/ui/tip";

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
    param.campaign_slug,
  );
  const encounter = campaign?.encounters.find(
    (e) => e.index_in_campaign === parseInt(param.encounter_index),
  );
  if (!encounter) {
    return <div>No encounter found</div>;
  }
  return (
    <EncounterUI>
      <EncounterId encounterId={encounter.id}>
        <div className={`relative ${css.root}`}>
          <div className={`${css.encounterNav} absolute top-0 left-0 z-50`}>
            <Card
              className={`items-center justify-center gap-3 flex flex-col w-full h-full`}
            >
              <Link
                href={appRoutes.campaign({
                  campaign: { ...campaign, slug: param.campaign_slug },
                  user,
                })}
                className="flex gap-3"
              >
                <ButtonWithTooltip text="Back to campaign" variant="outline">
                  <Home />
                </ButtonWithTooltip>
              </Link>
              <EncounterRoundIndicator />
            </Card>
          </div>
          {props.children}
        </div>
      </EncounterId>
    </EncounterUI>
  );
}
