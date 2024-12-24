import { useEncounter, useEncounterQueryUtils } from "./hooks";
import { useMutation } from "@tanstack/react-query";
import type { ParticipantPost } from "../types";
import { getCreaturePostForm as convertCreatureObjectToForm } from "../utils";
import { createParticipantInEncounter } from "@/app/[username]/actions";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils } from "@/utils/participants";
import { api } from "@/trpc/react";

/**Note: must be called underneath an encounter provider */
export function useCreateCreatureInEncounter() {
  const [encounter] = useEncounter();
  const { encounterById } = api.useUtils();
  const id = encounter.id;
  const { invalidateAll, cancelAll } = useEncounterQueryUtils();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      if (!encounter) {
        throw new Error("No encounter");
      }

      const response = await createParticipantInEncounter(formData);

      if (response?.error) {
        console.error(response.error);
        throw new Error("error parsing response");
      }

      if (!response?.data) {
        throw new Error("no data in response");
      }

      return response.data;
    },
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
    onSettled: async () => {
      return await invalidateAll(encounter);
    },
  });
}
