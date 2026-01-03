import { EncounterId } from "@/encounters/[encounter_index]/encounter-id";
import { EncounterUI } from "@/encounters/[encounter_index]/EncounterUiStore";
import { isEncounterPathParams } from "@/server/utils";
import { ServerCampaign } from "@/server/sdk/campaigns";
import { LidndAuth } from "@/app/authentication";
import Link from "next/link";
import { appRoutes } from "@/app/routes";
import { Home } from "lucide-react";
import css from "./EncounterLayout.module.css";
import { Button } from "@/components/ui/button";
import { NetworkErrorCatcher } from "@/encounters/[encounter_index]/NetworkErrorCatcher";

export default async function EncounterLayout(props: {
  children: React.ReactNode;
  params: Promise<{
    encounter_index: string;
    campaign_slug: string;
    username: string;
  }>;
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
        <NetworkErrorCatcher>
          <div
            className={`relative ${css.root} flex flex-col max-h-full h-full pb-2`}
          >
            {props.children}
          </div>
        </NetworkErrorCatcher>
      </EncounterId>
    </EncounterUI>
  );
}
