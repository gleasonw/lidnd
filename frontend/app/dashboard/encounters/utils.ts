import { CreaturePost } from "@/app/dashboard/encounters/[id]/creature-add-form";
import { EncounterCreature } from "@/app/dashboard/encounters/api";

export function getAWSimageURL(
  creature_id: number,
  type: "icon" | "stat_block"
): string {
  return `https://dnd-init-tracker-icons-stats.s3.us-west-1.amazonaws.com/${type}-${creature_id}.png`;
}

export function sortEncounterCreatures(
  a: EncounterCreature,
  b: EncounterCreature
) {
  return b.initiative - a.initiative || b.creature_id - a.creature_id;
}

export function optimisticTurnUpdate(
  to: "next" | "previous",
  participants?: EncounterCreature[]
): EncounterCreature[] | undefined {
  if (participants && Array.isArray(participants)) {
    const sortedParticipants = participants
      .slice()
      .sort(sortEncounterCreatures);
    const currentActive = participants.find(
      (c: EncounterCreature) => c.is_active
    );
    const activeParticipants = sortedParticipants.filter(
      (c: EncounterCreature) => c.hp > 0 || c.is_active
    );
    if (currentActive && activeParticipants.length > 1) {
      let nextActive: EncounterCreature;
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
      return participants.map((c: EncounterCreature) => {
        if (c.creature_id === nextActive?.creature_id) {
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
  }
  return participants;
}

export function getCreaturePostForm(creature: CreaturePost): FormData {
  const formData = new FormData();
  formData.append("name", creature.name);
  formData.append("max_hp", creature.max_hp.toString());
  formData.append("icon", creature.icon);
  formData.append("stat_block", creature.stat_block);
  formData.append("challenge_rating", creature.challenge_rating.toString());
  return formData;
}
