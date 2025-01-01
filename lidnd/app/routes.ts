import type { LidndUser } from "@/app/authentication";
import _ from "lodash";

type EncounterLinkArgs = {
  campaign: { slug: string };
  encounter: { name: string; index_in_campaign: number };
  user: LidndUser;
};

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

  encounter({ campaign, encounter, user }: EncounterLinkArgs) {
    return `${this.campaign(campaign, user)}/encounter/${
      encounter.index_in_campaign
    }/${_.kebabCase(encounter.name)}`;
  },

  rollEncounter(args: EncounterLinkArgs) {
    return `${this.encounter(args)}/roll`;
  },

  campaign(campaign: { slug: string }, user: LidndUser) {
    return `${this.dashboard(user)}/${campaign.slug}`;
  },

  login: "/login",
} as const;
