"use client";

import { updateEncounterDescription } from "@/app/[username]/actions";
import { LidndTextArea } from "@/components/ui/lidnd-text-area";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import React from "react";
import { useDebouncedCallback } from "use-debounce";
import { useEncounter } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/hooks";

export function DescriptionTextArea({
  tiptapReadyGate,
}: {
  tiptapReadyGate?: React.ReactNode;
}) {
  const [encounter] = useEncounter();
  const [isTipTapReady, setIsTipTapReady] = React.useState(false);

  const debouncedUpdate = useDebouncedCallback(async (description: string) => {
    if (!encounter) {
      return;
    }
    const formData = new FormData();
    formData.append("description", description);
    await updateEncounterDescription(encounter.id, formData);
  }, 500);

  const configuredPlaceholder = Placeholder.configure({
    placeholder: "Objectives, monster tactics, etc...",
  });

  const editor = useEditor({
    extensions: [StarterKit, configuredPlaceholder],
    content: encounter.description,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      debouncedUpdate(content);
    },
    onCreate: () => setIsTipTapReady(true),
  });

  return (
    <>
      <LidndTextArea
        editor={editor}
        placeholder="Objectives, monster tactics, etc..."
      />
      {isTipTapReady && tiptapReadyGate}
    </>
  );
}
