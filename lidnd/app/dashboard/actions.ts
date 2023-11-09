"use server";

import { cookies } from "next/headers";

function token() {
  const cookieStore = cookies();
  return cookieStore.get("token")?.value;
}
