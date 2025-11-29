"use client";
import { useUIStore } from "@/app/UIStore";
import type { Creature } from "@/server/api/router";
import { CreatureUtils } from "@/utils/creatures";
import { observer } from "mobx-react-lite";
import Image from "next/image";
import type React from "react";
import { useMemo } from "react";

export const CreatureStatBlock = observer(function CreatureStatBlock({
  creature,
  ref,
}: {
  creature: Creature;
  ref?: React.ForwardedRef<HTMLImageElement>;
}) {
  const uiStore = useUIStore();
  const status = uiStore.getStatBlockUploadStatus(creature);

  switch (status) {
    case "idle":
      return <CreatureStatBlockImage creature={creature} ref={ref} />;
    case "pending":
      return <div>pending</div>;
    case "success":
      return <CreatureStatBlockImage creature={creature} ref={ref} />;
    case "error":
      return <div>error</div>;
    case undefined:
      return <CreatureStatBlockImage creature={creature} ref={ref} />;
    default: {
      //@ts-expect-error - exhaustive check
      const _: never = status;
      throw new Error(`Unhandled case: ${status}`);
    }
  }
});

function CreatureStatBlockImage({
  creature,
  ref,
}: {
  creature: Creature;
  ref?: React.ForwardedRef<HTMLImageElement>;
}) {
  const style = useMemo(
    () =>
      ({
        objectFit: "contain",
        width: creature.stat_block_width,
      } as const),
    [creature.stat_block_width]
  );
  return (
    <Image
      priority
      quality={100}
      style={style}
      className="max-h-full w-full object-top"
      src={CreatureUtils.awsURL(creature, "statBlock")}
      alt={creature.name}
      width={creature.stat_block_width}
      height={creature.stat_block_height}
      ref={ref}
    />
  );
}
