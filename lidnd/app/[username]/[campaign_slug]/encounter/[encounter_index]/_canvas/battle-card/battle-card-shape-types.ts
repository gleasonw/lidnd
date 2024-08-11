import type { TLBaseShape } from "tldraw";

// A type for our custom card shape
export type BattleCardShape = TLBaseShape<
  "battle-card",
  {
    w: number;
    h: number;
    participantId: string;
  }
>;
