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
            className={`relative ${css.root} flex flex-col max-h-full h-full`}
          >
            {/**we don't really have space for this nav on group initiative... might need to rethink slightly */}
            {campaign?.system === "dnd5e" && (
              <div className={` absolute top-0 left-0 z-50`}>
                <div
                  className={`items-center justify-center gap-3 flex flex-col w-full h-full`}
                >
                  <Link
                    href={appRoutes.campaign({
                      campaign: { ...campaign, slug: param.campaign_slug },
                      user,
                    })}
                    className="flex gap-3"
                  >
                    <Button variant="ghost" className="opacity-60">
                      <Home />
                      Campaign
                    </Button>
                  </Link>
                </div>
              </div>
            )}
            {props.children}
          </div>
        </NetworkErrorCatcher>
      </EncounterId>
    </EncounterUI>
  );
}
