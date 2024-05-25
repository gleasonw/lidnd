import { Reminder } from "@/encounters/[id]/page";
import { CreaturePost } from "./types";
import { Participant, ParticipantWithData } from "@/server/api/router";

export function getAWSimageURL(
  creature_id: string,
  type: "icon" | "stat_block",
): string {
  return `https://dnd-init-tracker-icons-stats.s3.us-west-1.amazonaws.com/${type}-${creature_id}.png`;
}

export type UpdateTurnOrderReturn = {
  updatedParticipants: ParticipantWithData[];
  updatedRoundNumber: number;
  newlyActiveParticipant: ParticipantWithData;
};

declare const __brand: unique symbol;

type Brand<B> = { [__brand]: B };
export type Branded<T, B> = T & Brand<B>;

export type CreaturePostData = Branded<FormData, "CreaturePostData">;

export function getCreaturePostForm(creature: CreaturePost): CreaturePostData {
  const formData = new FormData();
  Object.keys(creature).forEach((key) => {
    formData.append(key, creature[key as keyof CreaturePost]);
  });
  return formData as CreaturePostData;
}

export function defaultParticipant(
  p: Partial<Participant> & {
    id: string;
    encounter_id: string;
    creature_id: string;
  },
): Participant {
  return {
    is_active: p.is_active ?? false,
    has_surprise: p.has_surprise ?? false,
    minion_count: p.minion_count ?? 0,
    has_played_this_round: false,
    is_ally: p.is_ally ?? false,
    initiative: p.initiative ?? 0,
    hp: p.hp ?? 0,
    created_at: new Date(),
    ...p,
  };
}

export function activeReminders({
  previousRound,
  currentRound,
  reminders,
}: {
  previousRound: number;
  currentRound: number;
  reminders: Reminder[];
}) {
  if (currentRound === previousRound || currentRound < previousRound) {
    return;
  }

  // 0 means alert every round
  return reminders.filter(
    (reminder) =>
      reminder.alert_after_round === currentRound ||
      reminder.alert_after_round === 0,
  );
}
