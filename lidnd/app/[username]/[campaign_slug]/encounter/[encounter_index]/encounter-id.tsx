"use client";

import { createContext, useContext } from "react";

interface EncounterIdProps {
  children: React.ReactNode;
  value: string;
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
  return (
    <EncounterIdContext.Provider value={props.value}>
      {props.children}
    </EncounterIdContext.Provider>
  );
}
