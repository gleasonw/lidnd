"use client";

import React from "react";
import { useRouter } from "next/navigation";

export function PageRefresher() {
  const router = useRouter();
  React.useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 2000);
    return () => clearInterval(interval);
  }, [router]);
  return null;
}
