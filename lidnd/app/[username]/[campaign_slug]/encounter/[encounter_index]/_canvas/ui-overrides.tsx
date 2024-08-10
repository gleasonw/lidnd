import {
  DefaultKeyboardShortcutsDialog,
  DefaultKeyboardShortcutsDialogContent,
  DefaultToolbar,
  DefaultToolbarContent,
  type TLComponents,
  type TLUiOverrides,
  TldrawUiMenuItem,
  useIsToolSelected,
  useTools,
} from "tldraw";

// There's a guide at the bottom of this file!

export const uiOverrides: TLUiOverrides = {
  tools(editor, tools) {
    // Create a tool item in the ui's context.
    tools.battleCard = {
      id: "battle-card",
      icon: "color",
      label: "Battle Card",
      kbd: "c",
      onSelect: () => {
        editor.setCurrentTool("battle-card");
      },
    };
    return tools;
  },
};

export const overrideComponents = {
  Toolbar: (props) => {
    const tools = useTools();
    const isCardSelected = useIsToolSelected(tools.battleCard);
    return (
      <DefaultToolbar {...props}>
        <TldrawUiMenuItem {...tools.battleCard} isSelected={isCardSelected} />
        <DefaultToolbarContent />
      </DefaultToolbar>
    );
  },
  KeyboardShortcutsDialog: (props) => {
    const tools = useTools();
    return (
      <DefaultKeyboardShortcutsDialog {...props}>
        <TldrawUiMenuItem {...tools.battleCard} />
        <DefaultKeyboardShortcutsDialogContent />
      </DefaultKeyboardShortcutsDialog>
    );
  },
} satisfies TLComponents;

/* 

This file contains overrides for the Tldraw UI. These overrides are used to add your custom tools to
the toolbar and the keyboard shortcuts menu.

First we have to add our new tool to the tools object in the tools override. This is where we define
all the basic information about our new tool - its icon, label, keyboard shortcut, what happens when
we select it, etc.

Then, we replace the UI components for the toolbar and keyboard shortcut dialog with our own, that
add our new tool to the existing default content. Ideally, we'd interleave our new tool into the
ideal place among the default tools, but for now we're just adding it at the start to keep things
simple.
*/
