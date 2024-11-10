import { useCampaignId } from "@/app/[username]/[campaign_slug]/campaign_id";
import { createPlayerAndAddToCampaign } from "@/app/[username]/actions";
import type { CreaturePost } from "@/encounters/types";
import { getCreaturePostForm } from "@/encounters/utils";
import { api } from "@/trpc/react";
import { CreatureUtils } from "@/utils/creatures";
import { useMutation } from "@tanstack/react-query";

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

export function useAddExistingToParty() {
  const campaignId = useCampaignId();
  const { campaignById } = api.useUtils();
  return api.addToParty.useMutation({
    onSettled: async () => {
      return await campaignById.invalidate(campaignId);
    },
    onMutate: async ({ player }) => {
      await campaignById.cancel(campaignId);
      const previous = campaignById.getData(campaignId);
      campaignById.setData(campaignId, (old) => {
        if (!old) {
          return;
        }
        const playerWithPlaceholders = CreatureUtils.placeholder(player);
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

export function useAddNewToParty(campaign: { id: string }) {
  const campaignId = campaign.id;
  const { campaignById } = api.useUtils();

  return useMutation({
    mutationFn: async (data: CreaturePost) => {
      const dataAsForm = getCreaturePostForm(data);
      dataAsForm.set("max_hp", "1");
      await createPlayerAndAddToCampaign(campaignId, dataAsForm);
    },
    onSettled: async () => {
      return await campaignById.invalidate(campaignId);
    },
    onError: (err, variables, context) =>
      console.error(err, variables, context),
    onSuccess: (data) => {
      console.log(data);
    },
    onMutate: async (player) => {
      await campaignById.cancel(campaignId);
      const previous = campaignById.getData(campaignId);
      campaignById.setData(campaignId, (old) => {
        if (!old) {
          return;
        }
        const playerWithPlaceholders = CreatureUtils.placeholder(player);
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
            (p) => p.player_id !== player_id,
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
