import type { Creature } from "@/server/api/router";

export const CreatureUtils = {
  iconKey(creature: { id: Creature["id"] }) {
    return `icon-${creature.id}.png`;
  },

  isPlayer(creature: { type: Creature["type"] }) {
    return creature.type === "player";
  },

  startOfEncounterHP(creature: { max_hp: number; type: Creature["type"] }) {
    return this.isPlayer(creature) ? 1 : creature.max_hp;
  },

  statBlockKey(creature: { id: Creature["id"] }) {
    return `stat_block-${creature.id}.png`;
  },

  awsURL(
    creature: { id: Creature["id"] },
    type: "icon" | "statBlock" | "plainAsset"
  ) {
    const key =
      type === "icon" ? this.iconKey(creature) : this.statBlockKey(creature);
    return `https://dnd-init-tracker-icons-stats.s3.us-west-1.amazonaws.com/${key}`;
  },

  placeholder(creature: Partial<Creature>): Creature {
    return {
      ...creature,
      name: creature.name ?? "",
      user_id: creature.user_id ?? "pending",
      id: creature.id ?? "pending",
      created_at: new Date(),
      challenge_rating: creature.challenge_rating ?? 0,
      is_inanimate: creature.is_inanimate ?? false,
      max_hp: creature.max_hp ?? 0,
      initiative_bonus: creature.initiative_bonus ?? 0,
      stat_block_height: creature.stat_block_height ?? 250,
      stat_block_width: creature.stat_block_width ?? 250,
      icon_height: creature.icon_height ?? 250,
      icon_width: creature.icon_width ?? 250,
      type: creature.type ?? "standard_monster",
    };
  },
};
