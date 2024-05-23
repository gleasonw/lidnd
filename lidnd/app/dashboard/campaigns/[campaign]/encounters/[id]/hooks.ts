import { CreaturePost, ParticipantPost } from "../types";
import { defaultParticipant, getCreaturePostForm } from "../utils";
import { Creature, ParticipantCreature } from "@/server/api/router";
import { mergeEncounterCreature } from "../utils";
import { api } from "@/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { useId } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { createCreatureInEncounter } from "@/app/dashboard/actions";

export function useEncounterId() {
  const pathname = usePathname();
  const id = pathname.split("/")[5];
  return id;
}

export function useSelectedCreature() {
  const params = useSearchParams();
  const selectedCreature = params.get("selectedCreature");
  return selectedCreature;
}

export function useCreateCreatureInEncounter() {
  const { encounterById } = api.useUtils();
  const id = useEncounterId();
  const optimisticId = useId();

  const { data: encounter } = api.encounterById.useQuery(id);

  return useMutation({
    mutationFn: async (rawData: ParticipantPost) => {
      if (!encounter) {
        throw new Error("No encounter");
      }
      const formData = getCreaturePostForm(rawData.creature);
      formData.append("encounter_id", encounter.id);
      formData.append(
        "is_ally",
        rawData.participant?.is_ally ? "true" : "false",
      );

      const response = await createCreatureInEncounter(formData);

      if (response.error) {
        console.error(response.error);
        throw new Error("error parsing response");
      }

      if (!response.data) {
        throw new Error("no data in response");
      }

      return response.data;
    },
    onMutate: async (data) => {
      await encounterById.cancel(id);
      const previousEncounterData = encounterById.getData(id);
      const creature = data.creature;
      encounterById.setData(id, (old) => {
        if (!old) {
          return;
        }
        const newParticipant: ParticipantCreature = {
          ...creature,
          encounter_id: old.id,
          creature_id: "pending",
          id: optimisticId,
          initiative: -1,
          hp: creature.max_hp,
          is_active: false,
          created_at: new Date(),
          user_id: old.user_id,
          has_surprise: false,
          status_effects: [],
          minion_count: 0,
          has_played_this_round: false,
          is_ally: false,
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
            (p) => p.id !== data.participant_id,
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
                  (effect) => effect.id !== newStatusEffect.status_effect_id,
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

export function useAddExistingCreatureToEncounter() {
  const id = useEncounterId();
  const { encounterById } = api.useUtils();
  const { data: creatures } = api.getUserCreatures.useQuery({ name: "" });
  return api.addExistingCreatureToEncounter.useMutation({
    onMutate: async ({ creature_id, is_ally }) => {
      await encounterById.cancel(id);
      const previousEncounterData = encounterById.getData(id);
      const optimisticId = Math.random().toString();
      encounterById.setData(id, (old) => {
        if (!old) {
          return;
        }
        const selectedCreature = creatures?.find(
          (creature) => creature.id === creature_id,
        );
        if (!selectedCreature) return;
        const optimisticP = mergeEncounterCreature(
          defaultParticipant({
            id: optimisticId,
            encounter_id: id,
            creature_id: creature_id,
            is_ally: Boolean(is_ally),
          }),
          selectedCreature,
        );
        return {
          ...old,
          participants: [...old.participants, optimisticP],
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

export function useStartEncounter() {
  const { encounterById } = api.useUtils();
  const id = useEncounterId();

  return api.startEncounter.useMutation({
    onSettled: async () => {
      return await encounterById.invalidate(id);
    },
  });
}
