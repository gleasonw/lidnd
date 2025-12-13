"use client";

import { LidndTextArea } from "@/components/ui/lidnd-text-area";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import React from "react";
import { useDebouncedCallback } from "use-debounce";
import styles from "./description-text-area.module.css";
import {
  useEncounter,
  useUpdateEncounter,
} from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/hooks";
import clsx from "clsx";

export function DescriptionTextArea({
  tiptapReadyGate,
}: {
  tiptapReadyGate?: React.ReactNode;
}) {
  const [encounter] = useEncounter();
  const [isTipTapReady, setIsTipTapReady] = React.useState(false);
  const { mutate } = useUpdateEncounter();

  const debouncedUpdate = useDebouncedCallback(async (description: string) => {
    if (!encounter) {
      return;
    }
    mutate({ ...encounter, description });
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
    <div className={clsx("w-full h-full flex min-h-[80px]", styles.root)}>
      <LidndTextArea
        editor={editor}
        placeholder="Objectives, monster tactics, etc..."
      />
      {isTipTapReady && tiptapReadyGate}
    </div>
  );
}
