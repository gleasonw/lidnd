"use client";

import type { Creature } from "@/server/api/router";
import { CreatureUtils } from "@/utils/creatures";
import Image from "next/image";

export interface OriginalSizeImageProps {
  creature: Creature;
}

export function CreatureStatBlockImage({ creature }: OriginalSizeImageProps) {
  return (
    <Image
      src={CreatureUtils.awsURL(creature, "stat_block")}
      className="select-none object-contain"
      alt={creature.name}
      style={{ imageRendering: "crisp-edges", transform: "translateZ(0)" }}
      width={creature.stat_block_width}
      height={creature.stat_block_height}
    />
  );
}
