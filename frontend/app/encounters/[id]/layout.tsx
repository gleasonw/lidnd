"use client";

import { useEncounter } from "@/app/encounters/api";

export default function EncounterLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: any;
}) {
  const { data: encounter } = useEncounter();
  return (
    <section>
      <div className={"flex flex-col"}>
        <h1 className={"text-2xl"}>{encounter?.name}</h1>
        <p>{encounter?.description}</p>
      </div>
      {children}
    </section>
  );
}
