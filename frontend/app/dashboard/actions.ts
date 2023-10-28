"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import createClient from "openapi-fetch";
import { paths, components } from "@/app/schema";

import apiURL from "@/app/apiURL";
import { revalidatePath } from "next/cache";

const { GET, PUT } = createClient<paths>({ baseUrl: apiURL });

function token() {
  const cookieStore = cookies();
  return cookieStore.get("token")?.value;
}

export async function logOut() {
  // just delete the user's token
  const cookieStore = cookies();
  cookieStore.delete("token");
  redirect("/login");
}

export type DiscordEncounterSettings =
  components["schemas"]["DiscordEncounterSettings"];

export async function updateDiscordSettings(args: DiscordEncounterSettings) {
  const { error } = await PUT(`/api/discord-settings`, {
    body: args,
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  });
  if (error) {
    console.log(error.detail);
  }
  revalidatePath("/dashboard/discord");  
}

export async function getDiscordSettings() {
  const { data } = await GET(`/api/discord-settings`, {
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  });
  return data;
}
