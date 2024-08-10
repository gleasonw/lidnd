"use client";
import { Button } from "@/components/ui/button";
import { LidndDialog, LidndPlusDialog } from "@/components/ui/lidnd_dialog";
import { BattleCardShapeTool } from "@/encounters/[encounter_index]/_canvas/battle-card/BattleCardShapeTool";
import { BattleCardShapeUtil } from "@/encounters/[encounter_index]/_canvas/battle-card/BattleCardShapeUtil";
import {
  overrideComponents,
  uiOverrides,
} from "@/encounters/[encounter_index]/_canvas/ui-overrides";
import { useEncounterId } from "@/encounters/[encounter_index]/encounter-id";
import {
  useEncounter,
  useUpdateEncounter,
} from "@/encounters/[encounter_index]/hooks";
import { MonsterUpload } from "@/encounters/[encounter_index]/participant-add-form";
import { api } from "@/trpc/react";
import { useEffect, useRef } from "react";
import {
  ContextMenu,
  DefaultContextMenuContent,
  TldrawEditor,
  TldrawHandles,
  TldrawScribble,
  TldrawSelectionBackground,
  TldrawSelectionForeground,
  TldrawShapeIndicators,
  TldrawUi,
  defaultBindingUtils,
  defaultShapeTools,
  defaultShapeUtils,
  defaultTools,
  registerDefaultExternalContentHandlers,
  registerDefaultSideEffects,
  useEditor,
  useToasts,
  useTranslation,
  DefaultQuickActions,
  DefaultQuickActionsContent,
  TldrawUiMenuItem,
  type TLEditorComponents,
  type TLEditorSnapshot,
  type TLStoreSnapshot,
  type TLUiComponents,
  createShapeId,
  Editor,
} from "tldraw";
import "tldraw/tldraw.css";
import { useDebouncedCallback } from "use-debounce";

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
  const [encounter] = useEncounter();
  const { mutate: updateEncounter } = useUpdateEncounter();

  // prevents infinite loop when we invalidate the encounter state
  const isFirstLoad = useRef(true);

  function handleMount(editor: Editor) {
    window.editor = editor;
    if (!isFirstLoad.current) {
      return;
    }

    if (encounter.canvas_snapshot) {
      editor.loadSnapshot(
        JSON.parse(encounter.canvas_snapshot) as TLStoreSnapshot,
      );

      if (encounter.is_first_canvas_load) {
        editor.run(() => {
          const viewCenter = editor.getViewportScreenCenter();
          editor.createShape({
            id: createShapeId(),
            type: "text",
            props: { text: encounter.name },
            x: viewCenter.x,
            y: viewCenter.y,
          });
        });

        updateEncounter({
          ...encounter,
          is_first_canvas_load: false,
        });
      }

      isFirstLoad.current = false;
    }
  }

  return (
    <TldrawEditor
      initialState="select"
      shapeUtils={[...defaultShapeUtils, BattleCardShapeUtil]}
      bindingUtils={defaultBindingUtils}
      tools={[...defaultTools, ...defaultShapeTools, BattleCardShapeTool]}
      components={defaultEditorComponents}
      onMount={handleMount}
    >
      {children}
    </TldrawEditor>
  );
}

export function EncounterCanvas() {
  return (
    <TldrawUi
      onUiEvent={(data) => console.log(data)}
      components={customUiComponents}
      overrides={uiOverrides}
    >
      <Registration />
    </TldrawUi>
  );
}

function Registration() {
  const editor = useEditor();
  const toasts = useToasts();
  const msg = useTranslation();
  const [encounter] = useEncounter();

  const { mutate: updateSnapshot } = api.updateCanvasSnapshot.useMutation();

  const debounceUpdateSnapshot = useDebouncedCallback(
    (storeSnapshot: TLEditorSnapshot) => {
      const snapshot = JSON.stringify(storeSnapshot);
      updateSnapshot({ encounter_id: encounter.id, snapshot });
    },
    1500,
  );

  const unlisten = editor.store.listen(() => {
    debounceUpdateSnapshot(editor.getSnapshot());
  });

  useEffect(() => {
    registerDefaultExternalContentHandlers(
      editor,
      {
        maxImageDimension: 5000,
        maxAssetSize: 10 * 1024 * 1024, // 10mb
        acceptedImageMimeTypes: ["image/png", "image/jpeg", "image/gif"],
        acceptedVideoMimeTypes: ["video/mp4", "video/webm"],
      },
      {
        toasts,
        msg,
      },
    );

    const cleanupSideEffects = registerDefaultSideEffects(editor);

    return () => {
      cleanupSideEffects();
      unlisten();
    };
  }, [editor, msg, toasts]);
  return (
    <ContextMenu>
      <DefaultContextMenuContent />
    </ContextMenu>
  );
}

// todo add creature buttons
function CustomQuickActions() {
  return (
    <DefaultQuickActions>
      <DefaultQuickActionsContent />
      <TldrawUiMenuItem
        id="code"
        icon="code"
        onSelect={() => window.alert("code")}
      />
      <LidndDialog
        trigger={<Button className="pointer-events-auto">Add monster</Button>}
        content={<MonsterUpload />}
      />
    </DefaultQuickActions>
  );
}

const customUiComponents: TLUiComponents = {
  QuickActions: CustomQuickActions,
  ...overrideComponents,
};
