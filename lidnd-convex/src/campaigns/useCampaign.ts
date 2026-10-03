import { useOutletContext } from "react-router";
import { Doc } from "../../convex/_generated/dataModel";

/** The campaign loaded by CampaignLayout. */
export function useCampaign() {
  return useOutletContext<Doc<"campaigns">>();
}
