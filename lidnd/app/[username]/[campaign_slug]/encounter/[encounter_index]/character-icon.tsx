import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { CreatureUtils } from "@/utils/creatures";

type IconSize = "v-small" | "small" | "small2" | "medium" | "large";

function iconDimensions(
  creature: { icon_width: number; icon_height: number },
  size?: IconSize
): { width: number; height: number } {
  if (!size) {
    return { width: creature.icon_width, height: creature.icon_height };
  }

  if (size === "v-small") {
    return { width: 40, height: 40 };
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
}: {
  creature: {
    id: string;
    icon_width: number;
    icon_height: number;
    name: string;
  };
  size?: IconSize;
}) {
  if (!creature.icon_width || !creature.icon_height) {
    console.trace();
    throw new Error(
      `No icon width or height for ${creature.name}, ${JSON.stringify(
        creature
      )}`
    );
  }

  if (creature.id === "pending") {
    return <Skeleton />;
  }

  const { width, height } = iconDimensions(creature, size);

  return (
    <Avatar>
      <AvatarImage
        src={CreatureUtils.awsURL(creature, "icon")}
        alt={creature.name}
        width={width}
        height={height}
        fetchPriority="high"
      />
      <AvatarFallback>{creature.name}</AvatarFallback>
    </Avatar>
  );
}
