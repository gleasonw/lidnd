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

  return (
    <Image src={imageUrl ?? ""} alt={encounter.name} width={25} height={25} />
  );
}
