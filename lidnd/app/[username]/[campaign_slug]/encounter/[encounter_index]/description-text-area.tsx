"use client";

import { LidndTextArea } from "@/components/ui/lidnd-text-area";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import TiptapImage from "@tiptap/extension-image";
import FileHandler from "@tiptap/extension-file-handler";
import React from "react";
import { useDebouncedCallback } from "use-debounce";
import styles from "./description-text-area.module.css";
import {
  useEncounter,
  useUpdateEncounter,
} from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/hooks";
import clsx from "clsx";
import { api } from "@/trpc/react";
import { uploadFileToAWS } from "@/app/[username]/[campaign_slug]/CreatureUploadForm";
import { ImageUtils } from "@/utils/images";

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

  const pendingFiles = React.useRef<Record<string, File>>({});

  const editor = useEditor({
    extensions: [
      StarterKit,
      configuredPlaceholder,
      TiptapImage.configure({
        resize: {
          enabled: true,
          alwaysPreserveAspectRatio: true,
        },
      }),
      FileHandler.configure({
        allowedMimeTypes: [
          "image/png",
          "image/jpeg",
          "image/gif",
          "image/webp",
        ],
        onDrop: (currentEditor, files, pos) => {
          files.forEach((file) => {
            // sort of wonky but we don't have any way of getting the file into the onsuccess mutation callback,
            // and I don't want to pass the whole file through the server
            const requestIdentifier = crypto.randomUUID();
            pendingFiles.current[requestIdentifier] = file;
            uploadAsset({
              filename: file.name,
              filetype: file.type,
              requestOnlyIdentifier: requestIdentifier,
            });
          });
        },
        onPaste: (currentEditor, files, htmlContent) => {
          files.forEach((file) => {
            const requestOnlyIdentifier = crypto.randomUUID();
            pendingFiles.current[requestOnlyIdentifier] = file;
            uploadAsset({
              filename: file.name,
              filetype: file.type,
              requestOnlyIdentifier,
            });
          });
        },
      }),
    ],
    content: encounter.description,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      debouncedUpdate(content);
    },
    onCreate: () => setIsTipTapReady(true),
  });

  // i don't love how this flow works. mostly, the fact that react query mutations accept a callback is
  // making this more complex
  const { mutate: uploadAsset } = api.upload.useMutation({
    onSuccess: async (data) => {
      const fileForName = pendingFiles.current[data.requestOnlyIdentifier];
      if (!fileForName) {
        console.error(
          `No pending file found for filename ${data.image.name} when uploading asset`
        );
        return;
      }
      await uploadFileToAWS(fileForName, data.signedUrl);
      editor
        ?.chain()
        .insertContentAt(editor.state.selection.anchor, {
          type: "image",
          attrs: {
            src: ImageUtils.url(data.image),
          },
        })
        .focus()
        .run();
    },
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
