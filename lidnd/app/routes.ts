import { LidndUser } from "@/app/authentication";
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

  encounter(
    campaign: { slug: string },
    encounter: { name: string; index_in_campaign: number },
    user: LidndUser,
  ) {
    return `${this.campaign(campaign, user)}/encounter/${encounter.index_in_campaign}/${_.kebabCase(encounter.name)}`;
  },

  campaign(campaign: { slug: string }, user: LidndUser) {
    return `${this.dashboard(user)}/${campaign.slug}`;
  },

  login: "/login",
} as const;
