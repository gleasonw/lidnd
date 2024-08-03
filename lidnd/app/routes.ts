import type { LidndUser } from "@/app/authentication";
import type { EncounterStatus } from "@/server/api/db/schema";
import _ from "lodash";

export const appRoutes = {
  dashboard: (user: LidndUser) => {
    return `/${user.username}`;
  },

  creatures: function (user: LidndUser) {
    return `${this.dashboard(user)}/creatures`;
  },

  settings: function (user: LidndUser) {
    return `${this.dashboard(user)}/settings`;
  },

  observe: function (encounter_id: string) {
    return `/observe/${encounter_id}`;
  },

  encounter(
    campaign: { slug: string },
    encounter: { name: string; index_in_campaign: number },
    user: LidndUser,
    status: EncounterStatus = "prep",
  ) {
    if (status === "prep") {
      return `${this.campaign(campaign, user)}/encounter/${encounter.index_in_campaign}/${_.kebabCase(encounter.name)}`;
    }

    return `${this.campaign(campaign, user)}/encounter/${encounter.index_in_campaign}/${_.kebabCase(encounter.name)}/${status}`;
  },

  campaign(campaign: { slug: string }, user: LidndUser) {
    return `${this.dashboard(user)}/${campaign.slug}`;
  },

  login: "/login",
} as const;
