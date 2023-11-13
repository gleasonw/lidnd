"use client";

import React from "react";
import Image from "next/image";
import clsx from "clsx";

export interface OriginalSizeImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function OriginalSizeImage({
  src,
  alt,
  className,
}: OriginalSizeImageProps) {
  // some strange infinite render behavior can occur if the width and height is not
  // extremely large. I don't much understand Next Image, but this seems to work.
  const [width, setWidth] = React.useState(1000);
  const [height, setHeight] = React.useState(1000);
  return (
    <Image
      src={src}
      alt={alt}
      onLoadingComplete={({ naturalHeight, naturalWidth }) => {
        setWidth(naturalWidth);
        setHeight(naturalHeight);
      }}
      width={width}
      height={height}
      className={clsx(className, "transition-opacity", {
        "opacity-0": width === 1000 && height === 1000,
        "opacity-100": width !== 1000 && height !== 1000,
      })}
    />
  );
}
