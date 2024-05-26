import { inferAsyncReturnType } from "@trpc/server";
import { NextRequest } from "next/server";
import { getPageSession } from "@/server/api/utils";

export async function createContext(request: { req: NextRequest; res?: any }) {
  const session = await getPageSession();
  if (!session) return { user: null };
  return {
    user: session.user,
  };
}
export type Context = inferAsyncReturnType<typeof createContext>;
