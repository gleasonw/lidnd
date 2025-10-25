import { useEncounter, useEncounterQueryUtils } from "./hooks";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils } from "@/utils/participants";
import { api } from "@/trpc/react";
import {
  useAwsImageUpload,
  type CreatureUpload,
} from "@/app/[username]/[campaign_slug]/CreatureUploadForm";
import { useUIStore } from "@/app/UIStore";
import type { UseFormReturn } from "react-hook-form";

/**Note: must be called underneath an encounter provider */
export function useUploadParticipant({
  form,
  onSuccess,
}: {
  form: UseFormReturn<CreatureUpload>;
  onSuccess?: () => void;
}) {
  const [encounter] = useEncounter();
  const { encounterById } = api.useUtils();
  const uiStore = useUIStore();
  const id = encounter.id;
  const { invalidateAll, cancelAll } = useEncounterQueryUtils();
  const uploadToAws = useAwsImageUpload({
    //@ts-expect-error - need to fix the types on the form... the playerupload object and the participant upload object differ slightly
    form,
    onSuccess: () => {
      onSuccess?.();
      invalidateAll(encounter);
    },
  });

  return api.uploadParticipant.useMutation({
    onMutate: async (data) => {
      await cancelAll(encounter);
      const previousEncounterData = encounterById.getData(id);
      encounterById.setData(id, (old) => {
        if (!old || !data.participant || !data.creature) {
          console.error(`data missing in createCreatureInEncounter`);
          return;
        }
        const optimisticParticipant =
          ParticipantUtils.placeholderParticipantWithData(
            {
              ...data.participant,
              encounter_id: id,
              creature_id: "pending",
            },
            {
              ...data.creature,
              user_id: "pending",
              is_player: Boolean(data.creature.is_player),
            }
          );
        return EncounterUtils.addParticipant(optimisticParticipant, old);
      });
      return { previousEncounterData };
    },
    onError: (err, variables, context) => {
      console.error(err);
      if (context?.previousEncounterData) {
        encounterById.setData(id, context.previousEncounterData);
      }
    },
    onSuccess: async (data) => {
      uploadToAws({
        iconPresigned: data.iconPresigned,
        statBlockPresigned: data.statBlockPresigned,
        creature: data.creature,
      });
    },
    onSettled: async (data) => {
      if (data?.creature) {
        uiStore.setUploadStatusForCreature(data.creature, {
          type: "icon",
          status: "pending",
        });
        uiStore.setUploadStatusForCreature(data.creature, {
          type: "statBlock",
          status: "pending",
        });
      }

      return await invalidateAll(encounter);
    },
  });
}
