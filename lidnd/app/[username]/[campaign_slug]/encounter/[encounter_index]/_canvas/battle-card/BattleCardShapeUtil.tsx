import { Card } from "@/components/ui/card";
import { battleCardShapeProps } from "@/encounters/[encounter_index]/_canvas/battle-card/battle-card-shape-props";
import type { BattleCardShape } from "@/encounters/[encounter_index]/_canvas/battle-card/battle-card-shape-types";
import { BattleCard } from "@/encounters/[encounter_index]/battle-ui";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import { PrepParticipantCard } from "@/encounters/[encounter_index]/encounter-prep";
import { useEncounter } from "@/encounters/[encounter_index]/hooks";
import { CreatureStatBlockImage } from "@/encounters/original-size-image";
import { EncounterUtils } from "@/utils/encounters";
import {
  HTMLContainer,
  Rectangle2d,
  ShapeUtil,
  type TLOnResizeHandler,
  resizeBox,
} from "tldraw";

// There's a guide at the bottom of this file!

export class BattleCardShapeUtil extends ShapeUtil<BattleCardShape> {
  static override type = "battle-card" as const;
  // [1]
  static override props = battleCardShapeProps;
  // [2]

  // [3]
  override isAspectRatioLocked = (_shape: BattleCardShape) => false;
  override canResize = (_shape: BattleCardShape) => true;

  // [4]
  getDefaultProps(): BattleCardShape["props"] {
    return {
      w: 300,
      h: 300,
      participantId: "",
    };
  }

  // [5]
  getGeometry(shape: BattleCardShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  // [6]
  component(shape: BattleCardShape) {
    const [encounter] = useEncounter();
    const participant = EncounterUtils.participantFor(
      encounter,
      shape.props.participantId,
    );

    if (!participant) {
      console.log("missing participant for id:", shape.props.participantId);
      return null;
    }

    return (
      <HTMLContainer
        id={shape.id}
        className="w-full h-full flex pointer-events-auto"
      >
        <BattleCard
          participant={participant}
          extraContent={
            <CreatureStatBlockImage creature={participant.creature} />
          }
        />
      </HTMLContainer>
    );
  }

  // [7]
  indicator(shape: BattleCardShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }

  // [8]
  override onResize: TLOnResizeHandler<BattleCardShape> = (shape, info) => {
    return resizeBox(shape, info);
  };
}
/* 
A utility class for the card shape. This is where you define the shape's behavior, 
how it renders (its component and indicator), and how it handles different events.

[1]
A validation schema for the shape's props (optional)
Check out card-shape-props.ts for more info.

[2]
Migrations for upgrading shapes (optional)
Check out card-shape-migrations.ts for more info.

[3]
Letting the editor know if the shape's aspect ratio is locked, and whether it 
can be resized or bound to other shapes. 

[4]
The default props the shape will be rendered with when click-creating one.

[5]
We use this to calculate the shape's geometry for hit-testing, bindings and
doing other geometric calculations. 

[6]
Render method — the React component that will be rendered for the shape. It takes the 
shape as an argument. HTMLContainer is just a div that's being used to wrap our text 
and button. We can get the shape's bounds using our own getGeometry method.
	
- [a] Check it out! We can do normal React stuff here like using setState.
   Annoying: eslint sometimes thinks this is a class component, but it's not.

- [b] You need to stop the pointer down event on buttons, otherwise the editor will
	   think you're trying to select drag the shape.

[7]
Indicator — used when hovering over a shape or when it's selected; must return only SVG elements here

[8]
Resize handler — called when the shape is resized. Sometimes you'll want to do some 
custom logic here, but for our purposes, this is fine.
*/

function TestCard() {
  const [encounter] = useEncounter();
  return <Card>{encounter?.participants.length}</Card>;
}
