"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { SpellSearcher } from "@/app/dashboard/campaigns/[campaign]/encounters/[id]/run/battle-ui";

export default function ClientOverlays({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    window.addEventListener("focus", router.refresh);

    return () => {
      window.removeEventListener("focus", () => {});
    };
  }, []);

  return (
    <>
      <SpellSearcher />
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}
