import type { Campaign, Reminder } from "@/app/[username]/types";
import { appRoutes } from "@/app/routes";
import type { UpdateTurnOrderReturn } from "@/app/[username]/[campaign_slug]/encounter/utils";
import type {
  Creature,
  Encounter,
  Participant,
  ParticipantWithData,
} from "@/server/api/router";
import type { EncounterWithData } from "@/server/sdk/encounters";
import type { System } from "@/types";
import * as R from "remeda";
import { ParticipantUtils } from "@/utils/participants";
import type { LidndUser } from "@/app/authentication";
import _ from "lodash";
import { CreatureUtils } from "@/utils/creatures";

export const ESTIMATED_TURN_SECONDS = 180;
export const ESTIMATED_ROUNDS = 2;

type EncounterWithParticipants<
  T extends Participant = EncounterWithData["participants"][number]
> = Encounter & {
  participants: T[];
};

export type EncounterWithParticipantDifficulty = {
  participants: Array<{
    creature: { challenge_rating: number; is_player: boolean };
    is_ally: boolean;
    inanimate: boolean;
  }>;
};

type Cyclable = {
  participants: ParticipantWithData[];
  current_round: number;
};

export function monstersWithNoColumn<
  E extends {
    participants: Array<{
      column_id: string | null;
      is_ally: boolean;
      creature: { is_player: boolean };
    }>;
  }
>(e: E): Array<E["participants"][number]> {
  return e.participants.filter(
    (p) =>
      (!p.column_id || p.column_id === null) && ParticipantUtils.isAdversary(p)
  );
}

const difficulties = {
  Easy: "Easy",
  Standard: "Standard",
  Hard: "Hard",
  Deadly: "Deadly",
} as const;

type Difficulty = keyof typeof difficulties;

function difficultyCssClasses(
  e: EncounterWithParticipantDifficulty,
  c: Campaign
) {
  const difficulty = EncounterUtils.difficulty(e, c?.party_level);
  return cssClassForDifficulty(difficulty);
}

function difficultyClassForCR(
  cr: number,
  e: EncounterWithParticipantDifficulty,
  c: { party_level?: number }
) {
  const difficulty = EncounterUtils.difficultyForCR(cr, e, c?.party_level ?? 1);
  return cssClassForDifficulty(difficulty);
}

const difficultyClasses = {
  Easy: "text-green-700 bg-green-100",
  Standard: "text-blue-700 bg-blue-100",
  Hard: "text-yellow-700 bg-yellow-100",
  Deadly: "text-red-700 bg-red-100",
} as const;

function cssClassForDifficulty(d: Difficulty) {
  return difficultyClasses[d];
}

function start(e: EncounterWithData): EncounterWithData {
  const [firstActive, firstRoundNumber] =
    EncounterUtils.firstActiveAndRoundNumber(e);

  const activatedEncounter = EncounterUtils.updateParticipant(
    { ...firstActive, is_active: true },
    { ...e, current_round: firstRoundNumber }
  );

  return {
    ...activatedEncounter,
    status: "run",
    is_editing_columns: false,
    started_at: new Date(),
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
  c: { party_level?: number }
) {
  return EncounterUtils.goalCr(e, c) - EncounterUtils.totalCr(e);
}

export type ColumnableParticipant = Pick<
  Participant,
  "creature_id" | "column_id" | "initiative" | "id" | "created_at"
>;
/** we want to group participants with the same creature into one column, to avoid
 * duplicating stat blocks. we just take the first participant, sorted, as the column_id source of truth
 */
function participantsByColumn<CP extends ColumnableParticipant>(e: {
  participants: Array<CP>;
}) {
  const byCreature = R.groupBy(e.participants, (p) => p.creature_id);
  return Object.values(byCreature)?.reduce((acc, curr) => {
    const columnFor = curr
      .slice()
      .sort(ParticipantUtils.sortLinearly)
      .at(0)?.column_id;
    if (!columnFor) return acc;
    const inColumn = acc[columnFor];
    if (inColumn && inColumn.length > 0) {
      acc[columnFor]?.push(curr);
      return acc;
    }
    acc[columnFor] = [curr];
    return acc;
  }, {} as Record<string, CP[][]>);
}

function participantsForColumn(
  e: EncounterWithParticipants,
  column: { id: string }
): ParticipantWithData[][] {
  return participantsByColumn(e)[column.id] ?? [];
}

export const EncounterUtils = {
  participantsByColumn,
  participantsForColumn,
  inactiveEncounters,
  start,
  difficultyCssClasses,
  difficultyClassForCR,
  cssClassForDifficulty,
  remainingCr,
  participantsWithNoColumn: monstersWithNoColumn,

  goalCr(e: EncounterWithParticipants, c: { party_level?: number }) {
    const { easyTier, standardTier, hardTier } = this.findCRBudget(
      e,
      c.party_level ?? DEFAULT_LEVEL
    );
    if (e.target_difficulty === "easy") {
      return easyTier;
    }
    if (e.target_difficulty === "standard") {
      return standardTier;
    }
    return hardTier;
  },

  nextTierAndDistance(
    e: EncounterWithParticipants,
    c: { party_level?: number }
  ): [Difficulty, number] {
    const difficulty = this.difficulty(e, c.party_level ?? DEFAULT_LEVEL);
    const tiers = this.findCRBudget(e, c.party_level ?? DEFAULT_LEVEL);
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

  initiativeType(encounter: { campaigns: { system: System } }) {
    return encounter.campaigns.system.initiative_type;
  },

  totalCr(encounter: EncounterWithParticipantDifficulty) {
    return _.sumBy(encounter.participants, (p) => {
      if (p.is_ally || p.inanimate) return 0;
      return ParticipantUtils.challengeRating(p);
    });
  },

  playerCount(encounter: {
    participants: Array<{ creature: { is_player: boolean } }>;
  }) {
    return encounter.participants.filter((p) => ParticipantUtils.isPlayer(p))
      .length;
  },

  findCRBudget(
    encounter: EncounterWithParticipantDifficulty,
    playersLevel: number
  ) {
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

    const playersAndAllies = this.playerCount(encounter) + alliesWeighted;

    if (!foundLevel) {
      throw new Error("No CR budget found for this player level");
    }

    const easyTier = foundLevel.easy * playersAndAllies;
    const standardTier = foundLevel.standard * playersAndAllies;
    const hardTier = foundLevel.hard * playersAndAllies;

    return { easyTier, standardTier, hardTier };
  },

  durationSeconds(
    encounter: EncounterWithParticipants,
    opts?: {
      estimatedRounds?: number | null;
      estimatedTurnSeconds?: number | null;
      playerLevel?: number | null;
    }
  ) {
    const difficulty = this.difficulty(encounter, opts?.playerLevel);
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

  optimisticParticipants(
    status: "loadingNext" | "loadingPrevious" | "idle",
    encounter: EncounterWithParticipants
  ): EncounterWithParticipants {
    if (status === "loadingNext") {
      const { updatedParticipants, updatedRoundNumber } =
        EncounterUtils.cycleNextTurn(encounter);
      return {
        ...encounter,
        participants: updatedParticipants,
        current_round: updatedRoundNumber,
      };
    }

    if (status === "loadingPrevious") {
      const { updatedParticipants, updatedRoundNumber } =
        EncounterUtils.cyclePreviousTurn(encounter);
      return {
        ...encounter,
        participants: updatedParticipants,
        current_round: updatedRoundNumber,
      };
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

  difficulty(
    encounter: EncounterWithParticipantDifficulty,
    playerLevel?: number | null
  ) {
    const finalPlayerLevel = playerLevel ?? 1;
    const totalCr = this.totalCr(encounter);

    return this.difficultyForCR(totalCr, encounter, finalPlayerLevel);
  },

  difficultyForCR(
    cr: number,
    encounter: EncounterWithParticipantDifficulty,
    playerLevel: number
  ): Difficulty {
    const { standardTier, hardTier } = this.findCRBudget(
      encounter,
      playerLevel
    );
    if (cr < standardTier) {
      return difficulties.Easy;
    } else if (cr < hardTier) {
      return difficulties.Standard;
    } else if (cr === hardTier) {
      return difficulties.Hard;
    } else {
      return difficulties.Deadly;
    }
  },

  participantsInInitiativeOrder<T extends Participant>(
    encounter: EncounterWithParticipants<T>
  ) {
    return R.sort(encounter.participants, ParticipantUtils.sortLinearly);
  },

  participants(encounter: EncounterWithParticipants) {
    return encounter.participants;
  },

  participantsByName(encounter: EncounterWithParticipants) {
    return R.sort(encounter.participants, (a, b) =>
      ParticipantUtils.name(a).localeCompare(ParticipantUtils.name(b))
    );
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

  allies(encounter: EncounterWithParticipants<ParticipantWithData>) {
    return this.participantsByName(encounter)
      .filter((p) => ParticipantUtils.isFriendly(p))
      .sort(ParticipantUtils.sortLinearly);
  },

  players(encounter: EncounterWithParticipants<ParticipantWithData>) {
    return this.participants(encounter).filter((p) =>
      ParticipantUtils.isPlayer(p)
    );
  },

  placeholder(
    encounter: Partial<Encounter> & { campaign_id: string }
  ): Encounter {
    return {
      id: encounter.id ?? Math.random().toString(),
      campaign_id: encounter.campaign_id,
      user_id: encounter.user_id ?? "pending",
      name: encounter.name ?? "Unnamed encounter",
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

  hasSurpriseRound(encounter: EncounterWithParticipants) {
    return this.participantsInInitiativeOrder(encounter).some(
      (p) => p.has_surprise
    );
  },

  firstActiveAndRoundNumber(
    encounter: EncounterWithParticipants
  ): [Participant, number] {
    const participants = this.participantsInInitiativeOrder(encounter);

    const surprise = this.hasSurpriseRound(encounter);

    const firstActive = surprise
      ? participants.find((p) => p.has_surprise)
      : participants.at(0);

    if (!firstActive) {
      throw new Error(
        "No participant found to start the encounter... empty list?"
      );
    }

    return [firstActive, surprise ? 0 : 1];
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
      R.firstBy(encounter.columns, (col) => col.participants.length)?.id || null
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

  updateGroupTurn(
    participant_id: string,
    participant_has_played_this_round: boolean,
    encounter: EncounterWithData
  ): UpdateTurnOrderReturn {
    const participants = this.participantsInInitiativeOrder(encounter);
    const participantWhoPlayed = participants.find(
      (p) => p.id === participant_id
    );
    if (!participantWhoPlayed) {
      throw new Error("Participant not found");
    }
    const updatedParticipants = participants.map((p) => {
      if (p.id === participant_id) {
        return {
          ...p,
          has_played_this_round: participant_has_played_this_round,
        };
      } else {
        return p;
      }
    });
    const allHavePlayed = updatedParticipants.every(
      (p) => p.has_played_this_round || p.inanimate
    );
    if (allHavePlayed) {
      return {
        updatedParticipants: participants.map((p) => ({
          ...p,
          has_played_this_round: false,
        })),
        updatedRoundNumber: encounter.current_round + 1,
        newlyActiveParticipant: participantWhoPlayed,
      };
    }
    return {
      updatedParticipants,
      updatedRoundNumber: encounter.current_round,
      newlyActiveParticipant: participantWhoPlayed,
    };
  },

  cycleNextTurn(encounter: Cyclable): UpdateTurnOrderReturn {
    return this.cycleTurn({
      updateActiveAndRoundNumber: (participants) => {
        const prev = participants.findIndex((p) => p.is_active);
        if (prev === participants.length - 1) {
          const newlyActiveParticipant = participants[0];

          if (!newlyActiveParticipant) {
            throw new Error("cycleNext: newlyActiveParticipant not found");
          }

          return {
            newlyActiveParticipant,
            updatedRoundNumber: encounter.current_round + 1,
          };
        }

        const newlyActiveParticipant = participants[prev + 1];

        if (!newlyActiveParticipant) {
          throw new Error("cycleNext: newlyActiveParticipant not found");
        }

        return {
          newlyActiveParticipant,
          updatedRoundNumber: encounter.current_round,
        };
      },
      encounter,
    });
  },

  cyclePreviousTurn(encounter: Cyclable): UpdateTurnOrderReturn {
    return this.cycleTurn({
      updateActiveAndRoundNumber: (participants) => {
        const prev = participants.findIndex((p) => p.is_active);
        if (prev === 0 && encounter.current_round === 0) {
          // don't allow negative round numbers, just noop
          const newlyActiveParticipant = participants[prev];
          if (!newlyActiveParticipant) {
            throw new Error("cyclePrevious: newlyActiveParticipant not found");
          }
          return {
            newlyActiveParticipant,
            updatedRoundNumber: 0,
          };
        }

        if (prev === 0) {
          const newlyActiveParticipant = participants[participants.length - 1];

          if (!newlyActiveParticipant) {
            throw new Error("cyclePrevious: newlyActiveParticipant not found");
          }

          return {
            newlyActiveParticipant,
            updatedRoundNumber: encounter.current_round - 1,
          };
        }

        const newlyActiveParticipant = participants[prev - 1];

        if (!newlyActiveParticipant) {
          throw new Error("cyclePrevious: newlyActiveParticipant not found");
        }

        return {
          newlyActiveParticipant,
          updatedRoundNumber: encounter.current_round,
        };
      },
      encounter,
    });
  },

  cycleTurn({ updateActiveAndRoundNumber, encounter }: CycleTurnArgs) {
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

    if (participants.some((p) => p.has_surprise)) {
      return this.cycleTurnWithSurpriseRound({
        updateActiveAndRoundNumber,
        encounter: {
          ...encounter,
          participants: sortedParticipants,
        },
      });
    }

    const candidates = sortedParticipants.filter(
      ParticipantUtils.isActivatable
    );

    const { updatedRoundNumber, newlyActiveParticipant } =
      updateActiveAndRoundNumber(candidates);

    const updatedParticipants = sortedParticipants.map((p) => {
      if (p.id === newlyActiveParticipant.id) {
        return { ...p, is_active: true };
      } else {
        return { ...p, is_active: false };
      }
    });

    return {
      updatedParticipants,
      updatedRoundNumber,
      newlyActiveParticipant,
    };
  },

  cycleTurnWithSurpriseRound({
    updateActiveAndRoundNumber,
    encounter,
  }: CycleTurnArgs) {
    const participants = encounter.participants;
    const isSurpriseRound = encounter?.current_round === 0;

    const activeParticipants = isSurpriseRound
      ? participants.filter((p) => p.has_surprise)
      : participants.filter(ParticipantUtils.isActivatable);

    const { updatedRoundNumber, newlyActiveParticipant } =
      updateActiveAndRoundNumber(activeParticipants);

    if (updatedRoundNumber === 0 && encounter.current_round === 1) {
      // when cycling back to surprise round, set the first active participant to the last surprise participant

      const lastSurpriseParticipant = participants
        .filter((p) => p.has_surprise)
        .pop();
      if (!lastSurpriseParticipant) {
        throw new Error(
          "cycleTurnWithSurprise: lastSurpriseParticipant not found"
        );
      }

      return {
        updatedParticipants: participants.map((p) => ({
          ...p,
          is_active: p.id === lastSurpriseParticipant?.id,
        })),
        updatedRoundNumber,
        newlyActiveParticipant: lastSurpriseParticipant,
      };
    }

    if (updatedRoundNumber === 1 && encounter.current_round === 0) {
      // set first active as just the first active participant when cycling from surprise round

      const firstActive = participants.at(0);
      if (!firstActive) {
        throw new Error("Participants empty?");
      }

      return {
        updatedParticipants: participants.map((p) => ({
          ...p,
          is_active: p.id === firstActive.id,
        })),
        updatedRoundNumber,
        newlyActiveParticipant: firstActive,
      };
    }

    return {
      updatedParticipants: participants.map((p) => ({
        ...p,
        is_active: p.id === newlyActiveParticipant.id,
      })),
      updatedRoundNumber,
      newlyActiveParticipant,
    };
  },
};

type CycleTurnArgs = {
  updateActiveAndRoundNumber: (
    participants: Cyclable["participants"]
  ) => Omit<UpdateTurnOrderReturn, "updatedParticipants">;
  encounter: Cyclable;
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
