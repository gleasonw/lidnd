import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatChallenge, challengeLabel } from "@/lib/systems";
import { cn } from "@/lib/utils";
import { PlusIcon } from "@radix-ui/react-icons";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { CreatureAvatar } from "./CreatureAvatar";
import { CreatureDialog } from "./CreatureDialog";

/**
 * Search the campaign's adversaries and pick one. Arrow keys move, Enter
 * picks. "New adversary…" creates one and picks it.
 */
export function AdversaryPicker({
  campaign,
  onPick,
  label = "Add adversary",
}: {
  campaign: Doc<"campaigns">;
  onPick: (creatureId: Id<"creatures">) => void;
  label?: string;
}) {
  const creatures = useQuery(api.creatures.listForCampaign, {
    campaignId: campaign._id,
  });
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState(false);
  const matches = (creatures?.adversaries ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const pick = (id: Id<"creatures">) => {
    onPick(id);
    setOpen(false);
    setSearch("");
  };

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          setActive(0);
        }}
      >
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline">
            <PlusIcon /> {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <input
            autoFocus
            aria-label="Search adversaries"
            placeholder="Search adversaries…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, matches.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (matches[active]) pick(matches[active]._id);
                else if (search.trim()) {
                  setOpen(false);
                  setCreating(true);
                }
              }
            }}
            className="w-full border-b bg-transparent px-3 py-2 text-sm outline-none"
          />
          <ul
            role="listbox"
            aria-label="Adversaries"
            className="max-h-72 overflow-auto py-1"
          >
            {matches.map((c, i) => (
              <li
                key={c._id}
                role="option"
                aria-selected={i === active}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm",
                  i === active && "bg-accent",
                )}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(c._id);
                }}
              >
                <CreatureAvatar
                  name={c.name}
                  iconUrl={c.iconUrl}
                  className="h-6 w-6"
                />
                <span className="flex-1">{c.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {c.kind === "minion" ? "Minion · " : ""}
                  {challengeLabel(campaign.system)}{" "}
                  {formatChallenge(campaign.system, c.challenge)}
                </span>
              </li>
            ))}
            {creatures && matches.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                No matches.
              </li>
            )}
          </ul>
          <button
            type="button"
            className="w-full border-t px-3 py-2 text-left text-sm hover:bg-accent"
            onClick={() => {
              setOpen(false);
              setCreating(true);
            }}
          >
            New adversary{search.trim() ? ` “${search.trim()}”` : ""}…
          </button>
        </PopoverContent>
      </Popover>
      <CreatureDialog
        campaign={campaign}
        role="adversary"
        open={creating}
        initialName={search.trim()}
        onOpenChange={setCreating}
        onSaved={(id) => {
          setSearch("");
          onPick(id);
        }}
      />
    </>
  );
}
