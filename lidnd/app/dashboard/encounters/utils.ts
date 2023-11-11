import { CreaturePost } from "@/app/dashboard/encounters/[id]/creature-add-form";
import {
  EncounterParticipant,
  Creature,
  EncounterCreature,
  Encounter,
} from "@/server/api/router";
import { Part } from "@aws-sdk/client-s3";

export function getAWSimageURL(
  creature_id: string,
  type: "icon" | "stat_block"
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

export function updateTurnOrder<
  Participant extends {
    is_active: boolean;
    hp: number;
    id: string;
    initiative: number;
    created_at: Date;
    is_player: boolean;
    has_surprise: boolean;
  },
>(
  to: "next" | "previous",
  participants: Participant[],
  encounter: Encounter
): UpdateTurnOrderReturn<Participant> {
  let sortedParticipants = participants.slice().sort(sortEncounterCreatures);
  const previousActiveIndex = sortedParticipants.findIndex((c) => c.is_active);
  let currentActive = participants.find((c) => c.is_active);
  if (!currentActive) {
    sortedParticipants[0].is_active = true;
    currentActive = sortedParticipants[0];
  }

  const isSurpriseRound =
    encounter?.current_round === 0 && participants.some((p) => p.has_surprise);

  let activeParticipants;

  if (isSurpriseRound) {
    activeParticipants = sortedParticipants.filter((c) => c.has_surprise);
  } else {
    // if the active player is dead, we have to keep them in the order until the turn changes.
    // a rare occurrence, but possible.
    // Player characters are always active. Since their HP is default 0, we have to exempt them.
    activeParticipants = sortedParticipants.filter(
      (c) => c.hp > 0 || c.is_active || c.is_player
    );
  }
  let nextActive: Participant;
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
  const updatedOrder = sortedParticipants.map((c) => {
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
  let currentRound = encounter.current_round;
  const newActiveIndex = updatedOrder.findIndex((c) => c.is_active);
  if (to === "next" && newActiveIndex <= previousActiveIndex) {
    currentRound++;
  } else if (to === "previous" && newActiveIndex >= previousActiveIndex) {
    currentRound--;
  }
  return {
    updatedParticipants: updatedOrder,
    updatedRoundNumber: currentRound,
    newlyActiveParticipant: nextActive,
  };
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
export function mergeEncounterCreature(
  participant: EncounterParticipant,
  creature: Creature
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
  };
}
