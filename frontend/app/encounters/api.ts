import { paths, components } from "@/app/schema";
import createClient from "openapi-fetch";
import apiURL from "@/app/apiURL";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCookie } from "cookies-next";
import { useEncounterId } from "@/app/encounters/hooks";

const { GET, PUT, POST, DELETE } = createClient<paths>({ baseUrl: apiURL });

export type EncounterCreature = components["schemas"]["EncounterCreature"];

export function clientToken() {
  return getCookie("token");
}

export function useCreateEncounter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      encounter: components["schemas"]["EncounterRequest"]
    ) => {
      const { error } = await POST(`/api/encounters`, {
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
    },
  });
}

export function useDeleteEncounter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await DELETE(`/api/encounters/{encounter_id}`, {
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
    },
    onSuccess: (deleted_id) => {
      queryClient.setQueryData(encountersQueryKey, (oldData) => {
        console.log(oldData, deleted_id);
        if (oldData && Array.isArray(oldData)) {
          return oldData.filter((encounter) => encounter.id !== deleted_id);
        } else {
          return oldData;
        }
      });
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
  const id = encounter_id ? encounter_id : useEncounterId();
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
    onSuccess: (data) => {
      queryClient.setQueryData(encounterCreaturesKey(id), (oldData) => {
        if (oldData && Array.isArray(oldData)) {
          return oldData.map((creature) => {
            if (creature.creature_id === data.creature_id) {
              return {
                ...creature,
                ...data,
              };
            }
            return creature;
          });
        } else {
          return oldData;
        }
      });
    },
  });
}

export function useAddCreatureToEncounter() {
  const queryClient = useQueryClient();
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
      queryClient.setQueryData(encounterCreaturesKey(id), data);
    },
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
  const queryClient = useQueryClient();
  const id = useEncounterId();
  return useMutation({
    mutationFn: async () => {
      const { error, data } = await POST(
        `/api/encounters/{encounter_id}/next_turn`,
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
      queryClient.refetchQueries(encounterCreaturesKey(id));
    },
  });
}

export function usePreviousTurn() {
  const queryClient = useQueryClient();
  const id = useEncounterId();
  return useMutation({
    mutationFn: async () => {
      const { response, error, data } = await POST(
        `/api/encounters/{encounter_id}/previous_turn`,
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
      if (response.status !== 200) {
        console.log(await response.text());
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(encounterCreaturesKey(id), data);
    },
  });
}
