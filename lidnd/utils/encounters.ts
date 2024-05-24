import { UpdateTurnOrderReturn } from "@/encounters/utils";
import {
  Encounter,
  Participant,
  ParticipantCreature,
} from "@/server/api/router";
import { System } from "@/types";
import { ParticipantUtils } from "@/utils/participants";

type EncounterWithParticipants<T extends Participant = Participant> =
  Encounter & {
    participants: T[];
  };

export const EncounterUtils = {
  initiativeType(encounter: { campaign: { system: System } }) {
    return encounter.campaign.system.initiative_type;
  },

  participants<T extends Participant>(encounter: EncounterWithParticipants<T>) {
    return encounter.participants;
  },

  monsters(encounter: EncounterWithParticipants<ParticipantCreature>) {
    return this.participants(encounter)
      .filter((p) => !ParticipantUtils.isPlayer(p) && !p.is_ally)
      .toSorted(ParticipantUtils.sortLinearly);
  },

  allies(encounter: EncounterWithParticipants<ParticipantCreature>) {
    return this.participants(encounter)
      .filter((p) => ParticipantUtils.isPlayer(p) || p.is_ally)
      .toSorted(ParticipantUtils.sortLinearly);
  },

  findCreatureForParticipant(
    id: string,
    encounter: EncounterWithParticipants<ParticipantCreature>
  ) {
    const creature = encounter.participants.find((p) => p.id === id)?.creature;

    if (!creature) {
      throw new Error(
        `No creature found for participant ${id}. This should never happen!`
      );
    }

    return creature;
  },

  updateGroupTurn(
    participant_id: string,
    participant_has_played_this_round: boolean,
    encounter: EncounterWithParticipants
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

  cycleNextTurn(
    encounter: EncounterWithParticipants<ParticipantCreature>
  ): UpdateTurnOrderReturn {
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

  cyclePreviousTurn(
    encounter: EncounterWithParticipants<ParticipantCreature>
  ): UpdateTurnOrderReturn {
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
    const participants = EncounterUtils.participants(encounter);
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
        encounter,
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
    participants: Participant[]
  ) => Omit<UpdateTurnOrderReturn, "updatedParticipants">;
  encounter: EncounterWithParticipants<ParticipantCreature>;
};
