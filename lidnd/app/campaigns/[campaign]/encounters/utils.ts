import { CreaturePost } from "@/app/campaigns/[campaign]/encounters/[id]/creature-add-form";
import {
  EncounterParticipant,
  Creature,
  EncounterCreature,
} from "@/server/api/router";

export function getAWSimageURL(
  creature_id: string,
  type: "icon" | "stat_block",
): string {
  return `https://dnd-init-tracker-icons-stats.s3.us-west-1.amazonaws.com/${type}-${creature_id}.png`;
}

export function sortEncounterCreatures<
  T extends { initiative: number; created_at: Date; id: string },
>(a: T, b: T) {
  return (
    b.initiative - a.initiative ||
    a.created_at.getTime() - b.created_at.getTime() ||
    a.id.localeCompare(b.id)
  );
}

export type UpdateTurnOrderReturn<T> = {
  updatedParticipants: T[];
  updatedRoundNumber: number;
  newlyActiveParticipant: T;
};

function participantIsActivatable(p: {
  hp: number;
  is_active: boolean;
  is_player: boolean;
}) {
  // if the active player is dead, we have to keep them in the order until the turn changes.
  // a rare occurrence, but possible.
  // Player characters are always active. Since their HP is default 0, we have to exempt them.
  return p.hp > 0 || p.is_active || p.is_player;
}

export function updateMinionCount(
  participant: Pick<EncounterCreature, "minion_count" | "max_hp">,
  minions_in_overkill_range: number,
  damage: number,
): number | undefined {
  // assume input minions does not include the current minion
  const slayableMinionCount = minions_in_overkill_range + 1;
  if (!participant.minion_count) {
    return undefined;
  }
  if (damage <= 0) {
    return participant.minion_count;
  }
  const maximumSlainMinions = Math.ceil(damage / participant.max_hp);
  const slainMinions = Math.min(slayableMinionCount, maximumSlainMinions);
  const newMinionCount = participant.minion_count - slainMinions;
  return Math.max(newMinionCount, 0);
}

type TurnParticipant = {
  is_active: boolean;
  hp: number;
  id: string;
  initiative: number;
  created_at: Date;
  is_player: boolean;
  has_surprise: boolean;
};

export function cycleNextTurn<Participant extends TurnParticipant>(
  participants: Participant[],
  encounter: { current_round: number },
): UpdateTurnOrderReturn<Participant> {
  return cycleTurn({
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
    participants,
    encounter,
  });
}

export function cyclePreviousTurn<Participant extends TurnParticipant>(
  participants: Participant[],
  encounter: { current_round: number },
): UpdateTurnOrderReturn<Participant> {
  return cycleTurn({
    updateActiveAndRoundNumber: (participants) => {
      const prev = participants.findIndex((p) => p.is_active);
      if (prev === 0 && encounter.current_round === 0) {
        // don't allow negative round numbers, just noop
        return {
          newlyActiveParticipant: participants[prev],
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
    participants,
  });
}

type CycleTurnArgs<Participant extends TurnParticipant> = {
  updateActiveAndRoundNumber: (
    participants: Participant[],
  ) => Omit<UpdateTurnOrderReturn<Participant>, "updatedParticipants">;
  participants: Participant[];
  encounter: { current_round: number };
};

function cycleTurn<Participant extends TurnParticipant>({
  updateActiveAndRoundNumber,
  participants,
  encounter,
}: CycleTurnArgs<Participant>) {
  let sortedParticipants = participants.toSorted(sortEncounterCreatures);

  if (!sortedParticipants.some((p) => p.is_active)) {
    console.warn(
      "No active participant found, which is odd. Setting first participant active",
    );
    sortedParticipants[0].is_active = true;
  }

  if (participants.some((p) => p.has_surprise)) {
    return cycleTurnWithSurpriseRound({
      updateActiveAndRoundNumber,
      participants: sortedParticipants,
      encounter,
    });
  }

  const candidates = sortedParticipants.filter(participantIsActivatable);

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
}

function cycleTurnWithSurpriseRound<Participant extends TurnParticipant>({
  updateActiveAndRoundNumber,
  participants,
  encounter,
}: CycleTurnArgs<Participant>) {
  const isSurpriseRound = encounter?.current_round === 0;

  const activeParticipants = isSurpriseRound
    ? participants.filter((p) => p.has_surprise)
    : participants.filter(participantIsActivatable);

  const { updatedRoundNumber, newlyActiveParticipant } =
    updateActiveAndRoundNumber(activeParticipants);

  if (updatedRoundNumber === 0 && encounter.current_round === 1) {
    const lastSurpriseParticipant = participants
      .filter((p) => p.has_surprise)
      .pop();

    if (!lastSurpriseParticipant) {
      throw new Error(
        "cycleTurnWithSurprise: lastSurpriseParticipant not found",
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
}

export function getCreaturePostForm(creature: CreaturePost): FormData {
  const formData = new FormData();
  Object.keys(creature).forEach((key) => {
    formData.append(key, creature[key as keyof CreaturePost]);
  });
  return formData;
}
export function mergeEncounterCreature(
  participant: EncounterParticipant,
  creature: Creature,
): EncounterCreature {
  return {
    id: participant.id,
    encounter_id: participant.encounter_id,
    creature_id: participant.creature_id,
    name: creature.name,
    challenge_rating: creature.challenge_rating,
    max_hp: creature.max_hp,
    hp: participant.hp,
    is_active: participant.is_active,
    is_player: creature.is_player,
    initiative: participant.initiative,
    created_at: participant.created_at,
    user_id: creature.user_id,
    has_surprise: participant.has_surprise,
    status_effects: [],
    minion_count: participant.minion_count,
    has_played_this_round: participant.has_played_this_round,
  };
}

export function updateGroupTurn<
  Participant extends {
    has_played_this_round: boolean;
    id: string;
  },
>(
  participant_id: string,
  participant_has_played_this_round: boolean,
  participants: Participant[],
  encounter: { current_round: number },
): UpdateTurnOrderReturn<Participant> {
  const participantWhoPlayed = participants.find(
    (p) => p.id === participant_id,
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
    (p) => p.has_played_this_round,
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
}
