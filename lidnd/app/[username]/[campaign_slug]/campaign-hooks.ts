import { useCampaignId } from "@/app/[username]/[campaign_slug]/campaign_id";
import { useAwsImageUpload } from "@/app/[username]/[campaign_slug]/CreatureUploadForm";
import { api } from "@/trpc/react";
import { CreatureUtils } from "@/utils/creatures";

import { useEditor } from "@tiptap/react";

import StarterKit from "@tiptap/starter-kit";

export function useCampaign() {
  const campaignId = useCampaignId();
  return api.campaignById.useSuspenseQuery(campaignId);
}

export function useUpdateCampaign(campaign: { id: string }) {
  const campaignId = campaign.id;
  const { campaignById } = api.useUtils();
  return api.updateCampaign.useMutation({
    onSettled: async () => {
      return await campaignById.invalidate(campaignId);
    },
    onMutate: async (campaign) => {
      await campaignById.cancel(campaignId);
      const previous = campaignById.getData(campaignId);
      campaignById.setData(campaignId, (old) => {
        if (!old) {
          return;
        }
        return {
          ...old,
          ...campaign,
        };
      });
      return { previous };
    },
  });
}

export function useAddNewToParty({
  campaign,
  statBlockImage,
  iconImage,
}: {
  campaign: { id: string };
  statBlockImage?: File;
  iconImage?: File;
}) {
  const campaignId = campaign.id;
  const { campaignById } = api.useUtils();
  const uploadToAws = useAwsImageUpload({
    statBlockImage,
    iconImage,
  });
  return api.createCreatureAndAddToParty.useMutation({
    onSuccess: async (data) => {
      uploadToAws({
        iconPresigned: data.iconPresigned,
        statBlockPresigned: data.statBlockPresigned,
        creature: data.newPartyMember,
      });
    },
    onSettled: async () => {
      return await campaignById.invalidate(campaignId);
    },
    onMutate: async ({ creature }) => {
      await campaignById.cancel(campaignId);
      const previous = campaignById.getData(campaignId);
      campaignById.setData(campaignId, (old) => {
        if (!old) {
          return;
        }
        const playerWithPlaceholders = CreatureUtils.placeholder({
          ...creature,
          is_player: Boolean(creature.is_player),
        });
        return {
          ...old,
          campaignToPlayers: [
            ...old.campaignToPlayers,
            {
              campaign_id: campaignId,
              player: playerWithPlaceholders,
              player_id: playerWithPlaceholders.id,
              id: Math.random().toString(),
            },
          ],
        };
      });
      return { previous };
    },
  });
}

export function useAddExistingToParty(campaign: { id: string }) {
  const campaignId = campaign.id;
  const { campaignById } = api.useUtils();

  return api.addExistingCreatureToParty.useMutation({
    onMutate: async ({ creature }) => {
      await campaignById.cancel(campaignId);
      const previous = campaignById.getData(campaignId);
      campaignById.setData(campaignId, (old) => {
        if (!old) {
          return;
        }
        const playerWithPlaceholders = CreatureUtils.placeholder({
          ...creature,
          is_player: Boolean(creature.is_player),
        });
        return {
          ...old,
          campaignToPlayers: [
            ...old.campaignToPlayers,
            {
              campaign_id: campaignId,
              player: playerWithPlaceholders,
              player_id: playerWithPlaceholders.id,
              id: Math.random().toString(),
            },
          ],
        };
      });
      return { previous };
    },
  });
}

export function useRemoveFromParty(campaign: { id: string }) {
  const campaignId = campaign.id;
  const { campaignById } = api.useUtils();
  const mutation = api.removeFromParty.useMutation({
    onSettled: async () => {
      return await campaignById.invalidate(campaignId);
    },
    onMutate: async ({ player_id }) => {
      await campaignById.cancel(campaignId);
      const previous = campaignById.getData(campaignId);
      campaignById.setData(campaignId, (old) => {
        if (!old) {
          return;
        }
        return {
          ...old,
          campaignToPlayers: old.campaignToPlayers.filter(
            (p) => p.player_id !== player_id
          ),
        };
      });
      return { previous };
    },
  });

  return {
    ...mutation,
    mutate: (player_id: string) => {
      mutation.mutate({ player_id, campaign_id: campaignId });
    },
  };
}

export function useTiptapEditor(content?: string) {
  return useEditor({
    extensions: [StarterKit],
    content,
  });
}
