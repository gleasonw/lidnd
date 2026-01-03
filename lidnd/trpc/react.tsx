"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCReact } from "@trpc/react-query";
import { useState } from "react";
import { loggerLink, unstable_httpBatchStreamLink } from "@trpc/client";
import superjson from "superjson";

import { type AppRouter } from "@/server/api/router";
import { getUrl } from "./shared";
import { invalidateServerFunctionCache } from "@/app/[username]/actions";

export const api = createTRPCReact<AppRouter>();

function makeQueryClient() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
      // mark all queries as stale after a mutation
      mutations: {
        onSuccess: async () => {
          await Promise.all([
            qc.invalidateQueries(),
            //TODO: this is pretty wonky and gross, but we can't invalidate in the router, it doesn't actually
            // cause client components to re-fetch data.
            invalidateServerFunctionCache(),
          ]);
        },
        networkMode: "always",
      },
    },
  });
  return qc;
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function TRPCReactProvider(props: {
  children: React.ReactNode;
  cookies: string;
}) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        unstable_httpBatchStreamLink({
          transformer: superjson,
          url: getUrl(),
          headers() {
            return {
              cookie: props.cookies,
              "x-trpc-source": "react",
            };
          },
        }),
      ],
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
}
