import { Creature, Participant } from "@/server/api/router";

type ParticipantWithCreature = Participant & { creature: Creature };
type MinionParticipant = ParticipantWithCreature & { minion_count: number };

export const ParticipantUtils = {
  isPlayer(participant: ParticipantWithCreature) {
    return participant.creature.is_player;
  },

  name(participant: ParticipantWithCreature) {
    return participant.creature.name;
  },

  isMinion(
    participant: ParticipantWithCreature
  ): participant is MinionParticipant {
    return participant.minion_count !== undefined;
  },

  maxHp(participant: ParticipantWithCreature) {
    return participant.creature.max_hp;
  },

  challengeRating(participant: ParticipantWithCreature) {
    return participant.creature.challenge_rating;
  },

  updateMinionCount(
    participant: ParticipantWithCreature & { minion_count: number },
    minions_in_overkill_range: number,
    damage: number
  ): number {
    // assume input minions does not include the current minion
    const slayableMinionCount = minions_in_overkill_range + 1;
    if (damage <= 0) {
      return participant.minion_count;
    }
    const maximumSlainMinions = Math.ceil(damage / this.maxHp(participant));
    const slainMinions = Math.min(slayableMinionCount, maximumSlainMinions);
    const newMinionCount = participant.minion_count - slainMinions;
    return Math.max(newMinionCount, 0);
  },

  sortLinearly<T extends { initiative: number; created_at: Date; id: string }>(
    a: T,
    b: T
  ) {
    return (
      b.initiative - a.initiative ||
      a.created_at.getTime() - b.created_at.getTime() ||
      a.id.localeCompare(b.id)
    );
  },

  isActivatable(p: {
    hp: number;
    is_active: boolean;
    creature: {
      is_player: boolean;
    };
  }) {
    // if the active player is dead, we have to keep them in the order until the turn changes.
    // a rare occurrence, but possible.
    // Player characters are always active. Since their HP is default 0, we have to exempt them.
    return p.hp > 0 || p.is_active || p.creature.is_player;
  },
};
