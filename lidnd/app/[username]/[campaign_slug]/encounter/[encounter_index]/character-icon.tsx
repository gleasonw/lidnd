import { getAWSimageURL } from "@/app/[username]/[campaign_slug]/encounter/utils";
import clsx from "clsx";

export function CharacterIcon({
  id,
  name,
  className,
  size = "medium",
}: {
  id: string;
  name: string;
  className?: string;
  size?: "small" | "medium" | "stat_block" | "none";
}) {
  return (
    <span
      className={clsx({
        "w-10 h-10": size === "small",
        "w-32 h-32": size === "medium",
        "w-full h-32": size === "stat_block",
        "": size === "none",
      })}
    >
      <img
        src={getAWSimageURL(id, "icon")}
        alt={name}
        className={clsx(className, "object-cover")}
      />
    </span>
  );
}
