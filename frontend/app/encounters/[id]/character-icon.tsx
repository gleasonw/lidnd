import { getAWSimageURL } from "@/app/encounters/utils";
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
      width={150}
      height={150}
    />
  );
}
