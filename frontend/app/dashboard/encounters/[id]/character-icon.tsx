import { getAWSimageURL } from "@/app/dashboard/encounters/utils";
import Image from "next/image";

export function CharacterIcon({
  id,
  name,
  className,
}: {
  id: number;
  name: string;
  className?: string;
}) {
  return (
    <Image
      src={getAWSimageURL(id, "icon")}
      alt={name}
      width={100}
      height={100}
      className={className}
      objectFit="cover"
    />
  );
}
