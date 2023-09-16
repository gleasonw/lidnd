"use server";

import apiURL from "@/app/apiURL";
import { cookies } from "next/headers";

export async function updateEncounterCreature(
  creature: any,
  encounterId: string
) {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;
  const creaturesResponse = await fetch(
    `${apiURL}/encounters/${encounterId}/creatures/${creature.id}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(creature),
    }
  );

  return await creaturesResponse.json();
}
