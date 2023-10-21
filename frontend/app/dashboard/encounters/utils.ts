import { EncounterCreature } from "@/app/dashboard/encounters/api";

export function getAWSimageURL(
  creature_id: number,
  type: "icon" | "stat_block"
): string {
  return `https://dnd-init-tracker-icons-stats.s3.us-west-1.amazonaws.com/${type}-${creature_id}.png`;
}

export function optimisticTurnUpdate(
  to: "next" | "previous",
  participants?: EncounterCreature[]
): EncounterCreature[] | undefined {
  if (participants && Array.isArray(participants)) {
    const currentActive = participants.find(
      (c: EncounterCreature) => c.is_active
    );
    const activeParticipants = participants.filter(
      (c: EncounterCreature) => c.hp > 0 || c.is_active
    );
    if (currentActive && activeParticipants.length > 1) {
      let nextActive: EncounterCreature;
      if (to === "previous") {
        nextActive =
          activeParticipants[
            (activeParticipants.indexOf(currentActive) - 1) %
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
        if (c.creature_id === nextActive.creature_id) {
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
