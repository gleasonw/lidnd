import { CreaturePost } from "@/app/dashboard/encounters/[id]/creature-add-form";
import { useEncounterId } from "@/app/dashboard/encounters/hooks";
import { getCreaturePostForm } from "@/app/dashboard/encounters/utils";
import { rerouteUrl } from "@/app/login/page";
import { EncounterCreature } from "@/server/api/router";
import { api } from "@/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { useId } from "react";

export function useCreateCreatureInEncounter() {
  const { encounterById } = api.useUtils();
  const id = useEncounterId();
  const optimisticId = useId();

  const { data: encounter } = api.encounterById.useQuery(id);

  return useMutation({
    mutationFn: async (rawData: CreaturePost) => {
      if (!encounter) {
        throw new Error("No encounter");
      }
      const formData = getCreaturePostForm(rawData);
      formData.append("encounter_id", encounter.id);

      const response = await fetch(
        `${rerouteUrl}/api/creature/create-and-add-to-encounter`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await response.json();
      if (response.status !== 200) {
        console.log(data.detail);
        throw data;
      }
      return data;
    },
    onMutate: async (data) => {
      await encounterById.cancel(id);
      const previousEncounterData = encounterById.getData(id);
      encounterById.setData(id, (old) => {
        if (!old) {
          return;
        }
        const newParticipant: EncounterCreature = {
          ...data,
          encounter_id: old.id,
          creature_id: optimisticId,
          id: optimisticId,
          initiative: 0,
          hp: data.max_hp,
          is_active: false,
          created_at: new Date(),
          user_id: old.user_id,
        };
        return {
          ...old,
          participants: [...old.participants, newParticipant],
        };
      });
      return { previousEncounterData };
    },
    onError: (err, variables, context) => {
      if (context?.previousEncounterData) {
        encounterById.setData(id, context.previousEncounterData);
      }
    },
    onSettled: () => {
      encounterById.invalidate(id);
    },
  });
}
