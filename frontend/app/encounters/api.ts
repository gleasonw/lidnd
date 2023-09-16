"use server";

import { paths, components } from "@/app/schema";
import createClient from "openapi-fetch";
import apiURL from "@/app/apiURL";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const { GET, PUT, DELETE, POST } = createClient<paths>({ baseUrl: apiURL });

export type EncounterCreature = components["schemas"]["EncounterCreature"];

function serverToken() {
  const cookieStore = cookies();
  return cookieStore.get("token")?.value;
}

export async function createEncounter(
  encounter: components["schemas"]["EncounterRequest"]
) {
  "use server";
  const { data, error } = await POST(`/api/encounters`, {
    headers: {
      Authorization: `Bearer ${serverToken()}`,
    },
    body: encounter,
  });
  if (error) {
    console.log(error.detail);
    throw error;
  }
  revalidatePath("/encounters");
  redirect(`/encounters/${data.id}`);
}

export async function getUserEncounters() {
  const { data, response } = await GET(`/api/encounters`, {
    headers: {
      Authorization: `Bearer ${serverToken()}`,
    },
  });
  if (response.status !== 200) {
    console.log(await response.text());
  }
  return data;
}

export async function getEncounterCreatures(
  params: paths["/api/encounters/{encounter_id}/creatures"]["get"]["parameters"]["path"]
) {
  const { data, error, response } = await GET(
    `/api/encounters/{encounter_id}/creatures`,
    {
      params: { path: params },
      headers: {
        Authorization: `Bearer ${serverToken()}`,
      },
    }
  );
  if (response.status !== 200) {
    console.log(await response.text());
    throw error;
  }

  return data;
}

export async function getEncounter(
  params: paths["/api/encounters/{encounter_id}"]["get"]["parameters"]["path"]
) {
  const { data, error, response } = await GET(
    `/api/encounters/{encounter_id}`,
    {
      params: { path: params },
      headers: {
        Authorization: `Bearer ${serverToken()}`,
      },
    }
  );
  if (response.status !== 200) {
    console.log(await response.text());
    throw error;
  }

  return data;
}

export async function updateEncounterCreature(
  params: paths["/api/encounters/{encounter_id}/creatures/{creature_id}"]["put"]["parameters"]["path"],
  creature: components["schemas"]["EncounterParticipant"]
) {
  "use server";
  const { data, error, response } = await PUT(
    `/api/encounters/{encounter_id}/creatures/{creature_id}`,
    {
      params: { path: params },
      headers: {
        Authorization: `Bearer ${serverToken()}`,
      },
      body: creature,
    }
  );
  if (response.status !== 200) {
    console.log(await response.text());
    throw error;
  }

  return data;
}

export async function addCreatureToEncounter(
  params: paths["/api/encounters/{encounter_id}/creatures"]["post"]["parameters"]["path"],
  creatureData: components["schemas"]["CreatureRequest"]
) {
  "use server";
  const { data, error, response } = await POST(
    `/api/encounters/{encounter_id}/creatures`,
    {
      params: { path: params },
      headers: {
        Authorization: `Bearer ${serverToken()}`,
      },
      body: creatureData,
    }
  );
  if (response.status !== 200) {
    console.log(await response.text());
    throw error;
  }
  revalidatePath(`/encounters/${params.encounter_id}`);

  return data;
}

export async function startEncounter(
  params: paths["/api/encounters/{encounter_id}/start"]["post"]["parameters"]["path"]
) {
  "use server";
  const { data, error, response } = await POST(
    `/api/encounters/{encounter_id}/start`,
    {
      params: { path: params },
      headers: {
        Authorization: `Bearer ${serverToken()}`,
      },
    }
  );
  if (response.status !== 200) {
    console.log(await response.text());
    throw error;
  }
  revalidatePath(`/encounters/${params.encounter_id}`);
}

export async function nextTurn(
  params: paths["/api/encounters/{encounter_id}/next_turn"]["post"]["parameters"]["path"]
) {
  const { data, response, error } = await POST(
    `/api/encounters/{encounter_id}/next_turn`,
    {
      params: { path: params },
      headers: {
        Authorization: `Bearer ${serverToken()}`,
      },
    }
  );
  if (response.status !== 200) {
    console.log(await response.text());
    throw error;
  }
  revalidatePath(`/encounters/${params.encounter_id}/run`);
}

export async function previousTurn(
  params: paths["/api/encounters/{encounter_id}/previous_turn"]["post"]["parameters"]["path"]
) {
  const { data, response, error } = await POST(
    `/api/encounters/{encounter_id}/previous_turn`,
    {
      params: { path: params },
      headers: {
        Authorization: `Bearer ${serverToken()}`,
      },
    }
  );
  if (response.status !== 200) {
    console.log(await response.text());
    throw error;
  }
  revalidatePath(`/encounters/${params.encounter_id}/run`);
}
