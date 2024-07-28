import { Creature } from "@/server/api/router";

export const CreatureUtils = {
  iconKey(creature: { id: Creature["id"] }) {
    return `icon-${creature.id}.png`;
  },
  statBlockKey(creature: { id: Creature["id"] }) {
    return `stat_block-${creature.id}.png`;
  },
  awsURL(creature: { id: Creature["id"] }, type: "icon" | "stat_block") {
    const key =
      type === "icon" ? this.iconKey(creature) : this.statBlockKey(creature);
    return `https://dnd-init-tracker-icons-stats.s3.us-west-1.amazonaws.com/${key}`;
  },
};
