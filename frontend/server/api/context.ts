import * as trpc from "@trpc/server";
import { inferAsyncReturnType } from "@trpc/server";
import * as trpcNext from "@trpc/server/adapters/next";
import { verifyDiscordToken } from "@/middleware";
import { NextRequest } from "next/server";

export async function createContext({
  req,
  res,
}: {
  req: NextRequest;
  res?: any;
}) {
  const auth = await verifyDiscordToken();
  if (!auth.user) {
    return {
      user: null,
    };
  }

  return {
    user: auth.user,
  };
}
export type Context = inferAsyncReturnType<typeof createContext>;
