import { appRoutes } from "@/app/routes";
import { useUser } from "../../user-provider";
import { useCampaign } from "../campaign-hooks";
import type { Encounter } from "@/server/api/router";

export function useEncounterLinks(
  encounter: Pick<Encounter, "id" | "name" | "index_in_campaign">
) {
  const [campaign] = useCampaign();
  const user = useUser();

  return {
    rollEncounter: appRoutes.rollEncounter({ campaign, encounter, user }),
    encounter: appRoutes.encounter({ campaign, encounter, user }),
    campaignLink: appRoutes.campaign({ campaign, user }),
  };
}
