import { type RecordProps, T } from "tldraw";
import type { BattleCardShape } from "./battle-card-shape-types";

// Validation for our custom card shape's props, using one of tldraw's default styles
export const battleCardShapeProps: RecordProps<BattleCardShape> = {
  w: T.number,
  h: T.number,
  props: T.object({
    participantId: T.string,
  }),
};

// To generate your own custom styles, check out the custom styles example.
