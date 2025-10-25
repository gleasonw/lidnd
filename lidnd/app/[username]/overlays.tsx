"use client";

import React from "react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export default function ClientOverlays({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}
