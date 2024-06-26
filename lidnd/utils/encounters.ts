import { Reminder } from "@/app/[username]/types";
import { appRoutes } from "@/app/routes";
import { UpdateTurnOrderReturn } from "@/app/[username]/[campaign_slug]/encounter/utils";
import {
  Encounter,
  Participant,
  ParticipantWithData,
  Settings,
} from "@/server/api/router";
import { EncounterWithData } from "@/server/encounters";
import { System } from "@/types";
import { ParticipantUtils } from "@/utils/participants";
import { LidndUser } from "@/app/authentication";
import _ from "lodash";

export const ESTIMATED_TURN_SECONDS = 180;
export const ESTIMATED_ROUNDS = 2;

type EncounterWithParticipants<
  T extends Participant = EncounterWithData["participants"][number],
> = Encounter & {
  participants: T[];
};

type Cyclable = {
  participants: ParticipantWithData[];
  current_round: number;
};

export const EncounterUtils = {
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
      return `${appRoutes.encounter(campaign, encounter, user)}/run`;
    }

    return appRoutes.encounter(campaign, encounter, user);
  },

  initiativeType(encounter: { campaigns: { system: System } }) {
    return encounter.campaigns.system.initiative_type;
  },

  totalCr(encounter: { participants: EncounterWithData["participants"] }) {
    return _.sumBy(encounter.participants, (p) => {
      if (p.is_ally) return 0;
      return ParticipantUtils.challengeRating(p);
    });
  },

  playerCount(encounter: { participants: EncounterWithData["participants"] }) {
    return encounter.participants.filter((p) => ParticipantUtils.isPlayer(p))
      .length;
  },

  findCRBudget(encounter: EncounterWithParticipants, playersLevel: number) {
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

  durationEstimate(
    encounter: EncounterWithParticipants,
    estimatedRounds?: number | null,
    estimatedTurnSeconds?: number | null,
    settings?: Settings
  ) {
    const difficulty = this.difficulty(encounter, null, settings);
    const finalEstimatedRounds =
      estimatedRounds ?? difficulty === "Deadly"
        ? 5
        : difficulty === "Hard"
          ? 4
          : difficulty === "Standard"
            ? 3
            : difficulty === "Easy"
              ? 2
              : 1;
    const finalTurnSeconds =
      estimatedTurnSeconds ?? settings?.average_turn_seconds ?? 180;
    const estimateEncounterSeconds =
      (encounter.participants.length *
        finalEstimatedRounds *
        finalTurnSeconds) /
      60;

    const hourTime = estimateEncounterSeconds / 60;
    const hourCount = Math.floor(hourTime);
    const minuteRemainder = estimateEncounterSeconds % 60;

    if (hourTime >= 1) {
      return `${hourCount} hour${hourCount > 1 ? "s" : ""} ${
        minuteRemainder ? `${Math.floor(minuteRemainder)} minutes` : ""
      }`;
    }

    return `${Math.floor(estimateEncounterSeconds % 60)} minutes`;
  },

  difficulty(
    encounter: EncounterWithParticipants,
    playerLevel?: number | null,
    settings?: Settings
  ) {
    const finalPlayerLevel = playerLevel ?? settings?.default_player_level ?? 1;
    const totalCr = this.totalCr(encounter);

    const { easyTier, standardTier, hardTier } = this.findCRBudget(
      encounter,
      finalPlayerLevel
    );

    if (totalCr <= easyTier) {
      return "Easy";
    } else if (totalCr <= standardTier) {
      return "Standard";
    } else if (totalCr <= hardTier) {
      return "Hard";
    } else {
      return "Deadly";
    }
  },

  participants<T extends Participant>(encounter: EncounterWithParticipants<T>) {
    return encounter.participants;
  },

  monsters(encounter: EncounterWithParticipants<ParticipantWithData>) {
    return this.participants(encounter)
      .filter((p) => !ParticipantUtils.isPlayer(p) && !p.is_ally)
      .toSorted(ParticipantUtils.sortLinearly);
  },

  allies(encounter: EncounterWithParticipants<ParticipantWithData>) {
    return this.participants(encounter)
      .filter((p) => ParticipantUtils.isPlayer(p) || p.is_ally)
      .toSorted(ParticipantUtils.sortLinearly);
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

  removeParticipant(participantId: string, encounter: EncounterWithData) {
    return {
      ...encounter,
      participants: encounter.participants.filter(
        (p) => p.id !== participantId
      ),
    };
  },

  activeReminders(
    {
      reminders,
      current_round,
    }: {
      current_round: number;
      reminders: Reminder[];
    },
    nextRound: number
  ) {
    if (nextRound === current_round || nextRound < current_round) {
      return;
    }

    // 0 means alert every round
    return reminders.filter(
      (reminder) =>
        reminder.alert_after_round === nextRound ||
        reminder.alert_after_round === 0
    );
  },

  addParticipant(
    newParticipant: ParticipantWithData,
    encounter: EncounterWithData
  ) {
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
    const participants = this.participants(encounter);
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
      (p) => p.has_played_this_round
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
    let sortedParticipants = participants.toSorted(
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

const encounterCRPerCharacter = [
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
