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

  gameSession: function ({
    user,
    campaign,
    gameSessionId,
  }: {
    user: LidndUser;
    campaign: { slug: string };
    gameSessionId: string;
  }) {
    return `${this.campaign({ campaign, user })}?game_session=${gameSessionId}`;
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
    return `${this.campaign({ campaign, user })}/encounter/${
      encounter.index_in_campaign
    }/${_.kebabCase(encounter.name)}`;
  },

  rollEncounter(args: EncounterLinkArgs) {
    return `${this.encounter(args)}/roll`;
  },

  campaign({
    campaign,
    user,
  }: {
    campaign: { slug: string };
    user: LidndUser;
  }) {
    return `${this.dashboard(user)}/${campaign.slug}`;
  },

  creaturesForCampaign({
    campaign,
    user,
  }: {
    campaign: { slug: string };
    user: LidndUser;
  }) {
    return `${this.campaign({ campaign, user })}/creatures`;
  },

  sessionsForCampaign({
    campaign,
    user,
  }: {
    campaign: { slug: string };
    user: LidndUser;
  }) {
    return `${this.campaign({ campaign, user })}`;
  },

  party(props: { campaign: { slug: string }; user: LidndUser }) {
    return `${this.campaign(props)}/party`;
  },

  sessions(props: { campaign: { slug: string }; user: LidndUser }) {
    return `${this.campaign(props)}/sessions`;
  },

  login: "/login",
} as const;
