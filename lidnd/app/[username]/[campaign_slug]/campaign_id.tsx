"use client";

import { createContext, useContext } from "react";

interface CampaignIdProps {
  children: React.ReactNode;
  value: string;
}

const CampaignIdContext = createContext<string | null>(null);
export const useCampaignId = () => {
  const id = useContext(CampaignIdContext);
  if (!id) {
    throw new Error("useCampaignId must be used within a CampaignIdProvider");
  }
  return id;
};

export function CampaignId(props: CampaignIdProps) {
  return (
    <CampaignIdContext.Provider value={props.value}>
      {props.children}
    </CampaignIdContext.Provider>
  );
}
