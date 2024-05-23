import { System } from "@/types";

export function initiativeType(encounter: { campaign: { system: System } }) {
  return encounter.campaign.system.initiative_type;
}
