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

function isPlayer(participant: ParticipantWithCreature) {
  return participant.creature.is_player;
}

function healthPercent(participant: ParticipantWithCreature) {
  return ((participant.hp / maxHp(participant)) * 100).toFixed(2);
}

function tempHpPercent(p: ParticipantWithCreature) {
  return (p.temporary_hp / maxHp(p)).toFixed(2);
}

function iconHexColor(participant: ParticipantWithCreature) {
  if (isFriendly(participant)) {
    return "#2563eb";
  }
  return participant.hex_color ?? "#dc2626";
}

function statBlockAspectRatio(participant: ParticipantWithCreature) {
  return (
    participant.creature.stat_block_width /
    participant.creature.stat_block_height
  );
}

function colSpan(p: ParticipantWithCreature) {
  if (p.creature.col_span) {
    return p.creature.col_span;
  }
  const ratio = statBlockAspectRatio(p);
  if (ratio < 0.6) {
    return 1;
  }
  if (ratio >= 0.6) {
    return 2;
  }
  return 1;
}

function isDead(p: ParticipantWithCreature) {
  return p.hp <= 0;
}

function isFriendly(p: ParticipantWithCreature) {
  return isPlayer(p) || p.is_ally;
}

function name(p: ParticipantWithCreature) {
  return p.creature.name;
}

function creatureId(p: ParticipantWithCreature) {
  return p.creature.id;
}

function isMinion(p: ParticipantWithCreature): p is MinionParticipant {
  return p.minion_count !== undefined;
}

function maxHp(p: ParticipantWithCreature) {
  return p.creature.max_hp;
}

function percentDamage(p: ParticipantWithCreature) {
  const maxHP = maxHp(p);
  const missingHP = maxHP - p.hp;
  return (missingHP / maxHP) * 100;
}

function challengeRating(p: ParticipantWithCreature) {
  return p.creature.challenge_rating;
}

function placeholderParticipantWithData(
  p: AddParticipant,
  creature: AddCreature
): ParticipantWithData {
  const randomId = Math.random().toString();
  const placeholderCreature = CreatureUtils.placeholder(creature);
  return {
    ...defaultParticipant({
      ...p,
      id: p.id ?? randomId,
    }),
    creature: placeholderCreature,
    status_effects: [],
  };
}

function addStatusEffect(
  p: ParticipantWithData,
  participantEffect: ParticipantWithData["status_effects"][number]
): ParticipantWithData {
  return {
    ...p,
    status_effects: [...p.status_effects, participantEffect],
  };
}

function updateMinionCount(
  p: ParticipantWithCreature & { minion_count: number },
  minions_in_overkill_range: number,
  damage: number
): number {
  // assume input minions does not include the current minion
  const slayableMinionCount = minions_in_overkill_range + 1;
  if (damage <= 0) {
    return p.minion_count;
  }
  const maximumSlainMinions = Math.ceil(damage / maxHp(p));
  const slainMinions = Math.min(slayableMinionCount, maximumSlainMinions);
  const newMinionCount = p.minion_count - slainMinions;
  return Math.max(newMinionCount, 0);
}

function sortLinearly<
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
}

function isActivatable(p: {
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
}

export const ParticipantUtils = {
  isPlayer,
  iconHexColor,
  statBlockAspectRatio,
  colSpan,
  isDead,
  isFriendly,
  name,
  creatureId,
  isMinion,
  maxHp,
  percentDamage,
  challengeRating,
  placeholderParticipantWithData,
  addStatusEffect,
  updateMinionCount,
  sortLinearly,
  isActivatable,
  healthPercent,
  tempHpPercent,
};
