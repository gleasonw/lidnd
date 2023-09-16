import { paths, components } from "@/app/schema";
import createClient from "openapi-fetch";
import apiURL from "@/app/apiURL";
import { cookies } from "next/headers";

const { GET, PUT } = createClient<paths>({ baseUrl: apiURL });

export function token() {
  // check if server or client
  if (typeof window !== "undefined") {
    return document.cookie.split("token=")[1];
  }

  const cookieStore = cookies();
  return cookieStore.get("token")?.value;
}

export async function getCreatures(id: string) {
  const { data, error, response } = await GET(
    `/api/encounters/{encounter_id}/creatures`,
    {
      params: { path: { encounter_id: parseInt(id) } },
      headers: {
        Authorization: `Bearer ${token()}`,
      },
    }
  );
  if (error) {
    throw error;
  }

  return data;
}

export async function getEncounter(id: string) {
  const { data, error, response } = await GET(
    `/api/encounters/{encounter_id}`,
    {
      params: { path: { encounter_id: parseInt(id) } },
      headers: {
        Authorization: `Bearer ${token()}`,
      },
    }
  );
  if (error) {
    throw error;
  }

  return data;
}
export async function updateEncounterCreature(
  creature: components["schemas"]["EncounterParticipant"],
  encounterId: string
) {
  const { data, error, response } = await PUT(
    `/api/encounters/{encounter_id}/creatures/{creature_id}`,
    {
      params: {
        path: {
          encounter_id: parseInt(encounterId),
          creature_id: parseInt(creature.id),
        },
      },
      headers: {
        Authorization: `Bearer ${token()}`,
      },
      body: creature,
    }
  );
  if (error) {
    throw error;
  }

  return data;
}
