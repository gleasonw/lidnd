import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreatureAvatar } from "@/creatures/CreatureAvatar";
import { StatBlockSlot } from "@/creatures/StatBlockSlot";
import { toastError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { CheckIcon, Cross2Icon, DotsVerticalIcon } from "@radix-ui/react-icons";
import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { EffectPopover } from "./EffectPopover";
import {
  useDamage,
  useGainTempHp,
  useHeal,
  useRemoveEffect,
  useSetHealth,
  useSetInitiative,
  useToggleActed,
} from "./useRunMutations";
import { RunData, RunParticipant } from "./types";

const numberInput =
  "h-7 rounded-md border border-input bg-transparent px-2 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none";

export function ParticipantRow({
  data,
  participant: p,
  readOnly,
  showActed,
  quietActed,
  isCurrent,
  onSelect,
  selected,
}: {
  data: RunData;
  participant: RunParticipant;
  readOnly: boolean;
  /** Draw Steel participants not in an initiative group have their own marker. */
  showActed: boolean;
  /** Mute the Ready button when this participant's side isn't up. */
  quietActed?: boolean;
  isCurrent: boolean;
  onSelect: () => void;
  selected: boolean;
}) {
  const system = data.campaign.system;
  const toggleActed = useToggleActed();
  const setInitiative = useSetInitiative();
  const setStatBlock = useMutation(api.runs.setStatBlock);
  const isHero = p.kind === "hero";

  return (
    <li
      className={cn(
        "flex flex-col gap-1 border-l-4 px-2 py-1.5",
        isCurrent ? "border-l-primary bg-accent" : "border-l-transparent",
        p.defeated && "opacity-60",
        selected && !isCurrent && "bg-accent/50",
      )}
      aria-current={isCurrent ? "step" : undefined}
    >
      <div className="flex items-center gap-2">
        {system === "drawSteel" && showActed && (
          <ActedButton
            quiet={quietActed}
            acted={p.acted}
            name={p.name}
            disabled={readOnly}
            onClick={() =>
              void toggleActed({ participantId: p._id }).catch(toastError)
            }
          />
        )}
        {system === "dnd5e" && (
          <input
            type="number"
            aria-label={`${p.name} initiative`}
            title="Initiative"
            defaultValue={p.initiative}
            key={p.initiative}
            disabled={readOnly}
            onBlur={(e) => {
              const value = Number(e.target.value);
              if (e.target.value !== "" && value !== p.initiative) {
                setInitiative({
                  participantId: p._id,
                  initiative: value,
                }).catch(toastError);
              }
            }}
            data-initiative
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              // Enter saves (on blur) and moves to the next initiative box.
              const boxes = Array.from(
                document.querySelectorAll<HTMLInputElement>(
                  "input[data-initiative]",
                ),
              );
              const next = boxes[boxes.indexOf(e.currentTarget) + 1];
              if (next) next.focus();
              else e.currentTarget.blur();
            }}
            className={cn(numberInput, "w-11 text-center")}
          />
        )}
        <CreatureAvatar name={p.name} iconUrl={p.iconUrl} className="h-7 w-7" />
        <button
          type="button"
          onClick={onSelect}
          className="min-w-0 truncate text-left text-sm font-medium hover:underline"
          title={p.statBlockUrl ? "Show stat block" : undefined}
        >
          {p.name}
        </button>
        {!isHero && !p.statBlockUrl && !readOnly && (
          <StatBlockSlot
            name={p.name}
            url={null}
            onAttach={(storageId) =>
              setStatBlock({
                runId: data.run._id,
                creatureId: p.creatureId,
                storageId,
              })
            }
          />
        )}
        {isCurrent && (
          <span className="rounded bg-primary px-1.5 text-xs text-primary-foreground">
            Current turn
          </span>
        )}
        {p.side === "ally" && !isHero && (
          <span className="rounded border px-1.5 text-xs text-muted-foreground">
            Ally
          </span>
        )}
        {p.winded && (
          <span
            className="rounded border px-1.5 text-xs text-muted-foreground"
            title="At or below half Stamina"
          >
            Winded
          </span>
        )}
        {p.defeated && (
          <span className="rounded border px-1.5 text-xs text-muted-foreground">
            Defeated
          </span>
        )}
        {isHero && (
          <Effects
            participant={p}
            readOnly={readOnly}
            withSaveDc={system === "dnd5e"}
          />
        )}
        <span className="ml-auto" />
        {!isHero && <Health participant={p} readOnly={readOnly} />}
        {!readOnly && <ParticipantMenu data={data} participant={p} />}
      </div>
      {!isHero && (
        <div className="flex flex-wrap items-center gap-1.5 pl-1">
          {!readOnly && <HealthInput participant={p} />}
          <Effects
            participant={p}
            readOnly={readOnly}
            withSaveDc={system === "dnd5e"}
          />
        </div>
      )}
    </li>
  );
}

function Effects({
  participant: p,
  readOnly,
  withSaveDc,
}: {
  participant: RunParticipant;
  readOnly: boolean;
  withSaveDc: boolean;
}) {
  const removeEffect = useRemoveEffect();
  return (
    <>
      {p.effects.map((effect) => (
        <span
          key={effect._id}
          className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 text-xs"
        >
          <span className="font-medium">{effect.name}</span>
          {effect.duration && (
            <span className="text-muted-foreground">{effect.duration}</span>
          )}
          {effect.saveDc !== undefined && (
            <span className="text-muted-foreground">DC {effect.saveDc}</span>
          )}
          {!readOnly && (
            <button
              type="button"
              aria-label={`Remove ${effect.name} from ${p.name}`}
              className="rounded-full p-0.5 hover:bg-background"
              onClick={() =>
                void removeEffect({ effectId: effect._id }).catch(toastError)
              }
            >
              <Cross2Icon className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      {!readOnly && <EffectPopover participant={p} withSaveDc={withSaveDc} />}
    </>
  );
}

export function ActedButton({
  acted,
  name,
  disabled,
  quiet,
  onClick,
}: {
  acted: boolean;
  name: string;
  disabled?: boolean;
  /** Their side isn't up. Still clickable; the turn order is only a prompt. */
  quiet?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={acted}
      aria-label={`${name} has acted`}
      title={
        acted ? "Acted this round. Click to undo" : "Click when they've acted"
      }
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 w-[4.5rem] shrink-0 items-center justify-center gap-1 rounded-md border text-xs font-medium",
        acted
          ? "border-transparent bg-muted text-muted-foreground"
          : quiet
            ? "border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
            : "border-primary bg-background hover:bg-accent",
      )}
    >
      {acted ? (
        <>
          <CheckIcon /> Acted
        </>
      ) : (
        "Ready"
      )}
    </button>
  );
}

function Health({
  participant: p,
  readOnly,
}: {
  participant: RunParticipant;
  readOnly: boolean;
}) {
  const setHealth = useSetHealth();
  if (p.kind === "minion") {
    return (
      <span className="text-sm tabular-nums">
        <InlineNumber
          value={p.minionsAlive ?? 0}
          label={`${p.name} minions alive`}
          readOnly={readOnly}
          onSave={(minionCount) =>
            void setHealth({ participantId: p._id, minionCount }).catch(
              toastError,
            )
          }
        />
        <span className="text-muted-foreground">
          /{p.plannedMinionCount} minions · pool {p.hp}/
          {(p.plannedMinionCount ?? 0) * p.maxHp} ({p.maxHp} each)
        </span>
      </span>
    );
  }
  const pct = Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100));
  return (
    <span className="flex items-center gap-2">
      <span
        className="relative h-1.5 w-16 overflow-hidden rounded-full bg-muted"
        aria-hidden
      >
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-foreground/70"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="text-sm tabular-nums">
        <InlineNumber
          value={p.hp}
          label={`${p.name} HP`}
          readOnly={readOnly}
          onSave={(hp) =>
            void setHealth({ participantId: p._id, hp }).catch(toastError)
          }
        />
        <span className="text-muted-foreground">/{p.maxHp}</span>
        {p.tempHp > 0 && (
          <span className="ml-1 text-xs text-muted-foreground">
            +{p.tempHp} temp
          </span>
        )}
      </span>
    </span>
  );
}

/** A number you can click to correct. */
function InlineNumber({
  value,
  label,
  onSave,
  readOnly,
}: {
  value: number;
  label: string;
  onSave: (value: number) => void;
  readOnly: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  if (readOnly) return <span className="font-semibold">{value}</span>;
  if (draft === null) {
    return (
      <button
        type="button"
        className="rounded px-0.5 font-semibold hover:bg-accent"
        title="Click to set exactly"
        aria-label={`${label}: ${value}. Click to set`}
        onClick={() => setDraft(String(value))}
      >
        {value}
      </button>
    );
  }
  const commit = () => {
    const n = Number.parseInt(draft, 10);
    if (!Number.isNaN(n) && n !== value) onSave(n);
    setDraft(null);
  };
  return (
    <input
      autoFocus
      type="number"
      aria-label={label}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setDraft(null);
      }}
      className={cn(numberInput, "h-6 w-12 px-1")}
    />
  );
}

/**
 * Type an amount; Enter or Damage applies damage, Heal heals, Temp grants
 * temporary Stamina. For minion squads, damage comes off the shared pool; fill
 * in "in area" for area effects, which only hurt the minions in the area.
 */
function HealthInput({ participant: p }: { participant: RunParticipant }) {
  const damage = useDamage();
  const heal = useHeal();
  const gainTemp = useGainTempHp();
  const [amount, setAmount] = useState("");
  const [inArea, setInArea] = useState("");
  const value = Number.parseInt(amount, 10);
  const valid = !Number.isNaN(value) && value >= 0;
  const isMinion = p.kind === "minion";

  const applyDamage = () => {
    if (!valid) return;
    const area = Number.parseInt(inArea, 10);
    damage({
      participantId: p._id,
      amount: value,
      minionsInArea: isMinion && !Number.isNaN(area) ? area : undefined,
    }).catch(toastError);
    setAmount("");
    setInArea("");
  };

  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        applyDamage();
      }}
    >
      <input
        type="number"
        min={0}
        inputMode="numeric"
        aria-label={`Amount for ${p.name}`}
        placeholder="Amt"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className={cn(numberInput, "w-14")}
      />
      {isMinion && (
        <input
          type="number"
          min={0}
          inputMode="numeric"
          aria-label={`${p.name} minions in the area`}
          title="Area effects: how many of these minions are in the area. Leave blank for a single-target hit."
          placeholder="In area"
          value={inArea}
          onChange={(e) => setInArea(e.target.value)}
          className={cn(numberInput, "w-20")}
        />
      )}
      <Button
        type="submit"
        size="sm"
        variant="outline"
        className="h-7 px-2"
        disabled={!valid}
      >
        Damage
      </Button>
      {!isMinion && (
        <>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            disabled={!valid}
            onClick={() => {
              heal({ participantId: p._id, amount: value }).catch(toastError);
              setAmount("");
            }}
          >
            Heal
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            disabled={!valid}
            title="Gain temporary Stamina (keeps the greater of the current and new amount)"
            onClick={() => {
              gainTemp({ participantId: p._id, amount: value }).catch(
                toastError,
              );
              setAmount("");
            }}
          >
            Temp
          </Button>
        </>
      )}
    </form>
  );
}

function ParticipantMenu({
  data,
  participant: p,
}: {
  data: RunData;
  participant: RunParticipant;
}) {
  const remove = useMutation(api.runs.removeParticipant);
  const setCurrent = useMutation(api.runs.setCurrent);
  const canMakeCurrent = data.campaign.system === "dnd5e" && data.run.round > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label={`${p.name} actions`}
        >
          <DotsVerticalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canMakeCurrent && (
          <>
            <DropdownMenuItem
              onSelect={() =>
                void setCurrent({ participantId: p._id }).catch(toastError)
              }
            >
              Make current turn
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={() =>
            void remove({ participantId: p._id }).catch(toastError)
          }
        >
          Remove from this run
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
