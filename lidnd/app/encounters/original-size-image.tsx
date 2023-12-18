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
  return <img src={src} alt={alt} />;
}
