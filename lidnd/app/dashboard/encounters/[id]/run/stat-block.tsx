"use client";

import React from "react";
import Image from "next/image";
import { getAWSimageURL } from "@/app/dashboard/encounters/utils";

export function StatBlock({ id, name }: { id: string; name: string }) {
  // some strange infinite render behavior can occur if the width and height is not
  // extremely large. I don't much understand Next Image, but this seems to work.
  const [width, setWidth] = React.useState(1000);
  const [height, setHeight] = React.useState(1000);
  return (
    <div className="relative w-full flex justify-center">
      <Image
        src={getAWSimageURL(id, "stat_block")}
        alt={"stat block for " + name}
        onLoadingComplete={({ naturalHeight, naturalWidth }) => {
          setWidth(naturalWidth);
          setHeight(naturalHeight);
        }}
        width={width}
        height={height}
        className={`transition-opacity ${
          width === 1000 && height === 1000 ? "opacity-0" : "opcaity-100"
        }`}
      />
    </div>
  );
}