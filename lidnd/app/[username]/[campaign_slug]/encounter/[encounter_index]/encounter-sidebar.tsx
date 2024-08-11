"use client";

import { Button } from "@/components/ui/button";
import {
  EncounterReminderInput,
  EncounterStartButton,
  EncounterStats,
} from "@/encounters/[encounter_index]/encounter-prep";
import {
  useEncounter,
  useEncounterLink,
} from "@/encounters/[encounter_index]/hooks";
import { Play } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

export function EncounterSidebar() {
  const runLink = useEncounterLink("run");
  const [encounter] = useEncounter();

  const url = usePathname();
  const status = url.split("/").at(-1);

  if (status === "run") {
    return null;
  }

  return (
    <div className="pl-7 pt-5 w-[300px] hidden md:flex border-l mr-2">
      <div className="flex-col gap-5 flex">
        {encounter?.started_at ? (
          <Link href={runLink}>
            <Button>
              <Play />
              Continue the battle!
            </Button>
          </Link>
        ) : (
          <EncounterStartButton />
        )}
        <EncounterStats />
        <EncounterReminderInput />
      </div>
    </div>
  );
}
