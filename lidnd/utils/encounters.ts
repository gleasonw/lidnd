import { Reminder } from "@/app/[username]/types";
import { appRoutes } from "@/app/routes";
import { UpdateTurnOrderReturn } from "@/app/[username]/[campaign_slug]/encounter/utils";
import {
  Encounter,
  Participant,
  ParticipantWithData,
} from "@/server/api/router";
import { EncounterWithData } from "@/server/encounters";
import { System } from "@/types";
import { ParticipantUtils } from "@/utils/participants";
import { LidndUser } from "@/app/authentication";

type EncounterWithParticipants<T extends Participant = Participant> =
  Encounter & {
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
      status: encounter.status ?? "active",
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
