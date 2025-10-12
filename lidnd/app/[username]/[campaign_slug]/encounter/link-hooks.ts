import { appRoutes } from "@/app/routes";
import { useUser } from "../../user-provider";
import { useCampaign } from "../campaign-hooks";
import { useEncounter } from "./[encounter_index]/hooks";

export function useEncounterLinks() {
  const [encounter] = useEncounter();
  const [campaign] = useCampaign();
  const user = useUser();

  return {
    rollEncounter: appRoutes.rollEncounter({ campaign, encounter, user }),
    encounter: appRoutes.encounter({ campaign, encounter, user }),
    campaignLink: appRoutes.campaign({ campaign, user }),
  };
}
