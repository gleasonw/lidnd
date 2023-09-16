import apiURL from "@/app/apiURL";
import { cookies } from "next/headers";
import { paths, components } from "@/app/schema";


export function token() {
  // check if server or client
  if (typeof window !== "undefined") {
    return document.cookie.split("token=")[1];
  }

  const cookieStore = cookies();
  return cookieStore.get("token")?.value;
}

export async function getCreatures(id: string) {
  const creaturesResponse = await fetch(
    `${apiURL}/encounters/${id}/creatures`,
    {
      headers: {
        Authorization: `Bearer ${token()}`,
      },
    }
  );

  return await creaturesResponse.json();
}

export async function getEncounter(id: string) {
  const encounterResponse = await fetch(`${apiURL}/encounters/${id}`, {
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  });
  return await encounterResponse.json();
}
