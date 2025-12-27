"use client";

import { useUIStore } from "@/app/UIStore";
import type { Creature } from "@/server/api/router";
import { CreatureUtils } from "@/utils/creatures";
import { ParticipantUtils } from "@/utils/participants";
import clsx from "clsx";
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
  creature: Pick<Creature, "id" | "icon_width" | "icon_height" | "type" | "name">;
  size?: IconSize;
}) {
  const dimensions = iconDimensions(creature, size);
  // unrelated to upload status for now... although maybe should merge.... purely image loading
  const [imageStatus, setImageStatus] = React.useState<
    "loading" | "loaded" | "error"
  >("loading");

  const initials = ParticipantUtils.initials({ creature });
  const fallbackText = initials ? initials.slice(0, 2) : "?";
  const fallbackColor = ParticipantUtils.isPlayer({creature}) ? "#2563eb" : "#b91c1c";
  if (creature.id === "pending") {
    // catch the case where we'v just uploaded but not yet set the
    // image upload status in the ui store...
    return <div>pending</div>;
  }
  if (!ParticipantUtils.hasIcon({ creature })) {
    return (
      <div
        className={clsx(
          "text-lg font-semibold transition-opacity uppercase tracking-wide text-white w-10 h-10 rounded-full flex items-center justify-center"
        )}
        style={{ backgroundColor: fallbackColor }}
      >
        {fallbackText}
      </div>
    );
  }
  return (
    <ImageUploadStatus creature={creature}>
      <div
        className={clsx("relative", {
          "w-10 h-10": size === undefined || size === "small",
          "w-7 h-7": size === "v-small",
        })}
      >
        <div
          className={clsx(
            "text-lg absolute font-semibold transition-opacity uppercase tracking-wide text-white w-10 h-10 rounded-full flex items-center justify-center",
            {
              "opacity-0": imageStatus !== "error",
              "opacity-100": imageStatus === "error",
            }
          )}
          style={{ backgroundColor: fallbackColor }}
        >
          {fallbackText}
        </div>
        <Image
          src={CreatureUtils.awsURL(creature, "icon")}
          alt={creature.name}
          width={dimensions.width}
          height={dimensions.height}
          onLoad={() => setImageStatus("loaded")}
          className={clsx(
            "absolute top-0 left-0 rounded-full transition-opacity",
            {
              "opacity-0": imageStatus !== "loaded",
              "opacity-100": imageStatus === "loaded",
              "h-10 w-10": size === undefined || size === "small",
              "h-7 w-7": size === "v-small",
            }
          )}
          fetchPriority="high"
          onError={(e) => {
            setImageStatus("error");
          }}
        />
      </div>
    </ImageUploadStatus>
  );
});

const ImageUploadStatus = observer(function ImageUploadStatus({
  children,
  creature,
}: {
  children: React.ReactNode;
  creature: { id: string; icon_width: number; icon_height: number };
}) {
  const uiStore = useUIStore();
  const status = uiStore.getIconUploadStatus(creature);

  switch (status) {
    case "pending":
      return <div>uploading icon</div>;
    case "error":
      return <div>error</div>;
    case "idle":
      return <div>{children}</div>;
    case "success":
      return <div>{children}</div>;
    case undefined:
      return <div>{children}</div>;
    default: {
      //@ts-expect-error - exhaustive check
      const _: never = status;
      throw new Error(`Unhandled case: ${status}`);
    }
  }
});
