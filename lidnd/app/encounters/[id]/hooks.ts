import { CreaturePost } from "@/app/encounters/[id]/creature-add-form";
import { useEncounterId } from "@/app/encounters/hooks";
import { getCreaturePostForm } from "@/app/encounters/utils";
import { rerouteUrl } from "@/app/login/page";
import { Creature, EncounterCreature } from "@/server/api/router";
import { mergeEncounterCreature } from "../utils";
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
      const data = (await response.json()) as {
        data: Creature;
        detail: string;
      };
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
          creature_id: "pending",
          id: optimisticId,
          initiative: -1,
          hp: data.max_hp,
          is_active: false,
          created_at: new Date(),
          user_id: old.user_id,
          has_surprise: false,
          status_effects: [],
          minion_count: 0,
          has_played_this_round: false,
        };
        return {
          ...old,
          participants: [...old.participants, newParticipant],
        };
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
      console.log("settled");
      return await encounterById.invalidate(id);
    },
  });
}

export function useRemoveParticipantFromEncounter() {
  const { encounterById } = api.useUtils();
  const id = useEncounterId();

  return api.removeParticipantFromEncounter.useMutation({
    onMutate: async (data) => {
      await encounterById.cancel(id);
      const previousEncounterData = encounterById.getData(id);
      encounterById.setData(id, (old) => {
        if (!old) {
          return;
        }
        return {
          ...old,
          participants: old.participants.filter(
            (p) => p.id !== data.participant_id
          ),
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

export function useUpdateEncounterParticipant() {
  const { encounterById } = api.useUtils();
  const id = useEncounterId();
  return api.updateEncounterParticipant.useMutation({
    onSettled: async () => {
      return await encounterById.invalidate(id);
    },
    onMutate: async (newParticipant) => {
      await encounterById.cancel(id);
      const previousEncounter = encounterById.getData(id);
      encounterById.setData(id, (old) => {
        if (!old) return old;
        return {
          ...old,
          participants: old.participants.map((p) => {
            if (p.id === newParticipant.id) {
              return mergeEncounterCreature(newParticipant, p);
            }
            return p;
          }),
        };
      });
      return { previousEncounter };
    },
  });
}

//TODO: perhaps, one day, we can abstract the mutation functions. For now, more trouble
// than it's worth
export function useUpdateEncounterMinionParticipant() {
  const { encounterById } = api.useUtils();
  const id = useEncounterId();
  return api.updateEncounterMinionParticipant.useMutation({
    onSettled: async () => {
      return await encounterById.invalidate(id);
    },
    onMutate: async (newParticipant) => {
      await encounterById.cancel(id);
      const previousEncounter = encounterById.getData(id);
      encounterById.setData(id, (old) => {
        if (!old) return old;
        return {
          ...old,
          participants: old.participants.map((p) => {
            if (p.id === newParticipant.id) {
              return mergeEncounterCreature(newParticipant, p);
            }
            return p;
          }),
        };
      });
      return { previousEncounter };
    },
  });
}

export function useRemoveStatusEffect() {
  const { encounterById } = api.useUtils();
  const id = useEncounterId();
  return api.removeStatusEffect.useMutation({
    onSettled: async () => {
      return await encounterById.invalidate(id);
    },
    onMutate: async (newStatusEffect) => {
      await encounterById.cancel(id);
      const previousEncounter = encounterById.getData(id);
      encounterById.setData(id, (old) => {
        if (!old) return old;
        return {
          ...old,
          participants: old.participants.map((participant) => {
            if (participant.id === newStatusEffect.encounter_participant_id) {
              return {
                ...participant,
                status_effects: participant.status_effects.filter(
                  (effect) => effect.id !== newStatusEffect.status_effect_id
                ),
              };
            }
            return participant;
          }),
        };
      });
      return previousEncounter;
    },
  });
}

export function useStartEncounter() {
  const { encounterById } = api.useUtils();
  const id = useEncounterId();

  return api.startEncounter.useMutation({
    onSettled: async () => {
      return await encounterById.invalidate(id);
    },
  });
}
