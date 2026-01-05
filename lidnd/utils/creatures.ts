import type { Creature } from "@/server/api/router";
import { baseAwsUrl } from "@/utils/images";

export const statBlockPrefix = "stat_block-";

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
    return `${statBlockPrefix}${creature.id}.png`;
  },

  awsURL(
    creature: { id: Creature["id"] },
    type: "icon" | "statBlock" | "plainAsset"
  ) {
    const key =
      type === "icon" ? this.iconKey(creature) : this.statBlockKey(creature);
    return `${baseAwsUrl}/${key}`;
  },

  withDefaults(creature: Partial<Creature>): Creature {
    // TODO: ensure these match the defaults in the DB schema
    return {
      ...creature,
      name: creature.name ?? "",
      user_id: creature.user_id ?? "pending",
      id: creature.id ?? "pending",
      created_at: new Date(),
      challenge_rating: creature.challenge_rating ?? 0,
      max_hp: creature.max_hp ?? 0,
      initiative_bonus: creature.initiative_bonus ?? 0,
      stat_block_height: creature.stat_block_height ?? 250,
      stat_block_width: creature.stat_block_width ?? 250,
      icon_height: creature.icon_height ?? 250,
      icon_width: creature.icon_width ?? 250,
      type: creature.type ?? "standard_monster",
      stat_block_asset: creature.stat_block_asset ?? null,
    };
  },
};
