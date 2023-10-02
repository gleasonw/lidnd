"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function logOut() {
  // just delete the user's token
  const cookieStore = cookies();
  cookieStore.delete("token");
  redirect("/login");
}
