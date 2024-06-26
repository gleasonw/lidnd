"use client";

import React, { useRef } from "react";

export interface OriginalSizeImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function OriginalSizeImage({ src, alt }: OriginalSizeImageProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [width, setWidth] = React.useState<number | undefined>(undefined);

  const handleImageLoad = () => {
    const width = imgRef.current?.naturalWidth;
    setWidth(width);
  };

  React.useEffect(() => {
    const updateWidth = () => {
      // If window size is smaller than image size, update width
      if (imgRef.current && window.innerWidth < imgRef.current.naturalWidth) {
        setWidth(window.innerWidth);
      } else {
        setWidth(imgRef.current?.naturalWidth);
      }
    };

    window.addEventListener("resize", updateWidth);

    updateWidth();

    return () => {
      window.removeEventListener("resize", updateWidth);
    };
  }, [imgRef]);

  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-auto"
      style={{ maxWidth: width ? `${width}px` : "100%" }}
      ref={imgRef}
      onLoad={handleImageLoad}
    />
  );
}
