import { LoadingState } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCampaign } from "@/campaigns/useCampaign";
import { challengeLabel, formatChallenge } from "@/lib/systems";
import { PlusIcon } from "@radix-ui/react-icons";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { CreatureAvatar } from "./CreatureAvatar";
import { CreatureDialog, CreatureWithUrls } from "./CreatureDialog";
import { DeleteCreatureDialog } from "./DeleteCreatureDialog";
import { StatBlockSlot } from "./StatBlockSlot";

export function AdversariesPage() {
  const campaign = useCampaign();
  const creatures = useQuery(api.creatures.listForCampaign, {
    campaignId: campaign._id,
  });
  const setImage = useMutation(api.creatures.setImage);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<CreatureWithUrls | "new" | null>(null);
  const [deleting, setDeleting] = useState<Doc<"creatures"> | null>(null);
  const label = challengeLabel(campaign.system);
  const shown = creatures?.adversaries.filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">Adversaries</h2>
        <Input
          aria-label="Search adversaries"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-56"
        />
        <Button size="sm" className="ml-auto" onClick={() => setEditing("new")}>
          <PlusIcon /> New adversary
        </Button>
      </div>
      {shown === undefined ? (
        <LoadingState />
      ) : creatures?.adversaries.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No adversaries yet. Add one by entering its {label} and HP, with its
          stat block image alongside.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pl-3 font-medium">Name</th>
              <th className="py-2 font-medium">Type</th>
              <th className="py-2 text-right font-medium">{label}</th>
              <th className="py-2 text-right font-medium">HP</th>
              <th className="py-2 pl-6 font-medium">Scope</th>
              <th className="py-2 font-medium">Stat block</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y">
            {shown.map((c) => (
              <tr key={c._id}>
                <td className="py-1.5 pl-3">
                  <span className="flex items-center gap-2">
                    <CreatureAvatar
                      name={c.name}
                      iconUrl={c.iconUrl}
                      className="h-7 w-7"
                    />
                    <span className="font-medium">{c.name}</span>
                  </span>
                </td>
                <td className="text-muted-foreground">
                  {c.kind === "minion" ? "Minion" : "Standard"}
                </td>
                <td className="text-right tabular-nums">
                  {formatChallenge(campaign.system, c.challenge)}
                  {c.kind === "minion" && (
                    <span className="text-muted-foreground"> / 4</span>
                  )}
                </td>
                <td className="text-right tabular-nums">
                  {c.maxHp}
                  {c.kind === "minion" && (
                    <span className="text-muted-foreground"> each</span>
                  )}
                </td>
                <td className="pl-6 text-muted-foreground">
                  {c.campaignId ? "This campaign" : "All campaigns"}
                </td>
                <td className="py-1">
                  <StatBlockSlot
                    name={c.name}
                    url={c.statBlockUrl}
                    onAttach={(storageId) =>
                      setImage({
                        creatureId: c._id,
                        kind: "statBlock",
                        storageId,
                      })
                    }
                  />
                </td>
                <td className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(c)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => setDeleting(c)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <CreatureDialog
        campaign={campaign}
        role="adversary"
        creature={editing === "new" ? undefined : (editing ?? undefined)}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />
      <DeleteCreatureDialog
        creature={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      />
    </div>
  );
}
