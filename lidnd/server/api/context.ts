import { LidndAuth } from "@/app/authentication";
import type { NextRequest } from "next/server";

export async function createContext({ req }: { req: NextRequest }) {
  const user = await LidndAuth.getUser();
  if (!user) return { user: null };
  return {
    user,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
