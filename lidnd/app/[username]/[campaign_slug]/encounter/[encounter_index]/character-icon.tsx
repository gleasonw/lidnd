import { getAWSimageURL } from "@/app/[username]/[campaign_slug]/encounter/utils";

export function CharacterIcon({
  id,
  name,
  className,
}: {
  id: string;
  name: string;
  className?: string;
  width?: number;
  height?: number;
}) {
  return (
    <img src={getAWSimageURL(id, "icon")} alt={name} className={className} />
  );
}
