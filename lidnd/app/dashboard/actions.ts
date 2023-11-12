"use server";

import { auth } from "@/server/api/auth/lucia";
import { getPageSession } from "@/server/api/utils";
import { getPackedSettings } from "http2";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

function token() {
  const cookieStore = cookies();
  return cookieStore.get("token")?.value;
}

export async function logOut() {
  const session = await getPageSession();
  if (!session) return redirect("/login");
  await auth.invalidateSession(session?.sessionId);
  redirect("/login");
}

export async function updateSettings(form: FormData) {
  console.log(form);
}
