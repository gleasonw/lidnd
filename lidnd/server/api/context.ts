import { inferAsyncReturnType } from "@trpc/server";
import { NextRequest } from "next/server";
import { auth } from "@/server/api/auth/lucia";
import * as context from "next/headers";
import { getPageSession } from "@/server/api/utils";

export async function createContext({
  req,
  res,
}: {
  req: NextRequest;
  res?: any;
}) {
  const session = await getPageSession();
  if (!session) return { user: null };
  return {
    user: session.user
  };
}
export type Context = inferAsyncReturnType<typeof createContext>;
