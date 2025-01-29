"use client";
import { useUIStore } from "@/app/UIStore";
import type { Creature } from "@/server/api/router";
import { CreatureUtils } from "@/utils/creatures";
import { observer } from "mobx-react-lite";
import Image from "next/image";
import type React from "react";

export const CreatureStatBlock = observer(
  function CreatureStatBlock({
    creature,
    ref,
  }: {
    creature: Creature;
    ref: React.ForwardedRef<HTMLImageElement>;
  }) {
    const uiStore = useUIStore();
    const status = uiStore.getStatBlockUploadStatus(creature);

    const statblock = (
      <div>
        {status}
        <Image
          quality={100}
          style={{ objectFit: "contain" }}
          className="max-h-full w-full max-w-fit"
          src={CreatureUtils.awsURL(creature, "statBlock")}
          alt={creature.name}
          width={creature.stat_block_width}
          height={creature.stat_block_height}
          onError={() => console.log("error loading image")}
          ref={ref}
        />
      </div>
    );
    switch (status) {
      case "idle":
        return statblock;
      case "pending":
        return <div>pending</div>;
      case "success":
        return statblock;
      case "error":
        return <div>error</div>;
      case undefined:
        return statblock;
      default: {
        //@ts-expect-error - exhaustive check
        const _: never = status;
        throw new Error(`Unhandled case: ${status}`);
      }
    }
  },
  { forwardRef: true },
);
