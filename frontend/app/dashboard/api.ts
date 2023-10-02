import { paths, components } from "@/app/schema";
import createClient from "openapi-fetch";
import apiURL from "@/app/apiURL";
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryKey,
} from "@tanstack/react-query";
import { getCookie } from "cookies-next";
import { useEncounterId } from "@/app/dashboard/hooks";
import { CreaturePost } from "@/app/dashboard/[id]/creature-add-form";

const { GET, PUT, POST, DELETE } = createClient<paths>({ baseUrl: apiURL });

export type EncounterCreature = components["schemas"]["EncounterCreature"];
export type Encounter = components["schemas"]["EncounterResponse"];
export type EncounterParticipant =
  components["schemas"]["EncounterParticipant"];
export type Creature = components["schemas"]["CreatureResponse"];

export function clientToken() {
  return getCookie("token");
}

export function useCreateEncounter(onCreate?: (encounter: Encounter) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      encounter: components["schemas"]["EncounterRequest"]
    ) => {
      const { error, data } = await POST(`/api/encounters`, {
        headers: {
          Authorization: `Bearer ${clientToken()}`,
        },
        body: encounter,
      });
      if (error) {
        console.log(error.detail);
        throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["encounters"] });
      return data;
    },
    onSuccess: (data) => {
      if (onCreate) {
        onCreate(data as unknown as Encounter);
      }
    },
  });
}

export function useDeleteEncounter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error, data } = await DELETE(`/api/encounters/{encounter_id}`, {
        params: {
          path: {
            encounter_id: id,
          },
        },
        headers: {
          Authorization: `Bearer ${clientToken()}`,
        },
      });
      if (error) {
        console.log(error.detail);
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(encountersQueryKey, data);
    },
  });
}

const encountersQueryKey = ["encounters"];

function encounterCreaturesKey(id: number) {
  return ["encounterCreatures", id];
}

function encounterKey(id: number) {
  return ["encounter", id];
}

export function useEncounters() {
  return useQuery({
    queryKey: encountersQueryKey,
    queryFn: async () => {
      const { data } = await GET(`/api/encounters`, {
        headers: {
          Authorization: `Bearer ${clientToken()}`,
        },
      });
      return data;
    },
  });
}

export function useEncounterCreatures(encounter_id?: number) {
  const localId = useEncounterId();
  const id = encounter_id ? encounter_id : localId;
  return useQuery({
    queryKey: encounterCreaturesKey(id),
    queryFn: async () => {
      const { data, error } = await GET(
        `/api/encounters/{encounter_id}/creatures`,
        {
          params: {
            path: {
              encounter_id: id,
            },
          },
          headers: {
            Authorization: `Bearer ${clientToken()}`,
          },
        }
      );
      if (error) {
        console.log(error.detail);
        throw error;
      }
      return data;
    },
  });
}

const allUserCreaturesKey = ["userCreatures", ""];

export function useUserCreatures(name?: string, filterEncounter?: number) {
  return useQuery({
    queryKey: ["userCreatures", name],
    queryFn: async () => {
      const { data, error } = await GET(`/api/creatures`, {
        params: {
          query: {
            name,
            filter_encounter: filterEncounter,
          },
        },
        headers: {
          Authorization: `Bearer ${clientToken()}`,
        },
      });
      if (error) {
        console.log(error.detail);
        throw error;
      }
      return data;
    },
  });
}

export function useEncounter() {
  const id = useEncounterId();
  return useQuery({
    queryKey: encounterKey(id),
    queryFn: async () => {
      const { data, error } = await GET(`/api/encounters/{encounter_id}`, {
        params: {
          path: {
            encounter_id: id,
          },
        },
        headers: {
          Authorization: `Bearer ${clientToken()}`,
        },
      });
      if (error) {
        console.log(error.detail);
        throw error;
      }
      return data;
    },
  });
}

// Composable function to encapsulate optimistic updates
export function useOptimisticUpdate<T>(
  queryKey: QueryKey,
  localUpdateFn: (oldData: T | undefined, newData: any) => T
) {
  const queryClient = useQueryClient();

  return {
    onMutate: async (newData: any) => {
      await queryClient.cancelQueries(queryKey);
      const previousData = queryClient.getQueryData<T>(queryKey);

      queryClient.setQueryData(queryKey, (oldData: T | undefined) =>
        localUpdateFn(oldData, newData)
      );

      return { previousData };
    },
    onError: (err: any, newData: any, context: any) => {
      queryClient.setQueryData(queryKey, context?.previousData);
    },
    onSettled: () => {
      queryClient.invalidateQueries(queryKey);
    },
  };
}

export function useUpdateEncounterCreature() {
  const queryClient = useQueryClient();
  const id = useEncounterId();
  return useMutation({
    mutationFn: async (
      creature: components["schemas"]["EncounterParticipant"]
    ) => {
      const { error, data } = await PUT(
        `/api/encounters/{encounter_id}/creatures/{creature_id}`,
        {
          params: {
            path: {
              encounter_id: id,
              creature_id: creature.creature_id,
            },
          },
          headers: {
            Authorization: `Bearer ${clientToken()}`,
          },
          body: creature,
        }
      );
      if (error) {
        console.log(error.detail);
        throw error;
      }
      return data;
    },
    ...useOptimisticUpdate<EncounterCreature[]>(
      encounterCreaturesKey(id),
      (oldData = [], newData) => {
        return oldData.map((c) => {
          if (c.creature_id === newData.creature_id) {
            return { ...c, ...newData };
          }
          return c;
        });
      }
    ),
  });
}

export function useAddCreatureToEncounter(onCreatureAdded?: () => void) {
  const id = useEncounterId();

  return useMutation({
    mutationFn: async (creatureData: {
      name: string;
      max_hp: number;
      icon: File;
      stat_block: File;
    }) => {
      // we use native fetch here because openapi-fetch doesn't seem to support FormData
      const formData = new FormData();
      formData.append("name", creatureData.name);
      formData.append("max_hp", creatureData.max_hp.toString());
      formData.append("icon", creatureData.icon);
      formData.append("stat_block", creatureData.stat_block);
      formData.append("encounter_id", id.toString());
      const response = await fetch(`${apiURL}/api/encounters/${id}/creatures`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clientToken()}`,
        },
        body: formData,
      });
      const data = await response.json();
      if (response.status !== 200) {
        console.log(data.detail);
        throw data;
      }
      return data;
    },
    onSuccess: (data) => {
      if (onCreatureAdded) {
        onCreatureAdded();
      }
    },
    ...useOptimisticUpdate<EncounterCreature[]>(
      encounterCreaturesKey(id),
      (oldData = [], newData) => {
        const newCreature: EncounterCreature = {
          id: Math.max(...oldData.map((c: EncounterCreature) => c.id)) + 1,
          creature_id:
            Math.max(...oldData.map((c: EncounterCreature) => c.creature_id)) +
            1,
          encounter_id: id,
          hp: newData.max_hp,
          max_hp: newData.max_hp,
          name: newData.name,
          is_active: false,
          initiative: 0,
        };
        return [...oldData, newCreature];
      }
    ),
  });
}

export function useAddExistingCreatureToEncounter(
  onCreatureAdded?: () => void
) {
  const queryClient = useQueryClient();
  const id = useEncounterId();

  return useMutation({
    mutationFn: async (creatureData: {
      creature_id: number;
      encounter_id: number;
    }) => {
      const { error, data } = await POST(
        `/api/encounters/{encounter_id}/creatures/{creature_id}`,
        {
          params: {
            path: {
              encounter_id: id,
              creature_id: creatureData.creature_id,
            },
          },
          headers: {
            Authorization: `Bearer ${clientToken()}`,
          },
        }
      );
      if (error) {
        console.log(error.detail);
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      if (onCreatureAdded) {
        onCreatureAdded();
      }
    },
    ...useOptimisticUpdate<EncounterCreature[]>(
      encounterCreaturesKey(id),
      (oldData = [], newData) => {
        const newCreature: EncounterCreature = {
          id: Math.max(...oldData.map((c: EncounterCreature) => c.id)) + 1,
          creature_id: newData.creature_id,
          encounter_id: id,
          hp: 0,
          max_hp: 0,
          name: "",
          is_active: false,
          initiative: 0,
        };
        return [...oldData, newCreature];
      }
    ),
  });
}

export function useRemoveCreatureFromEncounter() {
  const id = useEncounterId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (creature_id: number) => {
      const { error, data } = await DELETE(
        `/api/encounters/{encounter_id}/creatures/{creature_id}`,
        {
          params: {
            path: {
              encounter_id: id,
              creature_id,
            },
          },
          headers: {
            Authorization: `Bearer ${clientToken()}`,
          },
        }
      );
      if (error) {
        console.log(error.detail);
        throw error;
      }
      return data;
    },
    ...useOptimisticUpdate<EncounterCreature[]>(
      encounterCreaturesKey(id),
      (oldData = [], newData) => {
        return oldData.filter((c) => c.id !== newData.id);
      }
    ),
  });
}

export function useCreateCreature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (creatureData: {
      name: string;
      max_hp: number;
      icon: File;
      stat_block: File;
    }) => {
      // we use native fetch here because openapi-fetch doesn't seem to support FormData
      const formData = new FormData();
      formData.append("name", creatureData.name);
      formData.append("max_hp", creatureData.max_hp.toString());
      formData.append("icon", creatureData.icon);
      formData.append("stat_block", creatureData.stat_block);
      const response = await fetch(`${apiURL}/api/creatures`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clientToken()}`,
        },
        body: formData,
      });
      const data = await response.json();
      if (response.status !== 200) {
        console.log(data.detail);
        throw data;
      }
      return data;
    },
    ...useOptimisticUpdate<Creature[]>(
      allUserCreaturesKey,
      (oldData = [], newData) => {
        const newCreature: Creature = {
          id: Math.max(...oldData.map((c: Creature) => c.id)) + 1,
          name: newData.name,
          max_hp: newData.max_hp,
        };
        return [...oldData, newCreature];
      }
    ),
  });
}

export function useDeleteCreature() {
  return useMutation({
    mutationFn: async (creature_id: number) => {
      const { error, data } = await DELETE(`/api/creatures/{creature_id}`, {
        params: {
          path: {
            creature_id,
          },
        },
        headers: {
          Authorization: `Bearer ${clientToken()}`,
        },
      });
      if (error) {
        console.log(error.detail);
        throw error;
      }
      return data;
    },
    ...useOptimisticUpdate<Creature[]>(
      allUserCreaturesKey,
      (oldData = [], newData) => {
        return oldData.filter((c) => c.id !== newData.id);
      }
    ),
  });
}

export function useStartEncounter() {
  const queryClient = useQueryClient();
  const id = useEncounterId();
  return useMutation({
    mutationFn: async () => {
      const { error, data } = await POST(
        `/api/encounters/{encounter_id}/start`,
        {
          params: {
            path: {
              encounter_id: id,
            },
          },
          headers: {
            Authorization: `Bearer ${clientToken()}`,
          },
        }
      );
      if (error) {
        console.log(error.detail);
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(encounterKey(id), data);
    },
  });
}

export function useNextTurn() {
  return useTurn("next");
}

export function usePreviousTurn() {
  return useTurn("previous");
}

export function useTurn(to: "next" | "previous") {
  const queryClient = useQueryClient();
  const id = useEncounterId();

  return useMutation({
    mutationFn: async () => {
      const { error, data } = await POST(
        `/api/encounters/{encounter_id}/turn`,
        {
          params: {
            path: {
              encounter_id: id,
            },
            query: {
              to,
            },
          },
          headers: {
            Authorization: `Bearer ${clientToken()}`,
          },
        }
      );
      if (error) {
        console.log(error.detail);
        throw error;
      }
      return data;
    },
    ...useOptimisticUpdate<EncounterCreature[]>(
      encounterCreaturesKey(id),
      (oldData = [], newData) => {
        return optimisticTurnUpdate(to, oldData);
      }
    ),
  });
}

function optimisticTurnUpdate(
  to: "next" | "previous",
  participants: EncounterCreature[]
) {
  if (participants && Array.isArray(participants)) {
    const currentActive = participants.find(
      (c: EncounterCreature) => c.is_active
    );
    const activeParticipants = participants.filter(
      (c: EncounterCreature) => c.hp > 0 || c.is_active
    );
    if (currentActive && activeParticipants.length > 1) {
      let nextActive: EncounterCreature;
      if (to === "previous") {
        nextActive =
          activeParticipants[
            (activeParticipants.indexOf(currentActive) - 1) %
              activeParticipants.length
          ];
      } else {
        nextActive =
          activeParticipants[
            (activeParticipants.indexOf(currentActive) + 1) %
              activeParticipants.length
          ];
      }
      return participants.map((c: EncounterCreature) => {
        if (c.creature_id === nextActive.creature_id) {
          return {
            ...c,
            is_active: true,
          };
        }
        return {
          ...c,
          is_active: false,
        };
      });
    }
  }
  return participants;
}
