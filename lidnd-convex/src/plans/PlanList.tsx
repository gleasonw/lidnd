import { LoadingState } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCampaign } from "@/campaigns/useCampaign";
import { toastError } from "@/lib/errors";
import { formatDate } from "@/lib/time";
import { cn } from "@/lib/utils";
import { PlusIcon } from "@radix-ui/react-icons";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export function PlanList() {
  const campaign = useCampaign();
  const [search, setSearch] = useState("");
  const [tagIds, setTagIds] = useState<Id<"tags">[]>([]);
  const plans = useQuery(api.plans.list, {
    campaignId: campaign._id,
    search,
    tagIds,
  });
  const tags = useQuery(api.plans.listTags, { campaignId: campaign._id });
  const filtering = search.trim() !== "" || tagIds.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">Encounters</h2>
        <Input
          aria-label="Search encounters by name"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-56"
        />
        <NewPlanForm />
      </div>
      {tags && tags.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Filter by tag"
        >
          <span className="text-xs text-muted-foreground">Tags:</span>
          {tags.map((tag) => {
            const selected = tagIds.includes(tag._id);
            return (
              <button
                key={tag._id}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  setTagIds((ids) =>
                    selected
                      ? ids.filter((id) => id !== tag._id)
                      : [...ids, tag._id],
                  )
                }
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-accent",
                )}
              >
                {selected && "✓ "}
                {tag.name}
              </button>
            );
          })}
          {tagIds.length > 0 && (
            <Button
              variant="link"
              size="sm"
              className="h-6 px-1"
              onClick={() => setTagIds([])}
            >
              Clear
            </Button>
          )}
        </div>
      )}
      {plans === undefined ? (
        <LoadingState />
      ) : plans.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          {filtering
            ? "No encounters match."
            : "No encounters yet. Name one above to start preparing it."}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {plans.map((plan) => (
            <li key={plan._id}>
              <Link
                to={`plans/${plan._id}`}
                className="flex items-center gap-3 px-3 py-2 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              >
                <span className="font-medium">{plan.name}</span>
                <span className="flex flex-wrap gap-1">
                  {plan.tags.map((tag) => (
                    <span
                      key={tag._id}
                      className="rounded-full border px-2 text-xs text-muted-foreground"
                    >
                      {tag.name}
                    </span>
                  ))}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {plan.runCount === 0
                    ? "Not run yet"
                    : `Run ${plan.runCount}× · last ${formatDate(plan.lastRunAt)}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewPlanForm() {
  const campaign = useCampaign();
  const create = useMutation(api.plans.create);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  return (
    <form
      className="ml-auto flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        create({ campaignId: campaign._id, name })
          .then((planId) => navigate(`plans/${planId}`))
          .catch(toastError);
      }}
    >
      <Input
        aria-label="New encounter name"
        placeholder="New encounter name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-8 w-56"
      />
      <Button size="sm" type="submit" disabled={name.trim() === ""}>
        <PlusIcon /> Create
      </Button>
    </form>
  );
}
