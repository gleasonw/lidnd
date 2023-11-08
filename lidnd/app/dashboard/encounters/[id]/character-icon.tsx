import { getAWSimageURL } from "@/app/dashboard/encounters/utils";
import Image from "next/image";

export function CharacterIcon({
  id,
  name,
  className,
  width,
  height,
}: {
  id: string;
  name: string;
  className?: string;
  width?: number;
  height?: number;
}) {
  return (
    <Image
      src={getAWSimageURL(id, "icon")}
      alt={name}
      width={width ?? 100}
      height={height ?? 100}
      className={className}
    />
  );
}
