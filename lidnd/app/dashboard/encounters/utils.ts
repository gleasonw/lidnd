import { CreaturePost } from "@/app/dashboard/encounters/[id]/creature-add-form";

export function getAWSimageURL(
  creature_id: string,
  type: "icon" | "stat_block"
): string {
  return `https://dnd-init-tracker-icons-stats.s3.us-west-1.amazonaws.com/${type}-${creature_id}.png`;
}

export function sortEncounterCreatures<
  T extends { initiative: number; created_at: Date }
>(a: T, b: T) {
  return (
    b.initiative - a.initiative ||
    b.created_at.getTime() - a.created_at.getTime()
  );
}

export function updateTurnOrder<
  T extends {
    is_active: boolean;
    hp: number;
    id: string;
    initiative: number;
    created_at: Date;
  }
>(to: "next" | "previous", participants?: T[]): T[] | undefined {
  if (participants && Array.isArray(participants)) {
    let sortedParticipants = participants.slice().sort(sortEncounterCreatures);
    let currentActive = participants.find((c) => c.is_active);
    if (!currentActive) {
      // this should never happen, but just in case
      console.warn("No active creature found, defaulting to first creature");
      currentActive = sortedParticipants[0];
      sortedParticipants = sortedParticipants.map((c) => {
        if (c.id === currentActive?.id) {
          return {
            ...c,
            is_active: true,
          };
        }
        return {
          ...c,
          is_active: false,
        };
      });
    }
    const activeParticipants = sortedParticipants.filter(
      (c) => c.hp > 0 || c.is_active
    );
    if (currentActive && activeParticipants.length > 1) {
      let nextActive: T;
      if (to === "previous") {
        nextActive =
          activeParticipants[
            (activeParticipants.indexOf(currentActive) -
              1 +
              activeParticipants.length) %
              activeParticipants.length
          ];
      } else {
        nextActive =
          activeParticipants[
            (activeParticipants.indexOf(currentActive) + 1) %
              activeParticipants.length
          ];
      }
      return sortedParticipants.map((c) => {
        if (c.id === nextActive?.id) {
          return {
            ...c,
            is_active: true,
          };
        }
        return {
          ...c,
          is_active: false,
        };
      });
    } else {
      // if there is only one active participant, just return the original array
      return sortedParticipants;
    }
  }
  return participants;
}

export function getCreaturePostForm(creature: CreaturePost): FormData {
  const formData = new FormData();
  formData.append("name", creature.name);
  formData.append("max_hp", creature.max_hp?.toString() || "");
  formData.append("icon_image", creature.icon_image);
  formData.append("stat_block_image", creature.stat_block_image);
  formData.append(
    "challenge_rating",
    creature.challenge_rating?.toString() || ""
  );
  formData.append("is_player", creature.is_player?.toString() || "");
  return formData;
}