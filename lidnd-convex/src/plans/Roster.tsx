import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Stepper } from "@/components/Stepper";
import { AdversaryPicker } from "@/creatures/AdversaryPicker";
import { CreatureAvatar } from "@/creatures/CreatureAvatar";
import { CreatureDialog, CreatureWithUrls } from "@/creatures/CreatureDialog";
import { StatBlockSlot } from "@/creatures/StatBlockSlot";
import { toastError } from "@/lib/errors";
import { challengeLabel, formatChallenge } from "@/lib/systems";
import { Cross2Icon, PlusIcon } from "@radix-ui/react-icons";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import * as drawSteel from "../../rules/drawSteel";
import { TurnGroupDot } from "./TurnGroupColor";
import { PlanData, PlanParticipant } from "./types";

export function Roster({ data }: { data: PlanData }) {
  const { campaign, plan, participants } = data;
  const creatures = useQuery(api.creatures.listForCampaign, {
    campaignId: campaign._id,
  });
  const add = useMutation(api.plans.addParticipant);
  const remove = useMutation(api.plans.removeParticipant);
  const [editing, setEditing] = useState<CreatureWithUrls | null>(null);

  const heroes = participants.filter((p) => p.creature.kind === "hero");
  const others = participants.filter((p) => p.creature.kind !== "hero");
  const missingHeroes = (creatures?.heroes ?? []).filter(
    (h) => !heroes.some((p) => p.creatureId === h._id),
  );

  return (
    <section aria-labelledby="roster-heading" className="flex flex-col gap-3">
      <h3 id="roster-heading" className="text-sm font-semibold">
        Roster
      </h3>
      <div>
        <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Heroes ({heroes.length})
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {heroes.map((p) => (
            <span
              key={p._id}
              className="inline-flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-1 text-sm"
            >
              <CreatureAvatar
                name={p.creature.name}
                iconUrl={p.creature.iconUrl}
                className="h-6 w-6"
              />
              {p.creature.name}
              <button
                type="button"
                aria-label={`Remove ${p.creature.name} from this encounter`}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() =>
                  void remove({ participantId: p._id }).catch(toastError)
                }
              >
                <Cross2Icon />
              </button>
            </span>
          ))}
          {missingHeroes.map((h) => (
            <Button
              key={h._id}
              variant="ghost"
              size="sm"
              className="h-7 rounded-full border border-dashed text-muted-foreground"
              onClick={() =>
                void add({ planId: plan._id, creatureId: h._id }).catch(
                  toastError,
                )
              }
            >
              <PlusIcon /> {h.name}
            </Button>
          ))}
          {heroes.length === 0 && missingHeroes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No heroes in the party yet. Add them on the Party tab.
            </p>
          )}
        </div>
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Adversaries and allies ({others.length})
          </h4>
          <AdversaryPicker
            campaign={campaign}
            onPick={(creatureId) =>
              void add({ planId: plan._id, creatureId }).catch(toastError)
            }
          />
        </div>
        {others.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            Add adversaries to build the encounter.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {others.map((p) => (
              <RosterRow
                key={p._id}
                data={data}
                participant={p}
                onEditCreature={() => setEditing(p.creature)}
              />
            ))}
          </ul>
        )}
      </div>
      <CreatureDialog
        campaign={campaign}
        role="adversary"
        creature={editing ?? undefined}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </section>
  );
}

function RosterRow({
  data,
  participant: p,
  onEditCreature,
}: {
  data: PlanData;
  participant: PlanParticipant;
  onEditCreature: () => void;
}) {
  const { campaign, turnGroups, plan } = data;
  const update = useMutation(api.plans.updateParticipant);
  const add = useMutation(api.plans.addParticipant);
  const remove = useMutation(api.plans.removeParticipant);
  const setImage = useMutation(api.creatures.setImage);
  const isMinion = p.creature.kind === "minion";
  const name = p.creature.name;

  const showGroups = campaign.system === "drawSteel" && turnGroups.length > 0;

  return (
    <li className="flex flex-col gap-1 px-2 py-1.5 text-sm">
      <div className="flex items-center gap-2">
        <CreatureAvatar
          name={name}
          iconUrl={p.creature.iconUrl}
          className="h-7 w-7"
        />
        <button
          type="button"
          className="min-w-0 flex-1 truncate text-left font-medium hover:underline"
          title={`Edit ${name}`}
          onClick={onEditCreature}
        >
          {name}
        </button>
        <StatBlockSlot
          name={name}
          url={p.creature.statBlockUrl}
          onAttach={(storageId) =>
            setImage({ creatureId: p.creatureId, kind: "statBlock", storageId })
          }
        />
        <span className="text-xs text-muted-foreground tabular-nums">
          {challengeLabel(campaign.system)}{" "}
          {formatChallenge(campaign.system, p.creature.challenge)}
          {isMinion && " per 4"}
        </span>
        <button
          type="button"
          className="rounded border px-1.5 text-xs hover:bg-accent"
          title="Switch between enemy and ally"
          onClick={() =>
            void update({
              participantId: p._id,
              side: p.side === "enemy" ? "ally" : "enemy",
            }).catch(toastError)
          }
        >
          {p.side === "enemy" ? "Enemy" : "Ally"}
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label={`Add another ${name}`}
          title="Add another"
          onClick={() =>
            void add({
              planId: plan._id,
              creatureId: p.creatureId,
              side: p.side,
            }).catch(toastError)
          }
        >
          <PlusIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          aria-label={`Remove ${name}`}
          title="Remove"
          onClick={() =>
            void remove({ participantId: p._id }).catch(toastError)
          }
        >
          <Cross2Icon />
        </Button>
      </div>
      {(isMinion || showGroups) && (
        <div className="flex flex-wrap items-center gap-3 pl-9">
          {isMinion && (
            <span className="flex items-center gap-1.5">
              <Stepper
                size="sm"
                value={p.minionCount ?? 4}
                min={1}
                max={drawSteel.MAX_SQUAD_SIZE}
                label={`${name} minion count`}
                onChange={(minionCount) =>
                  void update({ participantId: p._id, minionCount }).catch(
                    toastError,
                  )
                }
              />
              <span className="text-xs text-muted-foreground">
                minions (squads hold up to {drawSteel.MAX_SQUAD_SIZE})
              </span>
            </span>
          )}
          {showGroups && (
            <Select
              value={p.turnGroupId ?? "none"}
              onValueChange={(value) =>
                void update({
                  participantId: p._id,
                  turnGroupId:
                    value === "none"
                      ? null
                      : (value as (typeof turnGroups)[number]["_id"]),
                }).catch(toastError)
              }
            >
              <SelectTrigger
                className="h-7 w-36 text-xs"
                aria-label={`${name} initiative group`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Acts alone</SelectItem>
                {turnGroups.map((g) => (
                  <SelectItem key={g._id} value={g._id}>
                    <span className="flex items-center gap-1.5">
                      <TurnGroupDot color={g.color} />
                      Group: {g.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </li>
  );
}
