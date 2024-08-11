import { customShapeTypes } from "@/encounters/[encounter_index]/_canvas/encounter-canvas-editor";
import { createShapeId, type Editor } from "tldraw";

export const EditorUtils = {
  createShapeForParticipant(id: string, editor: Editor) {
    return editor.createShape({
      id: createShapeId(),
      type: customShapeTypes.battleCard,
      props: { participantId: id },
      x: editor.getViewportScreenCenter().x,
      y: editor.getViewportScreenCenter().y,
    });
  },
};
