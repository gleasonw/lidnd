import { api } from "@/trpc/react";
import { useSearchParams } from "next/navigation";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils } from "@/utils/participants";
import { useEncounterId } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/encounter-id";
import {
  useCampaign,
  useActiveGameSession,
} from "@/app/[username]/[campaign_slug]/campaign-hooks";
import {
  EncounterUIContext,
  useEncounterUIStore,
} from "@/encounters/[encounter_index]/EncounterUiStore";
import { useContext, useTransition } from "react";

import { useEffect } from "react";
import { useCreatureForm } from "@/app/[username]/[campaign_slug]/CreatureUploadForm";
import { z } from "zod";
import { creatureUploadSchema } from "@/server/db/schema";
import { omit } from "remeda";
import { useUploadParticipant } from "@/encounters/[encounter_index]/encounter-upload-hooks";
import {
  addTagToEncounterAction,
  removeTagFromEncounterAction,
} from "@/app/[username]/actions";

/**
 * We don't actually upload these, but we want to make sure the user has
 * a stat block image ready before triggering the full upload.
 */
export const localCreatureUploadSchema = creatureUploadSchema.extend({
  statBlockImage: z.instanceof(File),
  iconImage: z.instanceof(File).optional(),
});

export function useParticipantForm(participantArgs: {
  role: "ally" | "opponent";
  overrideHp?: number;
  afterSubmit?: () => void;
}) {
  const form = useCreatureForm();
  const [encounter] = useEncounter();

  function onSubmit(values: Zod.infer<typeof localCreatureUploadSchema>) {
    const creatureValues = omit(values, ["iconImage", "statBlockImage"]);
    uploadParticipant({
      creature: { ...creatureValues, is_player: false },
      participant: {
        encounter_id: encounter.id,
        //TODO: just use role at some point
        is_ally: participantArgs.role === "ally",
        hp: participantArgs.overrideHp ?? values.max_hp,
        max_hp_override: participantArgs.overrideHp,
      },
      hasStatBlock: values.statBlockImage !== undefined,
      hasIcon: values.iconImage !== undefined,
    });
    participantArgs.afterSubmit?.();
  }

  const { mutate: uploadParticipant, isPending } = useUploadParticipant({
    form,
    onSuccess: () => {
      console.log("upload participant success, reseting form");
      form.reset();
    },
  });

  useEffect(() => {
    console.log(form.formState.errors);
  }, [form.formState.errors]);

  return { form, onSubmit, uploadParticipant, isPending };
}

export function useEncounter() {
  const [activeSession] = useActiveGameSession();

  const currentEncounterId = useEncounterId();

  const [resp] = api.encounterById.useSuspenseQuery(currentEncounterId, {
    // wonky hack to make sure that optimistic updates to participants
    // are also applied to participants referenced through column
    // soon: replicache!
    select: (e) => ({
      ...e,
      columns: e.columns.map((c) => ({
        ...c,
        participants: e.participants.filter((p) => p.column_id === c.id),
      })),
    }),
  });
  // curious to see if this hack actually works. just makes it so I don't have to modify as many utils.
  const respWithVictoriesMaybe = {
    ...resp,
    average_victories: activeSession ? activeSession.victory_count : null,
  };
  return [respWithVictoriesMaybe] as const;
}

//TODO: this should really be done in the backend, we shouldn't have to chain the call ourselves on the front
export function useCycleNextTurn() {
  const [campaign] = useCampaign();
  const { encounterById } = api.useUtils();
  // nullable uiStore since we sometimes call this outside the encounter run ui, and optional
  // is an easy way to just not do encounter ui stuff, versus throwing an error since no provider
  const uiStore = useContext(EncounterUIContext);

  return api.cycleNextTurn.useMutation({
    onMutate: async ({ encounter_id }) => {
      if (campaign.system !== "dnd5e") {
        return;
      }
      await encounterById.cancel(encounter_id);
      const previousEncounter = encounterById.getData(encounter_id);
      encounterById.setData(encounter_id, (old) => {
        if (!old) return old;
        const { participants, current_round: updatedRoundNumber } =
          EncounterUtils.optimisticParticipants("loadingNext", old);

        const newlyActiveParticipant = participants.find((p) => p.is_active);
        if (newlyActiveParticipant) {
          uiStore?.scrollToParticipant(newlyActiveParticipant.id);
        }

        if (old.current_round !== updatedRoundNumber) {
          uiStore?.resetViewedState();
        }

        return { ...old, participants, current_round: updatedRoundNumber };
      });
      return { previousEncounter };
    },
  });
}

export function useCyclePreviousTurn() {
  const [campaign] = useCampaign();
  const { encounterById } = api.useUtils();
  const uiStore = useEncounterUIStore();

  return api.cyclePreviousTurn.useMutation({
    onMutate: async ({ encounter_id }) => {
      if (campaign.system !== "dnd5e") {
        return;
      }
      await encounterById.cancel(encounter_id);
      const previousEncounter = encounterById.getData(encounter_id);
      encounterById.setData(encounter_id, (old) => {
        if (!old) return old;
        const { participants, current_round } =
          EncounterUtils.optimisticParticipants("loadingPrevious", old);

        const newlyActiveParticipant = participants.find((p) => p.is_active);
        if (newlyActiveParticipant) {
          uiStore.scrollToParticipant(newlyActiveParticipant.id);
        }

        return { ...old, participants, current_round };
      });
      return { previousEncounter };
    },
  });
}

export function useSelectedCreature() {
  const params = useSearchParams();
  const selectedCreature = params.get("selectedCreature");
  return selectedCreature;
}

/**only applicable for drawsteel */
export function useToggleGroupTurn() {
  const uiStore = useEncounterUIStore();
  const { encounterById } = api.useUtils();
  const [activeSession] = useActiveGameSession();
  return api.updateGroupTurn.useMutation({
    onMutate: async ({ encounter_id, participant_id }) => {
      await encounterById.cancel(encounter_id);
      const previousEncounterData = encounterById.getData(encounter_id);
      encounterById.setData(encounter_id, (old) => {
        if (!old) {
          return;
        }

        const { updatedEncounter } = EncounterUtils.toggleGroupTurn({
          participant: { id: participant_id },
          encounter: old,
          gameSession: activeSession,
        });
        if (old.current_round !== updatedEncounter.current_round) {
          uiStore.resetViewedState();
        }

        return updatedEncounter;
      });
      return { previousEncounterData };
    },
  });
}

export function useRemoveParticipantFromEncounter() {
  const id = useEncounterId();
  const { encounterById } = api.useUtils();
  const { mutate: cycleNext } = useCycleNextTurn();

  return api.removeParticipantFromEncounter.useMutation({
    onMutate: async (data) => {
      await encounterById.cancel(id);
      const previousEncounterData = encounterById.getData(id);
      encounterById.setData(id, (old) => {
        if (!old) {
          return;
        }

        const removedParticipant = old.participants.find(
          (p) => p.id === data.participant_id
        );

        if (!removedParticipant) {
          throw new Error("No participant found when removing");
        }

        if (removedParticipant.is_active) {
          cycleNext({ encounter_id: id });
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
  });
}

export function useUpdateEncounterParticipant() {
  const [campaign] = useCampaign();
  const { encounterById } = api.useUtils();
  const id = useEncounterId();
  const { mutate: cycleNext } = useCycleNextTurn();
  return api.updateEncounterParticipant.useMutation({
    onMutate: async (newParticipant) => {
      await encounterById.cancel(id);
      const previousEncounter = encounterById.getData(id);
      encounterById.setData(id, (old) => {
        if (!old) {
          return;
        }

        if (newParticipant.hp <= 0) {
          // this should be a message to the system, draw steel/ dnd5e, because it depends

          // TODO: make sure that the next participant in the column gets
          // assigned the column id of this fallen monster, to avoid a weird switch
          if (newParticipant.is_active && campaign.system === "dnd5e") {
            cycleNext({ encounter_id: id });
          }

          return EncounterUtils.removeParticipant(newParticipant.id, old);
        }

        return EncounterUtils.updateParticipant(newParticipant, old);
      });
      return { previousEncounter };
    },
  });
}

/**
 *
 * only callable underneath the encounter layout. encounterById is the client source of truth
 */
export function useUpdateEncounter() {
  const { encounterById } = api.useUtils();
  const [encounter] = useEncounter();
  const mutation = api.updateEncounter.useMutation({
    onMutate: async (newEncounter) => {
      await encounterById.cancel(encounter.id);
      const previousEncounter = encounterById.getData(encounter.id);
      encounterById.setData(encounter.id, (old) => {
        if (!old || !newEncounter) {
          throw new Error("no encounter found");
        }
        return {
          ...encounter,
          ...newEncounter,
        };
      });
      return { previousEncounter };
    },
  });
  return mutation;
}

export function useUpdateEncounterMinionParticipant() {
  const { encounterById } = api.useUtils();
  const id = useEncounterId();
  return api.updateEncounterMinionParticipant.useMutation({
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

export function useAddExistingCreatureAsParticipant(encounter: {
  id: string;
  campaign_id: string;
}) {
  const id = encounter.id;
  const { cancelAll } = useEncounterQueryUtils();
  const { encounterById } = api.useUtils();
  const { data: creatures } = api.getUserCreatures.useQuery({ name: "" });
  return api.addExistingCreatureAsParticipant.useMutation({
    onMutate: async (p) => {
      await cancelAll(encounter);
      const previousEncounterData = encounterById.getData(id);
      encounterById.setData(id, (old) => {
        if (!old) {
          return;
        }
        const selectedCreature = creatures?.find(
          (creature) => creature.id === p.creature_id
        );
        if (!selectedCreature) return;

        // boolean wonkyness comes from the boolean parsing we have to do server side
        // we should always have pure booleans locally
        return EncounterUtils.addParticipant(
          ParticipantUtils.placeholderParticipantWithData(p, {
            ...selectedCreature,
            user_id: "pending",
          }),
          old
        );
      });
      return { previousEncounterData };
    },
    onError: (err, variables, context) => {
      if (context?.previousEncounterData) {
        encounterById.setData(id, context.previousEncounterData);
      }
    },
  });
}

/**
 *
 * A cludgy hook that is needed to make sure that, no matter the source, ui derived from encounter state updates after a mutation to encounters
 */
export function useEncounterQueryUtils() {
  const { getColumns, encounterById, campaignById } = api.useUtils();

  const cancelAll = async (encounter: { id: string; campaign_id: string }) => {
    await Promise.all([
      encounterById.cancel(encounter.id),
      getColumns.cancel(encounter.id),
      campaignById.cancel(encounter.campaign_id),
    ]);
  };

  const invalidateAll = async (encounter: {
    id: string;
    campaign_id: string;
  }) => {
    await Promise.all([
      encounterById.invalidate(encounter.id),
      getColumns.invalidate(encounter.id),
      campaignById.invalidate(encounter.campaign_id),
    ]);
  };

  return { cancelAll, invalidateAll };
}

export function useUpdateCreature() {
  const { encounterById } = api.useUtils();
  const id = useEncounterId();
  return api.updateCreature.useMutation({
    onMutate: async (newCreature) => {
      await encounterById.cancel(id);
      const previousEncounter = encounterById.getData(id);
      encounterById.setData(id, (old) => {
        if (!old) {
          return;
        }
        return EncounterUtils.updateCreature(newCreature, old);
      });
      return { previousEncounter };
    },
  });
}

export function useStartEncounter() {
  const { encounterById } = api.useUtils();
  const id = useEncounterId();
  const [campaign] = useCampaign();
  const [activeSession] = useActiveGameSession();

  return api.startEncounter.useMutation({
    onMutate: async () => {
      await encounterById.cancel(id);
      const previousEncounter = encounterById.getData(id);
      encounterById.setData(id, (old) => {
        if (!old) return old;
        return EncounterUtils.start(
          { ...old, average_victories: activeSession?.victory_count ?? null },
          campaign
        );
      });
      return { previousEncounter };
    },
  });
}

/**
 * Hook to fetch all tags for the current user
 */
export function useUserTags() {
  return api.getUserTags.useQuery();
}

/**
 * Hook to create a new tag
 */
export function useCreateTag() {
  return api.createTag.useMutation();
}

/**
 * Hook to add a tag to an encounter with optimistic update
 */
export function useAddTagToEncounter() {
  const [isPending, startTransition] = useTransition();
  const utils = api.useUtils();

  return {
    mutate: (input: { encounter_id: string; tag_id: string }) => {
      startTransition(async () => {
        await addTagToEncounterAction(input);
        await utils.invalidate();
      });
    },
    mutateAsync: async (input: { encounter_id: string; tag_id: string }) => {
      const result = await addTagToEncounterAction(input);
      await utils.invalidate();
      return result;
    },
    isPending,
  };
}

/**
 * Hook to remove a tag from an encounter with optimistic update
 */
export function useRemoveTagFromEncounter() {
  const [isPending, startTransition] = useTransition();
  const utils = api.useUtils();

  return {
    mutate: (input: { encounter_id: string; tag_id: string }) => {
      startTransition(async () => {
        await removeTagFromEncounterAction(input);
        await utils.invalidate();
      });
    },
    mutateAsync: async (input: { encounter_id: string; tag_id: string }) => {
      await removeTagFromEncounterAction(input);
      await utils.invalidate();
    },
    isPending,
  };
}
