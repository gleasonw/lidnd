"use client";

import { updateEncounterDescription } from "@/app/dashboard/actions";
import { LidndTextArea } from "@/components/ui/lidnd-text-area";
import { TextareaProps } from "@/components/ui/textarea";
import { Encounter } from "@/server/api/router";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import React from "react";
import { useDebouncedCallback } from "use-debounce";

export interface DescriptionTextProps extends TextareaProps {
  encounter: Encounter;
}

export function DescriptionTextArea(props: DescriptionTextProps) {
  const { encounter } = props;
  const [_, setStatus] = React.useState<"idle" | "saving">("idle");

  const debouncedUpdate = useDebouncedCallback(async (description: string) => {
    if (!encounter) {
      return;
    }
    const formData = new FormData();
    formData.append("description", description);
    await updateEncounterDescription(encounter.id, formData);
    setStatus("idle");
  }, 500);

  const configuredPlaceholder = Placeholder.configure({
    placeholder: "Flow, terrain, monster strategy, etc...",
  });

  const editor = useEditor({
    extensions: [StarterKit, configuredPlaceholder],
    content: encounter.description,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      setStatus("saving");
      debouncedUpdate(content);
    },
  });

  return (
    <LidndTextArea
      editor={editor}
      placeholder="Flow, terrain, monster strategy, etc..."
    />
  );
}
