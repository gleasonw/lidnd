import { cn } from "@/lib/utils";

export function CreatureAvatar({
  name,
  iconUrl,
  className,
}: {
  name: string;
  iconUrl: string | null;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium text-muted-foreground",
        className,
      )}
      aria-hidden
    >
      {iconUrl ? (
        <img src={iconUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}
