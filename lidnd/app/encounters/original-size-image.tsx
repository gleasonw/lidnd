"use client";

import React, { useRef } from "react";
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
  const imgRef = useRef(null);
  const [width, setWidth] = React.useState<number | undefined>(undefined);

  const handleImageLoad = () => {
    const width = imgRef.current?.naturalWidth;
    setWidth(width);
  };

  const widthClass = width ? `max-w-[${width}px]` : "";
  return (
    <img
      src={src}
      alt={alt}
      style={{ maxWidth: width ? `${width}px` : "100%" }}
      ref={imgRef}
      onLoad={handleImageLoad}
    />
  );
}
