import { defaultParticipant } from "@/app/[username]/[campaign_slug]/encounter/utils";
import type {
  Creature,
  Participant,
  ParticipantWithData,
} from "@/server/api/router";
import type { AddCreature, AddParticipant } from "@/types";
import { CreatureUtils } from "@/utils/creatures";

type ParticipantWithCreature = Participant & { creature: Creature };
type MinionParticipant = ParticipantWithCreature & { minion_count: number };

export const ParticipantUtils = {
  isPlayer(participant: ParticipantWithCreature) {
    return participant.creature.is_player;
  },

  iconHexColor(participant: ParticipantWithCreature) {
    if (this.isFriendly(participant)) {
      return "#2563eb";
    }
    return participant.hex_color ?? "#dc2626";
  },

  isDead(participant: ParticipantWithCreature) {
    return participant.hp <= 0;
  },

  isFriendly(participant: ParticipantWithCreature) {
    return this.isPlayer(participant) || participant.is_ally;
  },

  name(participant: ParticipantWithCreature) {
    return participant.creature.name;
  },

  creatureId(participant: ParticipantWithCreature) {
    return participant.creature.id;
  },

  isMinion(
    participant: ParticipantWithCreature
  ): participant is MinionParticipant {
    return participant.minion_count !== undefined;
  },

  maxHp(participant: ParticipantWithCreature) {
    return participant.creature.max_hp;
  },

  percentDamage(participant: ParticipantWithCreature) {
    const maxHP = this.maxHp(participant);
    const missingHP = maxHP - participant.hp;
    return (missingHP / maxHP) * 100;
  },

  challengeRating(participant: ParticipantWithCreature) {
    return participant.creature.challenge_rating;
  },

  placeholderParticipantWithData(
    participant: AddParticipant,
    creature: AddCreature
  ): ParticipantWithData {
    const randomId = Math.random().toString();
    const placeholderCreature = CreatureUtils.placeholder(creature);
    return {
      ...defaultParticipant({
        ...participant,
        id: participant.id ?? randomId,
      }),
      creature: placeholderCreature,
      status_effects: [],
    };
  },

  addStatusEffect(
    participant: ParticipantWithData,
    participantEffect: ParticipantWithData["status_effects"][number]
  ): ParticipantWithData {
    return {
      ...participant,
      status_effects: [...participant.status_effects, participantEffect],
    };
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

  sortLinearly<
    T extends { initiative: number; created_at: Date | string; id: string },
  >(a: T, b: T) {
    // react query data serialized on server will not be a Date object
    const aTime =
      a.created_at instanceof Date
        ? a.created_at.getTime()
        : new Date(a.created_at).getTime();
    const bTime =
      b.created_at instanceof Date
        ? b.created_at.getTime()
        : new Date(b.created_at).getTime();
    return (
      b.initiative - a.initiative || aTime - bTime || a.id.localeCompare(b.id)
    );
  },

  isActivatable(p: {
    hp: number;
    is_active: boolean;
    creature: {
      is_player: boolean;
    };
  }) {
    // if the active creature is dead, we have to keep them in the order until the turn changes.
    // a rare occurrence, but possible.
    // update: we just remove creatures from the order with 0 hp, and set the next to active.
    return p.hp > 0 || p.is_active;
  },
};
