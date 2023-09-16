import { getGoogleDriveImageLink } from "@/app/encounters/utils";
import Image from "next/image";

export function CharacterIcon({
  icon,
  name,
  className,
}: {
  icon: string;
  name: string;
  className?: string;
}) {
  return (
    <Image
      src={getGoogleDriveImageLink(icon)}
      alt={name}
      width={80}
      height={80}
    />
  );
}
