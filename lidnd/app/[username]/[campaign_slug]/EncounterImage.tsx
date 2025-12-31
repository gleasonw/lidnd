"use client";

import { EncounterUtils } from "@/utils/encounters";
import Image from "next/image";
import React from "react";

export function EncounterImage({
  encounter,
}: {
  encounter: Parameters<typeof EncounterUtils.imageUrl>[0] & { name: string };
}) {
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    setImageUrl(EncounterUtils.imageUrl(encounter));
  }, [encounter]);

  if (!imageUrl) {
    return <div className="w-6 h-6 bg-gray-300 rounded-md" />;
  }

  return (
    <Image src={imageUrl ?? ""} alt={encounter.name} width={25} height={25} />
  );
}
