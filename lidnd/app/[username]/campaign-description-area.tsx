"use client";

import { useCampaign } from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { LidndTextArea } from "@/components/ui/lidnd-text-area";
import { api } from "@/trpc/react";
import { Placeholder } from "@tiptap/extensions";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import React from "react";
import { useDebouncedCallback } from "use-debounce";

export function CampaignDescriptionForm() {
  const configuredPlaceholder = Placeholder.configure({
    placeholder: "Setting, hook, etc...",
  });

  const editor = useEditor({
    extensions: [StarterKit, configuredPlaceholder],
  });

  return <LidndTextArea editor={editor} />;
}

export function CampaignDescriptionArea({
  tiptapReadyGate,
}: {
  tiptapReadyGate?: React.ReactNode;
}) {
  const [isTipTapReady, setIsTipTapReady] = React.useState(false);

  const [campaign] = useCampaign();
  const { mutate: updateCampaign } = api.updateCampaign.useMutation();

  const debouncedUpdate = useDebouncedCallback(async (description: string) => {
    // todo: wonky types
    if (!campaign || !campaign.legacySystem?.id) {
      return;
    }

    updateCampaign({
      ...campaign,
      system_id: campaign.legacySystem?.id,
      description,
    });
  }, 500);

  const configuredPlaceholder = Placeholder.configure({
    placeholder: "Description...",
  });

  const editor = useEditor({
    extensions: [StarterKit, configuredPlaceholder],
    content: campaign?.description ?? "",
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      debouncedUpdate(content);
    },
    onCreate: () => {
      console.log("onCreate");
      setIsTipTapReady(true);
    },
  });
  return (
    <>
      <LidndTextArea editor={editor} />
      {isTipTapReady && tiptapReadyGate}
    </>
  );
}
