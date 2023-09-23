"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import Link from "next/link";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <nav className="border-bottom border flex">
        <Link href={"/encounters"} className={"w-full p-5 text-center"}>
          My encounters
        </Link>
      </nav>
      {children}
    </QueryClientProvider>
  );
}
