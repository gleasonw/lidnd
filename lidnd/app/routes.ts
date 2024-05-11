export const appRoutes = {
  dashboard: "/dashboard",
  campaigns: "/dashboard/campaigns",
  creatures: "/dashboard/creatures",
  settings: "/dashboard/settings",
  login: "/login",
} as const;

export const routeLabels: {
  [route in keyof typeof appRoutes]: string;
} = {
  dashboard: "Dashboard",
  campaigns: "Campaigns",
  creatures: "Creatures",
  settings: "Settings",
  login: "Login",
};

export function routeToEncounter(campaignId: string, encounterId: string) {
  return `${appRoutes.campaigns}/${campaignId}/encounters/${encounterId}`;
}

export function routeToCampaign(campaignId: string) {
  return `${appRoutes.campaigns}/${campaignId}`;
}
