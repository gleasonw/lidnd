export const appRoutes = {
  campaigns: "/campaigns",
  encounters: "/encounters",
  creatures: "/creatures",
} as const;

export function routeToEncounter(campaignId: string, encounterId: string) {
  return `${appRoutes.campaigns}/${campaignId}/${appRoutes.encounters}/${encounterId}`;
}
