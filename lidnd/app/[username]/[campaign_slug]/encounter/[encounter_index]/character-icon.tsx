import { Skeleton } from "@/components/ui/skeleton";
import type { Creature } from "@/server/api/router";
import { CreatureUtils } from "@/utils/creatures";
import Image from "next/image";

function iconDimensions(
  creature: Creature,
  size?: "small" | "small2" | "medium" | "large",
): { width: number; height: number } {
  if (!size) {
    return { width: creature.icon_width, height: creature.icon_height };
  }

  if (size === "small") {
    return { width: 64, height: 64 };
  }

  if (size === "small2") {
    return { width: 128, height: 128 };
  }

  if (size === "medium") {
    return { width: 250, height: 250 };
  }

  return { width: 512, height: 512 };
}

export function CreatureIcon({
  creature,
  size,
  objectFit,
}: {
  creature: Creature;
  size?: "small" | "small2" | "medium" | "large";
  objectFit?: "contain" | "cover";
}) {
  if (!creature.icon_width || !creature.icon_height) {
    console.trace();
    throw new Error(
      `No icon width or height for ${creature.name}, ${JSON.stringify(creature)}`,
    );
  }

  if (creature.id === "pending") {
    return <Skeleton />;
  }

  return (
    <Image
      quality={100}
      className="select-none"
      src={CreatureUtils.awsURL(creature, "icon")}
      alt={creature.name}
      priority
      style={
        objectFit ? { objectFit, maxWidth: "100%", maxHeight: "100%" } : {}
      }
      {...iconDimensions(creature, size)}
    />
  );
}
