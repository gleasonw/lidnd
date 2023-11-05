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
import { useEncounterId } from "@/app/dashboard/encounters/hooks";
import {
  getCreaturePostForm,
  sortEncounterCreatures,
} from "@/app/dashboard/encounters/utils";
import { CreaturePost } from "@/app/dashboard/encounters/[id]/creature-add-form";

const { GET, PUT, POST, DELETE } = createClient<paths>({ baseUrl: apiURL });

export function clientToken() {
  return getCookie("token");
}

export function useUpdateCreature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      creature,
    }: {
      id: number;
      creature: components["schemas"]["Creature"];
    }) => {
      const { error, data } = await PUT(`/api/creatures/{creature_id}`, {
        params: {
          path: {
            creature_id: id,
          },
        },
        headers: {
          Authorization: `Bearer ${clientToken()}`,
        },
        body: creature,
      });
      if (error) {
        console.log(error.detail);
        throw error;
      }
      return data;
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["userCreatures"] });
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

const allUserCreaturesKey = ["userCreatures", { name: "" }];

export function useUserCreatures(name?: string, filterEncounter?: number) {
  return useQuery({
    queryKey: [
      "userCreatures",
      {
        name,
        filterEncounter,
      },
    ],
    queryFn: async () => {
      const { data, error } = await GET(`/api/creatures`, {
        params: {
          query: {
            name,
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
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<T>(queryKey);

      queryClient.setQueryData(queryKey, (oldData: T | undefined) =>
        localUpdateFn(oldData, newData)
      );

      return { previousData };
    },
    onError: (err: any, newData: any, context: any) => {
      queryClient.setQueryData(queryKey, context?.previousData);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  };
}

export function useUpdateEncounterCreature() {
  const id = useEncounterId();
  return useMutation({
    mutationFn: async (
      creature: components["schemas"]["EncounterParticipant"]
    ) => {
      const { error, data } = await PUT(
        `/api/encounters/{encounter_id}/{participant_id}}`,
        {
          params: {
            path: {
              encounter_id: id,
              participant_id: creature.id,
            },
            query: {
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
          if (c.id === newData.id) {
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
  const optimisticId = Math.random();

  return useMutation({
    mutationFn: async (creatureData: CreaturePost) => {
      // we use native fetch here because openapi-fetch doesn't seem to support FormData
      const formData = getCreaturePostForm(creatureData);

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
    onSuccess: async (data) => {
      if (onCreatureAdded) {
        onCreatureAdded();
      }
    },
    ...useOptimisticUpdate<EncounterCreature[]>(
      encounterCreaturesKey(id),
      (oldData = [], newData) => {
        const newCreature: EncounterCreature = {
          id: optimisticId,
          creature_id: 1,
          encounter_id: id,
          hp: newData.max_hp,
          max_hp: newData.max_hp,
          name: newData.name,
          is_active: false,
          challenge_rating: 0,
          initiative: 0,
        };
        return [...oldData, newCreature];
      }
    ),
  });
}

export function useAddExistingCreatureToEncounter() {
  const id = useEncounterId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["addExistingCreatureToEncounter"],
    mutationFn: async (creatureData: {
      name: string;
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
    onSettled: async () => {
      await Promise.allSettled(
        [
          encounterCreaturesKey(id),
          [
            "userCreatures",
            {
              filterEncounter: id,
            },
          ],
        ].map((queryKey) => queryClient.invalidateQueries(queryKey as any))
      );
    },
  });
}

export function useCreateCreature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (creatureData: CreaturePost) => {
      // we use native fetch here because openapi-fetch doesn't seem to support FormData
      const formData = getCreaturePostForm(creatureData);
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
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: allUserCreaturesKey });
    },
  });
}

export function useDeleteCreature() {
  const queryClient = useQueryClient();
  const queryKey = ["userCreatures"];
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
      console.log(data);
      return data;
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });
}
