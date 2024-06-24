import { useCampaignId } from "@/app/[username]/[campaign_slug]/campaign_id";
import { api } from "@/trpc/react";

import { useEditor } from "@tiptap/react";

import StarterKit from "@tiptap/starter-kit";

export function useCampaign() {
  const campaignId = useCampaignId();
  return api.campaignById.useSuspenseQuery(campaignId);
}

export function useTiptapEditor(content?: string) {
  return useEditor({
    extensions: [StarterKit],
    content,
  });
}
