import { LoadingState } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { useCampaign } from "@/campaigns/useCampaign";
import { PlusIcon } from "@radix-ui/react-icons";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { CreatureAvatar } from "./CreatureAvatar";
import { CreatureDialog, CreatureWithUrls } from "./CreatureDialog";
import { DeleteCreatureDialog } from "./DeleteCreatureDialog";

export function PartyPage() {
  const campaign = useCampaign();
  const creatures = useQuery(api.creatures.listForCampaign, {
    campaignId: campaign._id,
  });
  const [editing, setEditing] = useState<CreatureWithUrls | "new" | null>(null);
  const [deleting, setDeleting] = useState<Doc<"creatures"> | null>(null);

  return (
    <div className="max-w-2xl">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Party</h2>
          <p className="text-sm text-muted-foreground">
            {creatures
              ? `${creatures.heroes.length} hero${creatures.heroes.length === 1 ? "" : "es"} · level ${campaign.partyLevel}. `
              : ""}
          </p>
        </div>
        <Button size="sm" onClick={() => setEditing("new")}>
          <PlusIcon /> Add hero
        </Button>
      </div>
      {creatures === undefined ? (
        <LoadingState />
      ) : creatures.heroes.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No heroes yet. Add the player characters so encounters can count them
          for difficulty{campaign.system === "drawSteel" ? " and malice" : ""}.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {creatures.heroes.map((hero) => (
            <li key={hero._id} className="flex items-center gap-3 px-3 py-2">
              <CreatureAvatar name={hero.name} iconUrl={hero.iconUrl} />
              <span className="flex-1 font-medium">{hero.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(hero)}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setDeleting(hero)}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
      <CreatureDialog
        campaign={campaign}
        role="hero"
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
