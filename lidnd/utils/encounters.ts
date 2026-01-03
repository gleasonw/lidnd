import type { Campaign, Reminder } from "@/app/[username]/types";
import { appRoutes } from "@/app/routes";
import type {
  CyclableEncounter,
  UpdateTurnOrderReturn,
} from "@/app/[username]/[campaign_slug]/encounter/utils";
import type {
  Creature,
  Encounter,
  Participant,
  ParticipantWithData,
} from "@/server/api/router";
import type { EncounterWithData } from "@/server/sdk/encounters";
import * as R from "remeda";
import {
  ParticipantUtils,
  type ChallengeRatingParticipant,
  type SortableNameableParticipant,
} from "@/utils/participants";
import type { LidndUser } from "@/app/authentication";
import _ from "lodash";
import { CreatureUtils } from "@/utils/creatures";
import type { TurnGroup } from "@/server/db/schema";

export const ESTIMATED_TURN_SECONDS = 180;
export const ESTIMATED_ROUNDS = 2;

type EncounterWithParticipants<
  T extends Participant = EncounterWithData["participants"][number]
> = Encounter & {
  participants: T[];
};

export type EncounterWithParticipantDifficulty = {
  participants: Array<
    {
      creature: Pick<
        Creature,
        "type" | "is_inanimate" | "challenge_rating" | "max_hp"
      >;
    } & Pick<Participant, "is_ally" | "max_hp_override" | "hp">
  >;
  average_victories: Encounter["average_victories"];
};

type DifficultyArgs = {
  encounter: EncounterWithParticipantDifficulty;
  campaign: Pick<Campaign, "system" | "party_level">;
};

function participantHasPlayed(
  e: {
    turn_groups: Array<Pick<TurnGroup, "id" | "has_played_this_round">>;
  },
  participant: Pick<Participant, "turn_group_id" | "has_played_this_round"> & {
    creature: { is_inanimate: boolean };
  }
) {
  if (ParticipantUtils.isInanimate(participant)) {
    return true;
  }
  const groupsById = R.indexBy(e.turn_groups, (tg) => tg.id);
  const groupForParticipant = groupsById[participant.turn_group_id ?? ""];
  if (groupForParticipant) {
    return groupForParticipant.has_played_this_round;
  } else {
    return participant.has_played_this_round;
  }
}

export function targetSinglePlayerStrength(args: DifficultyArgs) {
  const tiers = EncounterUtils.findCRBudget(args);
  if (tiers === "no-players") {
    return "no-players";
  }
  return tiers.oneHeroStrength ?? null;
}

function inanimateMonsters<P extends { inanimate: boolean }>(e: {
  participants: Array<P>;
}) {
  return e.participants.filter((p) => p.inanimate);
}

function participantsByTurnGroup<
  // have to include initiative in the pick to satisfy sortLinearly... but that's sort of silly
  P extends Pick<
    Participant,
    "turn_group_id" | "id" | "initiative" | "created_at"
  >
>(e: { participants: Array<P> }) {
  const sortedParticipants = R.sort(
    e.participants,
    ParticipantUtils.sortLinearly
  );
  const groups = R.groupBy(
    sortedParticipants,
    (p) => p.turn_group_id ?? "no-group"
  );
  delete groups["no-group"];
  return groups;
}

export function monstersWithNoColumn<
  E extends {
    participants: Array<{
      column_id: string | null;
      is_ally: boolean;
      creature: Pick<Creature, "type">;
    }>;
  }
>(e: E): Array<E["participants"][number]> {
  return e.participants.filter(
    (p) =>
      (!p.column_id || p.column_id === null) && ParticipantUtils.isAdversary(p)
  );
}

const difficulties = {
  Trivial: "Trivial",
  Easy: "Easy",
  Standard: "Standard",
  Hard: "Hard",
  Deadly: "Deadly",
} as const;

export type Difficulty = keyof typeof difficulties;

function difficultyCssClasses(
  e: EncounterWithParticipantDifficulty,
  c: Campaign
) {
  const difficulty = EncounterUtils.difficulty({
    encounter: e,
    campaign: c,
  });
  if (difficulty === "no-players") {
    return "";
  }
  return cssClassForDifficulty(difficulty);
}

function difficultyClassForCR(
  cr: number,
  e: EncounterWithParticipantDifficulty,
  c: Pick<Campaign, "system" | "party_level">
) {
  const difficulty = EncounterUtils.difficultyForCR({
    cr,
    encounter: e,
    campaign: c,
  });
  if (difficulty === "no-players") {
    return "";
  }
  return cssClassForDifficulty(difficulty);
}

const colorForDifficulty = {
  Easy: "green",
  Standard: "blue",
  Hard: "yellow",
  Deadly: "red",
  Trivial: "gray",
} as const satisfies { [key in Difficulty]: string };

function cssClassForDifficulty(d: Difficulty) {
  const color = colorForDifficulty[d];
  switch (color) {
    case "blue": {
      return "text-blue-700 bg-blue-200";
    }
    case "green": {
      return "text-green-700 bg-green-200";
    }
    case "yellow": {
      return "text-yellow-700 bg-yellow-200";
    }
    case "red": {
      return "text-red-700 bg-red-200";
    }
    case "gray": {
      return "text-gray-700 bg-gray-200";
    }
    default: {
      const _exhaustiveCheck: never = color;
      throw new Error(`Unhandled color: ${_exhaustiveCheck}`);
    }
  }
}

function start(
  e: EncounterWithData,
  campaign: Pick<Campaign, "system">
): EncounterWithData {
  const [firstActive, firstRoundNumber] =
    EncounterUtils.firstActiveAndRoundNumber(e);

  const activatedEncounter =
    campaign.system === "dnd5e"
      ? EncounterUtils.updateParticipant(
          { ...firstActive, is_active: true },
          { ...e, current_round: firstRoundNumber }
        )
      : { ...e, current_round: firstRoundNumber };

  // Calculate initial malice for draw steel campaigns
  const initialMalice =
    campaign.system === "drawsteel"
      ? EncounterUtils.calculateInitialMalice(e)
      : e.malice;

  return {
    ...activatedEncounter,
    status: "run",
    is_editing_columns: false,
    started_at: new Date(),
    malice: initialMalice,
  };
}

/**encounters not in the session */
function inactiveEncounters<E extends { label: Encounter["label"] }>(
  encounters: E[]
) {
  return encounters.filter((e) => e.label === "inactive");
}

const DEFAULT_LEVEL = 1;

function remainingCr(
  e: EncounterWithParticipants,
  c: Pick<Campaign, "system" | "party_level">
) {
  const goalCr = EncounterUtils.goalCr(e, c);
  if (goalCr === "no-players") {
    return 0;
  }
  const totalCr = EncounterUtils.totalCr(e);
  return goalCr - totalCr;
}

export type ColumnableParticipant = Pick<
  Participant,
  | "creature_id"
  | "column_id"
  | "initiative"
  | "id"
  | "created_at"
  | "turn_group_id"
>;
/** we want to group participants with the same creature into one column, to avoid
 * duplicating stat blocks. we just take the first participant, sorted, as the column_id source of truth
 */
function participantsByColumn<CP extends ColumnableParticipant>(
  e: {
    participants: Array<CP>;
  },
  args?: {
    focusGroupId?: string | null;
  }
) {
  let baseParticipants;
  if (args?.focusGroupId) {
    baseParticipants = e.participants.filter(
      (p) => p.turn_group_id === args?.focusGroupId
    );
  } else {
    baseParticipants = e.participants;
  }
  const byCreature = R.groupBy(baseParticipants, (p) => p.creature_id);
  const res = Object.values(byCreature)?.reduce((acc, curr) => {
    const columnFor = curr
      .slice()
      .sort(ParticipantUtils.sortLinearly)
      .at(0)?.column_id;
    if (!columnFor) {
      return acc;
    }
    const inColumn = acc[columnFor];
    if (inColumn && inColumn.length > 0) {
      acc[columnFor]?.push(curr);
      return acc;
    }
    acc[columnFor] = [curr];
    return acc;
  }, {} as Record<string, CP[][]>);
  // sort each column's participants
  Object.keys(res).forEach((colId) => {
    //TODO: why are we grouping participants anymore? should make this much simpler... participants
    // no longer go in stat block columns...
    const sortedParticipantGroups =
      res[colId]
        ?.slice()
        .sort((pAs, pBs) => ParticipantUtils.sortLinearly(pAs[0]!, pBs[0]!)) ||
      [];
    res[colId] = sortedParticipantGroups.map((pGroup) =>
      pGroup.slice().sort(ParticipantUtils.sortLinearly)
    );
  });
  return res;
}

function participantsForColumn(
  e: EncounterWithParticipants,
  column: { id: string }
): ParticipantWithData[][] {
  return participantsByColumn(e)[column.id] ?? [];
}

export const EncounterUtils = {
  participantsByTurnGroup,
  participantHasPlayed,
  participantsByColumn,
  participantsForColumn,
  inactiveEncounters,
  inanimateMonsters,
  start,
  difficultyCssClasses,
  difficultyClassForCR,
  cssClassForDifficulty,
  remainingCr,
  participantsWithNoColumn: monstersWithNoColumn,

  goalCr(
    e: EncounterWithParticipants,
    c: Pick<Campaign, "system" | "party_level">
  ) {
    const tiers = this.findCRBudget({
      encounter: e,
      campaign: c,
    });
    if (tiers === "no-players") {
      return "no-players";
    }
    const { easyTier, standardTier, hardTier } = tiers;
    switch (e.target_difficulty) {
      case "easy":
        return easyTier;
      case "standard":
        return standardTier;
      case "hard":
        return hardTier;
      default: {
        const _: never = e.target_difficulty;
        throw new Error(`Unknown target_difficulty: ${_}`);
      }
    }
  },

  nextTierAndDistance(
    e: EncounterWithParticipants,
    c: Pick<Campaign, "system" | "party_level">
  ): [Difficulty, number] | "no-players" {
    const difficulty = this.difficulty({
      encounter: e,
      campaign: c,
    });
    const tiers = this.findCRBudget({
      encounter: e,
      campaign: c,
    });
    if (tiers === "no-players") {
      return "no-players";
    }

    const total = this.totalCr(e);
    if (difficulty === "Easy") {
      return [difficulties.Standard, tiers.standardTier - total] as const;
    }
    if (difficulty === "Standard") {
      return [difficulties.Hard, tiers.hardTier - total] as const;
    }
    if (difficulty === "Hard") {
      return [difficulties.Deadly, tiers.hardTier - total] as const;
    }
    return [difficulties.Hard, tiers.hardTier - total] as const;
  },

  byStatus(encounters: EncounterWithParticipants[]) {
    return R.groupBy(encounters, (e) => e.label);
  },
  participantFor(encounter: EncounterWithParticipants, id: string) {
    return encounter.participants.find((p) => p.id === id);
  },
  dynamicRoute(
    encounter: {
      id: string;
      started_at: Encounter["started_at"];
      campaign_id: string;
      name: string;
      index_in_campaign: number;
    },
    campaign: { slug: string },
    user: LidndUser
  ) {
    if (encounter.started_at) {
      return `${appRoutes.encounter({ campaign, encounter, user })}/run`;
    }

    return appRoutes.encounter({ campaign, encounter, user });
  },

  initiativeType(encounter: {
    campaigns: Pick<Campaign, "system">;
  }): "group" | "linear" {
    const system = encounter.campaigns.system;
    switch (system) {
      case "dnd5e":
        return "linear";
      case "drawsteel":
        return "group";
      default: {
        const _exhaustiveCheck: never = system;
        throw new Error(`Unhandled initiative type: ${_exhaustiveCheck}`);
      }
    }
  },

  colorForDifficulty(difficulty: Difficulty) {
    return colorForDifficulty[difficulty];
  },

  totalCr(encounter: EncounterWithParticipantDifficulty) {
    return _.sumBy(encounter.participants, (p) => {
      if (p.is_ally || ParticipantUtils.isInanimate(p)) return 0;
      return ParticipantUtils.challengeRating(p);
    });
  },

  playerCount(encounter: {
    participants: Array<{ creature: Pick<Creature, "type"> }>;
  }) {
    return encounter.participants.filter((p) => ParticipantUtils.isPlayer(p))
      .length;
  },

  /**
   * Count only alive players for malice calculation
   */
  alivePlayerCount(encounter: {
    participants: Array<{
      creature: Pick<Creature, "type">;
      hp: number;
    }>;
  }) {
    return encounter.participants.filter(
      (p) => ParticipantUtils.isPlayer(p) && p.hp > 0
    ).length;
  },

  /**
   * Calculate malice for the start of combat
   * Formula: average_victories + number_of_heroes + current_round (1)
   */
  calculateInitialMalice(encounter: {
    average_victories: number | null;
    participants: Array<{
      creature: Pick<Creature, "type">;
      hp: number;
    }>;
  }) {
    const avgVictories = encounter.average_victories ?? 0;
    const numHeroes = this.alivePlayerCount(encounter);
    const initialRound = 1;
    return avgVictories + numHeroes + initialRound;
  },

  /**
   * Calculate malice to add at the start of a new round
   * Formula: number_of_alive_heroes + round_number
   */
  calculateMaliceForRound(encounter: {
    participants: Array<{
      creature: Pick<Creature, "type">;
      hp: number;
    }>;
    current_round: number;
  }) {
    const numAliveHeroes = this.alivePlayerCount(encounter);
    return numAliveHeroes + encounter.current_round;
  },

  findCRBudget(args: {
    encounter: EncounterWithParticipantDifficulty;
    campaign: Pick<Campaign, "system" | "party_level">;
  }):
    | {
        trivialTier: number;
        easyTier: number;
        standardTier: number;
        hardTier: number;
        /**this is only applicable in the draw steel case, I think, when making encounter groups... can clean up types later */
        oneHeroStrength?: number;
      }
    | "no-players" {
    const playerCount = this.playerCount(args.encounter);
    if (playerCount === 0) {
      return "no-players";
    }
    const { encounter, campaign } = args;
    const playersLevel = campaign.party_level ?? DEFAULT_LEVEL;
    switch (campaign.system) {
      case "dnd5e": {
        if (playersLevel < 1 || playersLevel > 20) {
          throw new Error("playerLevel must be between 1 and 20");
        }

        const foundLevel = encounterCRPerCharacter.find(
          (cr) => cr.level === playersLevel
        );

        const alliesWeighted = _.sumBy(encounter?.participants, (p) => {
          if (!p.is_ally) return 0;
          return ParticipantUtils.challengeRating(p) * 4;
        });

        const playersAndAllies = playerCount + alliesWeighted;

        if (!foundLevel) {
          throw new Error("No CR budget found for this player level");
        }

        const easyTier = foundLevel.easy * playersAndAllies;
        const standardTier = foundLevel.standard * playersAndAllies;
        const hardTier = foundLevel.hard * playersAndAllies;
        // not really supporting 5e well right now, trivial tier is same as easy. but also this difficulty
        // system came from flee mortals iirc
        return { easyTier, standardTier, hardTier, trivialTier: easyTier };
      }
      case "drawsteel": {
        if (playersLevel < 1 || playersLevel > 10) {
          throw new Error("playerLevel must be between 1 and 10");
        }
        const numberOfHeroes = playerCount;
        const averageVictories = encounter.average_victories ?? 0;
        const adjustedHeroCount =
          numberOfHeroes + Math.floor(averageVictories / 2);
        const heroLevelEVBudget =
          drawSteelEncounterGuidelines.heroLevels[
            playersLevel.toString() as keyof typeof drawSteelEncounterGuidelines.heroLevels
          ];
        const oneHeroStrength = heroLevelEVBudget[0];
        const partyEncounterStrength = oneHeroStrength * adjustedHeroCount;
        const threeHeroStrength = oneHeroStrength * 3;
        if (partyEncounterStrength === undefined) {
          throw new Error(
            `No EV budget found for this number of heroes: ${adjustedHeroCount}`
          );
        }
        return {
          trivialTier: partyEncounterStrength - oneHeroStrength,
          easyTier: partyEncounterStrength,
          standardTier: partyEncounterStrength + oneHeroStrength,
          hardTier: partyEncounterStrength + threeHeroStrength,
          oneHeroStrength,
        };
      }
      default: {
        const _exhaustiveCheck: never = campaign.system;
        throw new Error(`Unsupported system: ${_exhaustiveCheck}`);
      }
    }
  },

  durationSeconds(
    encounter: EncounterWithParticipants,
    campaign: Pick<Campaign, "system" | "party_level">,
    opts?: {
      estimatedRounds?: number | null;
      estimatedTurnSeconds?: number | null;
    }
  ) {
    const difficulty = this.difficulty({
      encounter,
      campaign,
    });
    const finalEstimatedRounds =
      opts?.estimatedRounds ?? difficulty === "Deadly"
        ? 5
        : difficulty === "Hard"
        ? 4
        : difficulty === "Standard"
        ? 3
        : difficulty === "Easy"
        ? 2
        : 1;
    const finalTurnSeconds = opts?.estimatedTurnSeconds ?? 180;
    const estimateEncounterSeconds =
      (encounter.participants.length *
        finalEstimatedRounds *
        finalTurnSeconds) /
      60;

    return estimateEncounterSeconds;
  },

  optimisticParticipants<E extends CyclableEncounter>(
    status: "loadingNext" | "loadingPrevious" | "idle",
    encounter: E
  ): E {
    if (status === "loadingNext") {
      const { updatedEncounter } = EncounterUtils.cycleNextTurn(encounter);
      return updatedEncounter;
    }

    if (status === "loadingPrevious") {
      const { updatedEncounter } = EncounterUtils.cyclePreviousTurn(encounter);
      return updatedEncounter;
    }

    return encounter;
  },

  activeParticipantIndex(encounter: EncounterWithParticipants) {
    if (
      this.participantsInInitiativeOrder(encounter).filter((p) => p.is_active)
        .length > 1
    ) {
      throw new Error(
        `Encounter has more than one active participant: ${JSON.stringify(
          this.participantsInInitiativeOrder(encounter).filter(
            (p) => p.is_active
          )
        )}`
      );
    }

    const activeIndex = this.participantsInInitiativeOrder(encounter).findIndex(
      (p) => p.is_active
    );

    return activeIndex;
  },

  activeParticipant(encounter: EncounterWithParticipants) {
    return this.participantsInInitiativeOrder(encounter)[
      this.activeParticipantIndex(encounter)
    ];
  },

  difficulty(args: {
    encounter: EncounterWithParticipantDifficulty;
    campaign: Pick<Campaign, "system" | "party_level">;
  }) {
    const { encounter, campaign } = args;
    const totalCr = this.totalCr(encounter);

    return this.difficultyForCR({
      cr: totalCr,
      encounter,
      campaign,
    });
  },

  difficultyForCR(args: {
    cr: number;
    encounter: EncounterWithParticipantDifficulty;
    campaign: Pick<Campaign, "system" | "party_level">;
  }): Difficulty | "no-players" {
    const { cr, encounter, campaign } = args;
    const tiers = this.findCRBudget({
      encounter,
      campaign,
    });
    if (tiers === "no-players") {
      return "no-players";
    }
    const { standardTier, hardTier, trivialTier, easyTier } = tiers;
    if (cr <= trivialTier) {
      return difficulties.Trivial;
    } else if (cr <= easyTier) {
      return difficulties.Easy;
    } else if (cr <= standardTier) {
      return difficulties.Standard;
    } else if (cr <= hardTier) {
      return difficulties.Hard;
    } else {
      return difficulties.Deadly;
    }
  },

  participantsInInitiativeOrder<T extends Participant>(encounter: {
    participants: T[];
  }) {
    return R.sort(encounter.participants, ParticipantUtils.sortLinearly);
  },

  participants(encounter: EncounterWithParticipants) {
    return encounter.participants;
  },

  participantsByName<
    P extends { creature: { name: string } } & Pick<
      Participant,
      "initiative" | "created_at" | "id"
    >
  >(encounter: { participants: Array<P> }) {
    return R.sort(encounter.participants, (a, b) => {
      const res = ParticipantUtils.name(a).localeCompare(
        ParticipantUtils.name(b)
      );
      if (res === 0) {
        return ParticipantUtils.sortLinearly(a, b);
      }
      return res;
    });
  },

  latest(encounters: { created_at: Encounter["created_at"] }[]) {
    return R.sort(encounters, (a, b) => {
      if (!a.created_at || !b.created_at) {
        throw new Error("Encounters missing created_at");
      }
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  },

  monsters(encounter: EncounterWithParticipants<ParticipantWithData>) {
    return this.participantsByName(encounter)
      .filter((p) => !ParticipantUtils.isFriendly(p))
      .sort(ParticipantUtils.sortLinearly);
  },

  monstersWithoutTurnGroup(
    encounter: EncounterWithParticipants<ParticipantWithData>
  ) {
    return this.participantsByName(encounter).filter(
      // TODO: inanimate is a janky hack to allow malice and other things the dm needs to track to sit inside the
      // column layout. really we should have some "encounter element" system that lets us add things
      // to the column layout without those things becoming participants.

      (p) =>
        !ParticipantUtils.isFriendly(p) &&
        !p.turn_group_id &&
        !ParticipantUtils.isInanimate(p)
    );
  },

  monstersInCrOrder<P extends SortableNameableParticipant>(encounter: {
    participants: Array<P>;
  }) {
    return this.participantsByName(encounter)
      .filter((p) => !ParticipantUtils.isFriendly(p))
      .sort(
        (a, b) =>
          ParticipantUtils.challengeRating(b) -
          ParticipantUtils.challengeRating(a)
      );
  },

  allies(encounter: EncounterWithParticipants<ParticipantWithData>) {
    return this.participantsByName(encounter)
      .filter((p) => ParticipantUtils.isFriendly(p))
      .sort(ParticipantUtils.sortLinearly);
  },

  players(encounter: EncounterWithParticipants<ParticipantWithData>) {
    return R.sort(
      this.participants(encounter).filter((p) => ParticipantUtils.isPlayer(p)),
      ParticipantUtils.sortLinearly
    );
  },

  imageUrl(
    encounter: Pick<Encounter, "description"> & {
      participants: Array<
        ChallengeRatingParticipant & {
          creature: Pick<
            Creature,
            "name" | "icon_height" | "icon_width" | "id"
          >;
        } & Pick<Participant, "initiative" | "created_at" | "id">
      >;
    }
  ) {
    // if we have a description, try to extract the first image from it
    if (encounter.description && typeof DOMParser !== "undefined") {
      const doc = new DOMParser().parseFromString(
        encounter.description,
        "text/html"
      );
      const img = doc.querySelector("img");
      if (img && img.src) {
        return img.src;
      }
    }

    // otherwise, check the highest CR monster for an image
    const monstersByCr = EncounterUtils.monstersInCrOrder(encounter);
    if (monstersByCr.length > 0) {
      const highestCrMonster = monstersByCr[0]!;
      if (ParticipantUtils.hasIcon(highestCrMonster)) {
        return ParticipantUtils.iconUrl(highestCrMonster);
      }
    }

    // maybe in the future we let users set a custom image for the encounter?
    return null;
  },

  placeholder(
    encounter: Partial<Encounter> & { campaign_id: string }
  ): Encounter {
    return {
      id: encounter.id ?? Math.random().toString(),
      campaign_id: encounter.campaign_id,
      user_id: encounter.user_id ?? "pending",
      name: encounter.name ?? "",
      description: encounter.description ?? null,
      started_at: encounter.started_at ?? new Date(),
      created_at: encounter.created_at ?? new Date(),
      current_round: encounter.current_round ?? 0,
      ended_at: encounter.ended_at ?? null,
      status: encounter.status ?? "prep",
      label: encounter.label ?? "active",
      order: encounter.order ?? 0,
      index_in_campaign: encounter.index_in_campaign ?? 0,
      is_editing_columns: encounter.is_editing_columns ?? true,
      target_difficulty: encounter.target_difficulty ?? "standard",
      session_id: encounter.session_id ?? null,
      average_victories: encounter.average_victories ?? null,
      malice: encounter.malice ?? 0,
    };
  },

  updateParticipant(newParticipant: Participant, encounter: EncounterWithData) {
    return {
      ...encounter,
      participants: encounter.participants.map((p) => {
        if (p.id === newParticipant.id) {
          return {
            ...newParticipant,
            creature: p.creature,
            status_effects: p.status_effects,
          };
        }
        return p;
      }),
    };
  },

  updateCreature(c: Partial<Creature>, encounter: EncounterWithData) {
    const creatureWithPlaceholders = CreatureUtils.placeholder(c);
    return {
      ...encounter,
      participants: encounter.participants.map((p) => {
        if (p.creature.id === c.id) {
          return {
            ...p,
            creature: creatureWithPlaceholders,
          };
        }
        return p;
      }),
    };
  },

  removeParticipant(participantId: string, encounter: EncounterWithData) {
    return {
      ...encounter,
      participants: encounter.participants.filter(
        (p) => p.id !== participantId
      ),
    };
  },

  firstActiveAndRoundNumber(
    encounter: EncounterWithParticipants
  ): [Participant, number] {
    const participants = this.participantsInInitiativeOrder(encounter);

    const firstActive = participants.at(0);

    if (!firstActive) {
      throw new Error(
        "No participant found to start the encounter... empty list?"
      );
    }

    return [firstActive, 1];
  },

  postRoundReminders({
    reminders,
    current_round,
  }: {
    current_round: number;
    reminders: Reminder[];
  }) {
    // 0 means alert every round
    return reminders.filter(
      (reminder) =>
        reminder.alert_after_round === current_round ||
        reminder.alert_after_round === 0
    );
  },

  participantColumnLeaders<CP extends ColumnableParticipant>(encounter: {
    participants: CP[];
  }) {
    const participantsByColumn = this.participantsByColumn(encounter);
    // that is, the participant defining the column of the creature group. Shouldn't be necessary
    // once we guarantee creatures always have the same column
    return Object.values(participantsByColumn)
      .flatMap((columnParticipants) =>
        columnParticipants.map((group) => group[0])
      )
      .filter((p) => p !== undefined);
  },

  evRangeForDifficulty({
    encounter,
    campaign,
    difficulty,
  }: DifficultyArgs & { difficulty: Difficulty }):
    | { bounds: [number, number]; hardTier: number }
    | "no-players" {
    const tiers = this.findCRBudget({ encounter, campaign });
    if (tiers === "no-players") {
      return "no-players";
    }
    switch (difficulty) {
      case "Trivial":
        return { bounds: [0, tiers.trivialTier], hardTier: tiers.hardTier };
      case "Easy":
        return {
          bounds: [tiers.trivialTier, tiers.easyTier],
          hardTier: tiers.hardTier,
        };
      case "Standard":
        return {
          bounds: [tiers.easyTier, tiers.standardTier],
          hardTier: tiers.hardTier,
        };
      case "Hard":
        return {
          bounds: [tiers.standardTier, tiers.hardTier],
          hardTier: tiers.hardTier,
        };
      case "Deadly":
        return {
          bounds: [tiers.hardTier, Infinity],
          hardTier: tiers.hardTier,
        };
      default: {
        const _exhaustiveCheck: never = difficulty;
        throw new Error(`Unknown difficulty: ${_exhaustiveCheck}`);
      }
    }
  },

  destinationColumnForNewParticipant(
    newParticipant: { creature_id: string },
    encounter: EncounterWithData
  ) {
    const columnLeaders = this.participantColumnLeaders(encounter);
    const participantOfSameCreature = columnLeaders.find(
      (p) => p.creature_id === newParticipant.creature_id
    );
    if (participantOfSameCreature) {
      return participantOfSameCreature.column_id;
    }
    return (
      R.firstBy(
        encounter.columns.filter((col) => !col.is_home_column),
        (col) => col.participants.length
      )?.id || null
    );
  },

  addParticipant(
    newParticipant: ParticipantWithData,
    encounter: EncounterWithData
  ) {
    const destColumnId = this.destinationColumnForNewParticipant(
      newParticipant,
      encounter
    );
    if (destColumnId) {
      newParticipant.column_id = destColumnId;
    }

    // Initialize minion participants with 4 minions (HP = base HP * 4)
    if (ParticipantUtils.isMinion(newParticipant)) {
      const baseHp = newParticipant.creature.max_hp;
      const healthForMinionGroup = baseHp * 4;
      newParticipant.hp = healthForMinionGroup;
      newParticipant.max_hp_override = healthForMinionGroup;
    }

    return {
      ...encounter,
      participants: [...encounter.participants, newParticipant],
    };
  },

  addReminder(reminder: Reminder, encounter: EncounterWithData) {
    return {
      ...encounter,
      reminders: [...encounter.reminders, reminder],
    };
  },

  removeReminder(id: string, encounter: EncounterWithData) {
    return {
      ...encounter,
      reminders: encounter.reminders.filter((r) => r.id !== id),
    };
  },

  turnGroupsById<TG extends { id: string }>(encounter: { turn_groups: TG[] }) {
    return R.indexBy(encounter.turn_groups, (tg) => tg.id);
  },

  turnGroupForParticipant<TG extends { id: string }>(args: {
    participant: Pick<Participant, "turn_group_id">;
    encounter: { turn_groups: TG[] };
  }) {
    const turnGroupsById = this.turnGroupsById(args.encounter);
    return turnGroupsById[args.participant.turn_group_id ?? ""];
  },

  toggleGroupTurn<E extends CyclableEncounter & { malice: number }>(
    participant_id: string,
    encounter: E
  ): UpdateTurnOrderReturn<E> {
    const turnGroupsById = R.indexBy(encounter.turn_groups, (tg) => tg.id);
    const participants = this.participantsInInitiativeOrder(encounter);
    const participantWhoPlayed = participants.find(
      (p) => p.id === participant_id
    );
    if (!participantWhoPlayed) {
      throw new Error("Participant not found");
    }

    const groupForParticipant =
      turnGroupsById[participantWhoPlayed.turn_group_id ?? ""];
    let encounterWithUpdate: E;
    if (groupForParticipant) {
      encounterWithUpdate = {
        ...encounter,
        turn_groups: encounter.turn_groups.map((tg) => {
          if (tg.id === groupForParticipant.id) {
            return {
              ...tg,
              has_played_this_round: !tg.has_played_this_round,
            };
          } else {
            return tg;
          }
        }),
      };
    } else {
      const updatedParticipants = participants.map((p) => {
        if (p.id === participant_id) {
          return {
            ...p,
            has_played_this_round: !p.has_played_this_round,
          };
        } else {
          return p;
        }
      });
      encounterWithUpdate = {
        ...encounter,
        participants: updatedParticipants,
      };
    }

    const allHavePlayed = encounterWithUpdate.participants.every((p) =>
      this.participantHasPlayed(encounterWithUpdate, p)
    );
    if (allHavePlayed) {
      const encounterWithNewRound = this.moveToNextGroupTurnRound(encounter);
      // Add malice for the new round
      const maliceToAdd = this.calculateMaliceForRound(encounterWithNewRound);
      return {
        updatedEncounter: {
          ...encounterWithNewRound,
          malice: encounter.malice + maliceToAdd,
        },
        newlyActiveParticipant: participantWhoPlayed,
      };
    }
    return {
      updatedEncounter: encounterWithUpdate,
      newlyActiveParticipant: participantWhoPlayed,
    };
  },

  groupEncountersByTag<
    TEncounter extends { tags: Array<{ tag: { id: string } }> }
  >(
    encounters: Array<TEncounter> | null
  ): Record<
    string,
    Array<{
      tag: TEncounter["tags"][number]["tag"];
      encounter: TEncounter;
    }>
  > {
    return R.pipe(
      encounters ?? [],
      R.flatMap((e) => e.tags.map((et) => ({ tag: et.tag, encounter: e }))),
      R.groupBy((et) => et.tag.id)
    );
  },

  moveToNextGroupTurnRound<E extends CyclableEncounter>(encounter: E): E {
    return {
      ...encounter,
      participants: encounter.participants.map((p) => ({
        ...p,
        has_played_this_round: false,
      })),
      current_round: encounter.current_round + 1,
      turn_groups: encounter.turn_groups.map((tg) => ({
        ...tg,
        has_played_this_round: false,
      })),
    };
  },

  cycleNextTurn<E extends CyclableEncounter>(
    encounter: E
  ): UpdateTurnOrderReturn<E> {
    return this.cycleTurn({
      updateActiveAndRoundNumber: (participants) => {
        const prev = participants.findIndex((p) => p.is_active);
        if (prev === participants.length - 1) {
          const newlyActiveParticipant = participants[0];

          if (!newlyActiveParticipant) {
            throw new Error("cycleNext: newlyActiveParticipant not found");
          }

          return {
            updatedEncounter: {
              ...encounter,
              current_round: encounter.current_round + 1,
            },
            newlyActiveParticipant,
          };
        }

        const newlyActiveParticipant = participants[prev + 1];

        if (!newlyActiveParticipant) {
          throw new Error("cycleNext: newlyActiveParticipant not found");
        }

        return {
          updatedEncounter: encounter,
          newlyActiveParticipant,
        };
      },
      encounter,
    });
  },

  cyclePreviousTurn<E extends CyclableEncounter>(
    encounter: E
  ): UpdateTurnOrderReturn<E> {
    return this.cycleTurn({
      updateActiveAndRoundNumber: (participants) => {
        const prev = participants.findIndex((p) => p.is_active);
        if (prev === 0) {
          const newlyActiveParticipant = participants[participants.length - 1];

          if (!newlyActiveParticipant) {
            throw new Error("cyclePrevious: newlyActiveParticipant not found");
          }

          return {
            updatedEncounter: {
              ...encounter,
              current_round: Math.max(encounter.current_round - 1, 0),
            },
            newlyActiveParticipant,
          };
        }

        const newlyActiveParticipant = participants[prev - 1];

        if (!newlyActiveParticipant) {
          throw new Error("cyclePrevious: newlyActiveParticipant not found");
        }

        return {
          updatedEncounter: encounter,
          newlyActiveParticipant,
        };
      },
      encounter,
    });
  },

  cycleTurn<E extends CyclableEncounter>({
    updateActiveAndRoundNumber,
    encounter,
  }: CycleTurnArgs<E>): UpdateTurnOrderReturn<E> {
    const participants = encounter.participants;
    const sortedParticipants = R.sort(
      participants,
      ParticipantUtils.sortLinearly
    );

    if (!sortedParticipants.some((p) => p.is_active)) {
      console.warn(
        "No active participant found, which is odd. Setting first participant active"
      );
      if (!sortedParticipants[0]) {
        throw new Error("No participants! Egads");
      }
      sortedParticipants[0].is_active = true;
    }

    const candidates = sortedParticipants.filter(
      ParticipantUtils.isActivatable
    );

    const { updatedEncounter, newlyActiveParticipant } =
      updateActiveAndRoundNumber(candidates);

    const updatedParticipants = sortedParticipants.map((p) => {
      if (p.id === newlyActiveParticipant.id) {
        return { ...p, is_active: true };
      } else {
        return { ...p, is_active: false };
      }
    });

    return {
      updatedEncounter: {
        ...encounter,
        participants: updatedParticipants,
        current_round: updatedEncounter.current_round,
      },
      newlyActiveParticipant,
    };
  },
};

type CycleTurnArgs<E extends CyclableEncounter> = {
  updateActiveAndRoundNumber: (
    participants: E["participants"]
  ) => Omit<UpdateTurnOrderReturn<E>, "updatedParticipants">;
  encounter: E;
};

export const encounterCRPerCharacter = [
  { level: 1, easy: 0.125, standard: 0.125, hard: 0.25, cap: 1 },
  { level: 2, easy: 0.125, standard: 0.25, hard: 0.5, cap: 3 },
  { level: 3, easy: 0.25, standard: 0.5, hard: 0.75, cap: 4 },
  { level: 4, easy: 0.5, standard: 0.75, hard: 1, cap: 6 },
  { level: 5, easy: 1, standard: 1.5, hard: 2.5, cap: 8 },
  { level: 6, easy: 1.5, standard: 2, hard: 3, cap: 9 },
  { level: 7, easy: 2, standard: 2.5, hard: 3.5, cap: 10 },
  { level: 8, easy: 2.5, standard: 3, hard: 4, cap: 13 },
  { level: 9, easy: 3, standard: 3.5, hard: 4.5, cap: 13 },
  { level: 10, easy: 3.5, standard: 4, hard: 5, cap: 15 },
  { level: 11, easy: 4, standard: 4.5, hard: 5.5, cap: 16 },
  { level: 12, easy: 4.5, standard: 5, hard: 6, cap: 17 },
  { level: 13, easy: 5, standard: 5.5, hard: 6.5, cap: 19 },
  { level: 14, easy: 5.5, standard: 6, hard: 7, cap: 20 },
  { level: 15, easy: 6, standard: 6.5, hard: 7.5, cap: 22 },
  { level: 16, easy: 6.5, standard: 7, hard: 8, cap: 24 },
  { level: 17, easy: 7, standard: 7.5, hard: 8.5, cap: 25 },
  { level: 18, easy: 7.5, standard: 8, hard: 9, cap: 26 },
  { level: 19, easy: 8, standard: 8.5, hard: 9.5, cap: 28 },
  { level: 20, easy: 8.5, standard: 9, hard: 10, cap: 30 },
];

const drawSteelEncounterGuidelines = {
  heroLevels: {
    "1": [6, 12, 18, 24, 30, 36, 42, 48],
    "2": [8, 16, 24, 32, 40, 48, 56, 64],
    "3": [10, 20, 30, 40, 50, 60, 70, 80],
    "4": [12, 24, 36, 48, 60, 72, 84, 96],
    "5": [14, 28, 42, 56, 70, 84, 98, 112],
    "6": [16, 32, 48, 64, 80, 96, 112, 128],
    "7": [18, 36, 54, 72, 90, 108, 126, 144],
    "8": [20, 40, 60, 80, 100, 120, 140, 160],
    "9": [22, 44, 66, 88, 110, 132, 154, 176],
    "10": [24, 48, 72, 96, 120, 144, 168, 192],
  },
  heroesColumnMeaning: "Number of heroes from 1–8",
  victoryRule: "Add one hero for every 2 average victories",
} as const;
