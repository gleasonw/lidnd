"use client";

import { useEncounter } from "@/encounters/[encounter_index]/hooks";
import { MonsterUpload } from "@/encounters/[encounter_index]/participant-add-form";
import React from "react";

export function EncounterSidebar() {
  const [encounter] = useEncounter();

  if (encounter.status === "run") {
    return null;
  }

  return (
    <div className="pl-7 pt-5 hidden md:flex border-l mr-2">
      <MonsterUpload />
    </div>
  );
}
