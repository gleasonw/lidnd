"use client";

import { useUIStore } from "@/app/UIStore";
import { CreatureUtils } from "@/utils/creatures";
import { ParticipantUtils } from "@/utils/participants";
import { observer } from "mobx-react-lite";
import Image from "next/image";
import React from "react";

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

export const CreatureIcon = observer(function CreatureIcon({
  creature,
  size,
}: {
  creature: {
    id: string;
    icon_width: number;
    icon_height: number;
    name: string;
    is_player: boolean;
  };
  size?: IconSize;
}) {
  const uiStore = useUIStore();
  const status = uiStore.getIconUploadStatus(creature);
  const dimensions = iconDimensions(creature, size);
  const [retryCount, setRetryCount] = React.useState(0);

  const initials = ParticipantUtils.initials({ creature });
  const fallbackText = initials ? initials.slice(0, 2) : "?";
  const fallbackColor = creature.is_player ? "#2563eb" : "#b91c1c";

  const icon = (
    <div>
      {retryCount >= 1 ? (
        <div
          className="text-lg font-semibold uppercase tracking-wide text-white w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: fallbackColor }}
        >
          {fallbackText}
        </div>
      ) : (
        <Image
          src={CreatureUtils.awsURL(creature, "icon")}
          alt={creature.name}
          width={dimensions.width}
          height={dimensions.height}
          className="w-10 h-10 rounded-full"
          fetchPriority="high"
          onError={(e) => {
            if (retryCount < 3) {
              console.log("retrying");
              setTimeout(() => setRetryCount(retryCount + 1), 500);
            } else {
              console.error(e);
            }
          }}
        />
      )}
    </div>
  );

  if (creature.id === "pending") {
    // catch the case where we'v just uploaded but not yet set the
    // image upload status in the ui store...
    return <div>pending</div>;
  }

  switch (status) {
    case "pending":
      return <div>uploading icon</div>;
    case "error":
      return <div>error</div>;
    case "idle":
      return icon;
    case "success":
      return icon;
    case undefined:
      return icon;
    default: {
      //@ts-expect-error - exhaustive check
      const _: never = status;
      throw new Error(`Unhandled case: ${status}`);
    }
  }
});
