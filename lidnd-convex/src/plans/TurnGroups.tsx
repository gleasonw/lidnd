import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineText } from "@/components/InlineText";
import { toastError } from "@/lib/errors";
import { Cross2Icon } from "@radix-ui/react-icons";
import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import * as drawSteel from "../../rules/drawSteel";
import { TurnGroupColorPicker } from "./TurnGroupColor";
import { PlanData, PlanParticipant } from "./types";

const groupEV = (members: PlanParticipant[]) =>
  drawSteel.groupEV(
    members.map((m) => ({
      kind: m.creature.kind,
      side: m.side,
      ev: m.creature.challenge,
      minionCount: m.minionCount,
      creatureId: m.creatureId,
    })),
  );

export function TurnGroups({ data }: { data: PlanData }) {
  const add = useMutation(api.plans.addTurnGroup);
  const rename = useMutation(api.plans.renameTurnGroup);
  const remove = useMutation(api.plans.removeTurnGroup);
  const setColor = useMutation(api.plans.setTurnGroupColor);
  const heroes = data.participants.filter((p) => p.creature.kind === "hero");
  const perHero =
    heroes.length > 0 ? drawSteel.evPerHero(data.campaign.partyLevel) : null;
  const [name, setName] = useState("");

  return (
    <section aria-labelledby="groups-heading" className="flex flex-col gap-2">
      <h3 id="groups-heading" className="text-sm font-semibold">
        Initiative groups
      </h3>
      <p className="text-xs text-muted-foreground">
        Adversaries in a group act on the same turn and share one acted marker.
        Aim for one to two heroes&apos; worth of EV per group
        {perHero !== null
          ? ` (${perHero}–${perHero * 2} EV at level ${data.campaign.partyLevel})`
          : ""}
        .
      </p>
      {data.turnGroups.length > 0 && (
        <ul className="flex flex-col gap-1">
          {data.turnGroups.map((g) => {
            const members = data.participants.filter(
              (p) => p.turnGroupId === g._id,
            );
            return (
              <li key={g._id} className="flex items-center gap-2 text-sm">
                <TurnGroupColorPicker
                  name={g.name}
                  color={g.color}
                  onChange={(color) =>
                    void setColor({ groupId: g._id, color }).catch(toastError)
                  }
                />
                <InlineText
                  value={g.name}
                  label="Initiative group name"
                  className="font-medium"
                  onSave={(name) =>
                    void rename({ groupId: g._id, name }).catch(toastError)
                  }
                />
                <span className="truncate text-xs text-muted-foreground">
                  {members.length === 0
                    ? "Empty — assign adversaries in the roster"
                    : members.map((m) => m.creature.name).join(", ")}
                </span>
                <span
                  className="ml-auto shrink-0 text-xs tabular-nums"
                  title="Group EV compared with one to two heroes' EV"
                >
                  {groupEV(members)}
                  {perHero !== null && (
                    <span className="text-muted-foreground">
                      {" "}
                      / {perHero}–{perHero * 2} EV
                    </span>
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground"
                  aria-label={`Delete initiative group ${g.name}`}
                  onClick={() =>
                    void remove({ groupId: g._id }).catch(toastError)
                  }
                >
                  <Cross2Icon />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add({ planId: data.plan._id, name })
            .then(() => setName(""))
            .catch(toastError);
        }}
      >
        <Input
          aria-label="New initiative group name"
          placeholder={`Group ${String.fromCharCode(65 + data.turnGroups.length)}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8"
        />
        <Button
          size="sm"
          variant="outline"
          type="submit"
          disabled={name.trim() === ""}
        >
          Add group
        </Button>
      </form>
    </section>
  );
}
