"use client";

import { LidndTextArea } from "@/components/ui/lidnd-text-area";
import { Editor, useEditor } from "@tiptap/react";
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
import {
  readImageHeightWidth,
  uploadFileToAWS,
} from "@/app/[username]/[campaign_slug]/CreatureUploadForm";
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

  const { mutateAsync: uploadAsset } = api.upload.useMutation();

  async function uploadAndInsertImage(args: {
    file: File;
    pos?: number;
    currentEditor: Editor;
  }) {
    const { file, pos, currentEditor: editor } = args;
    const { width: imageWidth, height: imageHeight } =
      await readImageHeightWidth(file);
    console.log("Uploading image with dimensions", imageWidth, imageHeight);
    // todo: what if the image already exists?
    const res = await uploadAsset({
      filename: file.name,
      filetype: file.type,
      width: imageWidth,
      height: imageHeight,
    });
    await uploadFileToAWS(file, res.signedUrl);
    editor
      ?.chain()
      .insertContentAt(pos ?? editor.state.selection.anchor, {
        type: "image",
        attrs: {
          src: ImageUtils.url(res.image),
        },
      })
      .focus()
      .run();
  }

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
          files.forEach(async (file) => {
            await uploadAndInsertImage({ file, pos, currentEditor });
          });
        },
        onPaste: (currentEditor, files, htmlContent) => {
          files.forEach(async (file) => {
            await uploadAndInsertImage({ file, currentEditor });
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
