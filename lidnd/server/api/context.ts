import { inferAsyncReturnType } from "@trpc/server";
import { NextRequest } from "next/server";
import { fetchWhitelist, getPageSession } from "@/server/api/utils";

export async function createContext({
  req,
  res,
}: {
  req: NextRequest;
  res?: any;
}) {
  const session = await getPageSession();
  if (!session) return { user: null };
  const whitelist = await fetchWhitelist();
  if (!whitelist.has(session.user.username)) {
    return {
      user: null,
    };
  }
  return {
    user: session.user
  };
}
export type Context = inferAsyncReturnType<typeof createContext>;
