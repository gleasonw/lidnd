"use client";

import type { Creature } from "@/server/api/router";
import { CreatureUtils } from "@/utils/creatures";
import Image from "next/image";

export interface OriginalSizeImageProps {
  creature: Creature;
  ref?: React.Ref<HTMLImageElement>;
}

export function CreatureStatBlockImage({
  creature,
  ref,
}: OriginalSizeImageProps) {
  return (
    <Image
      src={CreatureUtils.awsURL(creature, "stat_block")}
      className="select-none object-contain"
      ref={ref}
      alt={creature.name}
      quality={100}
      width={creature.stat_block_width}
      height={creature.stat_block_height}
    />
  );
}
