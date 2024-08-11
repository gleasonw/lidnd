"use client";
import { BattleCardShapeTool } from "@/encounters/[encounter_index]/_canvas/battle-card/BattleCardShapeTool";
import { BattleCardShapeUtil } from "@/encounters/[encounter_index]/_canvas/battle-card/BattleCardShapeUtil";
import { useEncounterId } from "@/encounters/[encounter_index]/encounter-id";
import { api } from "@/trpc/react";
import {
  TldrawEditor,
  TldrawHandles,
  TldrawScribble,
  TldrawSelectionBackground,
  TldrawSelectionForeground,
  TldrawShapeIndicators,
  defaultBindingUtils,
  defaultShapeTools,
  defaultShapeUtils,
  defaultTools,
  type TLEditorComponents,
  type TLEditorSnapshot,
} from "tldraw";
import "tldraw/tldraw.css";

export const customShapeTypes = {
  battleCard: "battle-card",
} as const;

const defaultEditorComponents = {
  Scribble: TldrawScribble,
  ShapeIndicators: TldrawShapeIndicators,
  CollaboratorScribble: TldrawScribble,
  SelectionForeground: TldrawSelectionForeground,
  SelectionBackground: TldrawSelectionBackground,
  Handles: TldrawHandles,
} satisfies TLEditorComponents;

export function EncounterCanvasEditor({
  children,
}: {
  children: React.ReactNode;
}) {
  const encounterId = useEncounterId();
  const { data: snapshot } = api.canvasSnapshots.useQuery(encounterId);
  return (
    <TldrawEditor
      initialState="select"
      shapeUtils={[...defaultShapeUtils, BattleCardShapeUtil]}
      bindingUtils={defaultBindingUtils}
      tools={[...defaultTools, ...defaultShapeTools, BattleCardShapeTool]}
      components={defaultEditorComponents}
      onMount={(editor) => {
        if (snapshot?.snapshot) {
          const snap = JSON.parse(snapshot.snapshot) as TLEditorSnapshot;
          console.log(
            snap.document.schema.schemaVersion,
            "persisted schema version",
          );
          console.log(
            editor.getSnapshot().document.schema.schemaVersion,
            "current schema version",
          );

          console.log("loading snapshot");
          editor.loadSnapshot(snap);
        }
      }}
    >
      {children}
    </TldrawEditor>
  );
}
