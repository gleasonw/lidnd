import { paths, components } from "@/app/schema";
import createClient from "openapi-fetch";
import apiURL from "@/app/apiURL";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getCookie } from "cookies-next";

const { GET, PUT, POST } = createClient<paths>({ baseUrl: apiURL });

export type EncounterCreature = components["schemas"]["EncounterCreature"];

function clientToken() {
  return getCookie("token");
}

export function useCreateEncounter(
  encounter: components["schemas"]["EncounterRequest"]
) {
  return useMutation({
    mutationFn: async () => {
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
    },
  });
}

export function useEncounters() {
  return useQuery({
    queryKey: ["encounters"],
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

export function useEncounterCreatures(
  params: paths["/api/encounters/{encounter_id}/creatures"]["get"]["parameters"]["path"]
) {
  return useQuery({
    queryKey: ["encounterCreatures", params],
    queryFn: async () => {
      const { data, error } = await GET(
        `/api/encounters/{encounter_id}/creatures`,
        {
          params: { path: params },
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

export function useEncounter(
  params: paths["/api/encounters/{encounter_id}"]["get"]["parameters"]["path"]
) {
  return useQuery({
    queryKey: ["encounter", params],
    queryFn: async () => {
      const { data, error } = await GET(`/api/encounters/{encounter_id}`, {
        params: { path: params },
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

export function useUpdateEncounterCreature(
  params: paths["/api/encounters/{encounter_id}/creatures/{creature_id}"]["put"]["parameters"]["path"],
  creature: components["schemas"]["EncounterParticipant"]
) {
  return useMutation({
    mutationFn: async () => {
      const { error } = await PUT(
        `/api/encounters/{encounter_id}/creatures/{creature_id}`,
        {
          params: { path: params },
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
    },
  });
}

export function useAddCreatureToEncounter(
  params: paths["/api/encounters/{encounter_id}/creatures"]["post"]["parameters"]["path"],
  creatureData: components["schemas"]["CreatureRequest"]
) {
  return useMutation({
    mutationFn: async () => {
      const { error } = await POST(`/api/encounters/{encounter_id}/creatures`, {
        params: { path: params },
        headers: {
          Authorization: `Bearer ${clientToken()}`,
        },
        body: creatureData,
      });
      if (error) {
        console.log(error.detail);
        throw error;
      }
    },
  });
}

export function useStartEncounter(
  params: paths["/api/encounters/{encounter_id}/start"]["post"]["parameters"]["path"]
) {
  return useMutation({
    mutationFn: async () => {
      const { error } = await POST(`/api/encounters/{encounter_id}/start`, {
        params: { path: params },
        headers: {
          Authorization: `Bearer ${clientToken()}`,
        },
      });
      if (error) {
        console.log(error.detail);
        throw error;
      }
    },
  });
}

export function useNextTurn(
  params: paths["/api/encounters/{encounter_id}/next_turn"]["post"]["parameters"]["path"]
) {
  return useMutation({
    mutationFn: async () => {
      const { error } = await POST(`/api/encounters/{encounter_id}/next_turn`, {
        params: { path: params },
        headers: {
          Authorization: `Bearer ${clientToken()}`,
        },
      });
      if (error) {
        console.log(error.detail);
        throw error;
      }
    },
  });
}

export async function usePreviousTurn(
  params: paths["/api/encounters/{encounter_id}/previous_turn"]["post"]["parameters"]["path"]
) {
  return useMutation({
    mutationFn: async () => {
      const { response, error } = await POST(
        `/api/encounters/{encounter_id}/previous_turn`,
        {
          params: { path: params },
          headers: {
            Authorization: `Bearer ${clientToken()}`,
          },
        }
      );
      if (response.status !== 200) {
        console.log(await response.text());
        throw error;
      }
    },
  });
}
