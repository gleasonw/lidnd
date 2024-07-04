import { getAWSimageURL } from "@/app/[username]/[campaign_slug]/encounter/utils";

export function CharacterIcon({
  id,
  name,
  className,
}: {
  id: string;
  name: string;
  className?: string;
}) {
  return (
    <img src={getAWSimageURL(id, "icon")} alt={name} className={className} />
  );
}
