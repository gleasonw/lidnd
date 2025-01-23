import { useEncounter, useEncounterQueryUtils } from "./hooks";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils } from "@/utils/participants";
import { api } from "@/trpc/react";
import { useAwsImageUpload } from "@/app/[username]/[campaign_slug]/CreatureUploadForm";

/**Note: must be called underneath an encounter provider */
export function useUploadParticipant({
  creatureStatBlock,
  creatureIcon,
  onSuccess,
}: {
  creatureStatBlock?: File;
  creatureIcon?: File;
  onSuccess?: () => void;
}) {
  const [encounter] = useEncounter();
  const { encounterById } = api.useUtils();
  const id = encounter.id;
  const { invalidateAll, cancelAll } = useEncounterQueryUtils();
  const uploadToAws = useAwsImageUpload({
    statBlockImage: creatureStatBlock,
    iconImage: creatureIcon,
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
        return EncounterUtils.addParticipant(
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
          ),
          old
        );
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
    onSettled: async () => {
      return await invalidateAll(encounter);
    },
  });
}
