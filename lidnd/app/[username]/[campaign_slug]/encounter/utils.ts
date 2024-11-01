import { CreatureUtils } from "@/utils/creatures";
import type { CreaturePost } from "./types";
import type { Participant, ParticipantWithData } from "@/server/api/router";

/**
 * @deprecated - use CreatureUtils.awsURL
 */
export function getAWSimageURL(
  creature_id: string,
  type: "icon" | "stat_block",
): string {
  return CreatureUtils.awsURL({ id: creature_id }, type);
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
    nickname: p.nickname ?? "",
    notes: p.notes ?? "",
    temporary_hp: p.temporary_hp ?? 0,
    hex_color: p.hex_color ?? "#1890FF",

    column_id: p.column_id ?? null,
    ...p,
  };
}
