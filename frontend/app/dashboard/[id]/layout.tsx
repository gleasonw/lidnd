"use client";

import { useEncounter } from "@/app/dashboard/api";

export default function EncounterLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: any;
}) {
  return <section>{children}</section>;
}
