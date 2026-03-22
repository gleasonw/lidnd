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
    return { width: 16, height: 16 };
  }

  if (size === "small") {
    return { width: 40, height: 40 };
  }

  if (size === "small2") {
    return { width: 96, height: 96 };
  }
  //
  if (size === "medium") {
    return { width: 250, height: 250 };
  }

  return { width: 512, height: 512 };
}

function iconTextClass(size?: IconSize) {
  switch (size) {
    case "v-small":
      return "text-xs";
    case "small":
      return "text-s";
    case "small2":
      return "text-2xl";
    case "medium":
      return "text-6xl";
    case "large":
      return "text-8xl";
    default:
      return "text-lg";
  }
}

export const CreatureIcon = observer(function CreatureIcon({
  creature,
  size,
}: {
  creature: Pick<
    Creature,
    "id" | "icon_width" | "icon_height" | "type" | "name"
  >;
  size?: IconSize;
}) {
  const dimensions = iconDimensions(creature, size);
  // unrelated to upload status for now... although maybe should merge.... purely image loading
  const [imageStatus, setImageStatus] = React.useState<
    "loading" | "loaded" | "error"
  >("loading");

  const initials = ParticipantUtils.initials({ creature });
  const fallbackText = initials ? initials.slice(0, 2) : "?";
  const fallbackColor = ParticipantUtils.isPlayer({ creature })
    ? "#2563eb"
    : "#b91c1c";
  const fallbackClasses = clsx(
    "absolute inset-0 flex items-center justify-center rounded-full font-semibold uppercase tracking-wide text-white transition-opacity",
    iconTextClass(size)
  );

  if (creature.id === "pending") {
    // catch the case where we'v just uploaded but not yet set the
    // image upload status in the ui store...
    return <div>pending</div>;
  }
  if (!ParticipantUtils.hasIcon({ creature })) {
    return (
      <div
        className={clsx(
          "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full"
        )}
        style={{
          width: dimensions.width,
          height: dimensions.height,
        }}
      >
        <div
          className={fallbackClasses}
          style={{ backgroundColor: fallbackColor }}
        >
          {fallbackText}
        </div>
      </div>
    );
  }
  return (
    <ImageUploadStatus creature={creature}>
      <div
        className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full"
        style={{
          width: dimensions.width,
          height: dimensions.height,
        }}
      >
        <div
          className={clsx(fallbackClasses, {
            "opacity-0": imageStatus !== "error",
            "opacity-100": imageStatus === "error",
          })}
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
            "absolute inset-0 h-full w-full rounded-full object-cover transition-opacity",
            {
              "opacity-0": imageStatus !== "loaded",
              "opacity-100": imageStatus === "loaded",
            }
          )}
          fetchPriority="high"
          onError={() => {
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
