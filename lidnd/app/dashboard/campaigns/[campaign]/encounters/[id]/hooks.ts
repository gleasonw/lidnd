import { ParticipantPost } from "../types";
import { getCreaturePostForm } from "../utils";
import { api } from "@/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { usePathname, useSearchParams } from "next/navigation";
import { createCreatureInEncounter } from "@/app/dashboard/actions";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils } from "@/utils/participants";
import { removeUndefinedFields } from "@/app/dashboard/utils";
import { useCampaignId } from "@/campaigns/hooks";
import { UpsertEncounter } from "@/app/dashboard/types";

export function useEncounter() {
  const currentEncounterId = useEncounterId();

  return api.encounterById.useSuspenseQuery(currentEncounterId);
}

export function useEncounterId() {
  const pathname = usePathname();
  const id = pathname.split("/")[5];
  if (!id) {
    throw new Error("No encounter id found in url path");
  }
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
            },
          ),
          old,
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
        return EncounterUtils.removeParticipant(data.participant_id, old);
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
        if (!old) {
          return;
        }
        return EncounterUtils.updateParticipant(newParticipant, old);
      });
      return { previousEncounter };
    },
  });
}

export function useUpdateEncounter() {
  const { encounters } = api.useUtils();
  const campaignId = useCampaignId();

  const mutation = api.updateEncounter.useMutation({
    onSettled: async (en) => {
      if (!en) return;
      return await encounters.invalidate(campaignId);
    },
    onMutate: async (en) => {
      if (!en) return;
      await encounters.cancel(campaignId);
      const previousEncounter = encounters
        .getData(campaignId)
        ?.find((e) => e.id === en.id);

      if (!previousEncounter) {
        throw new Error("No previous encounter found");
      }

      const filteredNewEncounter = removeUndefinedFields(en);
      encounters.setData(campaignId, (old) => {
        return old?.map((e) => {
          if (e.id === en.id) {
            return {
              ...e,
              ...filteredNewEncounter,
            };
          }
          return e;
        });
      });
      return { previousEncounter };
    },
  });

  const updateEncounter = (
    encounter: Omit<UpsertEncounter, "user_id" | "campaign_id"> & {
      id: string;
    },
  ) => {
    mutation.mutate({
      ...removeUndefinedFields(encounter),
      campaign_id: campaignId,
    });
  };

  return { ...mutation, mutate: updateEncounter };
}

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
        if (!old) {
          return;
        }
        return EncounterUtils.updateParticipant(newParticipant, old);
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
      encounterById.setData(id, (old) => {
        if (!old) {
          return;
        }
        const selectedCreature = creatures?.find(
          (creature) => creature.id === creature_id,
        );
        if (!selectedCreature) return;

        // boolean wonkyness comes from the boolean parsing we have to do server side
        // we should always have pure booleans locally
        return EncounterUtils.addParticipant(
          ParticipantUtils.placeholderParticipantWithData(
            {
              encounter_id: id,
              creature_id: selectedCreature.id,
              is_ally: is_ally === true || is_ally === "true" ? true : false,
            },
            {
              ...selectedCreature,
              user_id: "pending",
            },
          ),
          old,
        );
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
