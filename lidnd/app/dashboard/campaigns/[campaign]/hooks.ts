import { api } from "@/trpc/react";
import { usePathname } from "next/navigation";

import { useEditor } from "@tiptap/react";

import StarterKit from "@tiptap/starter-kit";
export function useCampaignId() {
  const pathName = usePathname();

  const campaignId = pathName.split("/")[3];

  if (campaignId === undefined) {
    throw new Error("Attempted to use campaign id but not found");
  }

  return campaignId;
}

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
