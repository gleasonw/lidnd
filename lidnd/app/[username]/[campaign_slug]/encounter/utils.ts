import type { Participant, ParticipantWithData } from "@/server/api/router";
import type { TurnGroup } from "@/server/db/schema";
import type { EncounterWithData } from "@/server/sdk/encounters";

export type CyclableEncounter = Pick<
  EncounterWithData,
  "participants" | "current_round"
> & { turn_groups: Pick<TurnGroup, "has_played_this_round" | "id">[] };

export type UpdateTurnOrderReturn<E extends CyclableEncounter> = {
  updatedEncounter: E;
  newlyActiveParticipant: ParticipantWithData;
};

declare const __brand: unique symbol;

type Brand<B> = { [__brand]: B };
export type Branded<T, B> = T & Brand<B>;

export type CreaturePostData = Branded<FormData, "CreaturePostData">;

export function defaultParticipant(
  p: Partial<Participant> & {
    id: string;
    encounter_id: string;
    creature_id: string;
  }
): Participant {
  return {
    is_active: p.is_active ?? false,
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
    max_hp_override: p.max_hp_override ?? null,
    column_id: p.column_id ?? null,
    inanimate: p.inanimate ?? false,
    turn_group_id: p.turn_group_id ?? null,
    ...p,
  };
}
