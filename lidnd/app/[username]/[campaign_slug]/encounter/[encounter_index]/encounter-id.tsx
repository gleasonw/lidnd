"use client";

import { useCampaign } from "@/app/[username]/[campaign_slug]/hooks";
import { createContext, useContext } from "react";
import { isNumber } from "remeda";

interface EncounterIdProps {
  children: React.ReactNode;
  encounterIndex: string | number;
}

const EncounterIdContext = createContext<string | null>(null);

export const useEncounterId = () => {
  const id = useContext(EncounterIdContext);
  if (!id) {
    throw new Error("useEncounterId must be used within a EncounterIdProvider");
  }
  return id;
};

export function EncounterId(props: EncounterIdProps) {
  const [campaign] = useCampaign();
  const encounter = campaign?.encounters.find(
    (e) =>
      e.index_in_campaign ===
      (isNumber(props.encounterIndex)
        ? props.encounterIndex
        : parseInt(props.encounterIndex)),
  );
  if (!encounter) {
    throw new Error(
      "No encounter found when trying to get id from encounter index",
    );
  }

  return (
    <EncounterIdContext.Provider value={encounter.id}>
      {props.children}
    </EncounterIdContext.Provider>
  );
}
