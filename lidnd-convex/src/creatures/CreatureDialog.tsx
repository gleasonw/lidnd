import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ImageField, ImageValue } from "@/components/ImageField";
import { SegmentedControl } from "@/components/SegmentedControl";
import { toastError } from "@/lib/errors";
import { challengeLabel, formatChallenge, parseChallenge } from "@/lib/systems";
import { imageFromClipboard, useUploadImage } from "@/lib/upload";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";

export type CreatureWithUrls = Doc<"creatures"> & {
  iconUrl: string | null;
  statBlockUrl: string | null;
};

type Props = {
  campaign: Doc<"campaigns">;
  /** Which kind of creature to create; ignored when editing. */
  role: "hero" | "adversary";
  creature?: CreatureWithUrls;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (creatureId: Id<"creatures">) => void;
  initialName?: string;
};

export function CreatureDialog(props: Props) {
  const isHero = props.creature
    ? props.creature.kind === "hero"
    : props.role === "hero";
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        className={isHero ? "sm:max-w-md" : "max-h-[95vh] sm:max-w-4xl"}
      >
        <DialogHeader>
          <DialogTitle>
            {props.creature
              ? `Edit ${props.creature.name}`
              : isHero
                ? "New hero"
                : "New adversary"}
          </DialogTitle>
        </DialogHeader>
        {props.open && <CreatureForm {...props} isHero={isHero} />}
      </DialogContent>
    </Dialog>
  );
}

function CreatureForm({
  campaign,
  creature,
  onOpenChange,
  onSaved,
  isHero,
  initialName,
}: Props & { isHero: boolean }) {
  const create = useMutation(api.creatures.create);
  const update = useMutation(api.creatures.update);
  const upload = useUploadImage();
  const system = campaign.system;

  const [name, setName] = useState(creature?.name ?? initialName ?? "");
  const [kind, setKind] = useState<"standard" | "minion">(
    creature?.kind === "minion" ? "minion" : "standard",
  );
  const [challenge, setChallenge] = useState(
    creature && !isHero ? formatChallenge(system, creature.challenge) : "",
  );
  const [maxHp, setMaxHp] = useState(
    creature && !isHero ? String(creature.maxHp) : "",
  );
  const [campaignOnly, setCampaignOnly] = useState(
    creature ? creature.campaignId !== undefined && !isHero : false,
  );
  const [icon, setIcon] = useState<ImageValue>({ url: creature?.iconUrl });
  const [statBlock, setStatBlock] = useState<ImageValue>({
    url: creature?.statBlockUrl,
  });
  const [pending, setPending] = useState(false);
  const needsStatBlock = !isHero && !statBlock.file && !statBlock.url;

  const save = async () => {
    const parsedChallenge = isHero ? 0 : parseChallenge(challenge);
    const parsedHp = isHero ? 0 : Number(maxHp);
    if (!isHero && Number.isNaN(parsedChallenge)) {
      throw new ConvexError(`Enter the ${challengeLabel(system)}`);
    }
    // Keep existing images unless replaced (new file) or removed (no url).
    const resolve = async (
      value: ImageValue,
      existing: Id<"_storage"> | undefined,
    ) =>
      value.file ? await upload(value.file) : value.url ? existing : undefined;
    const fields = {
      name,
      challenge: parsedChallenge,
      maxHp: parsedHp,
      campaignOnly,
      iconId: await resolve(icon, creature?.iconId),
      statBlockId: isHero
        ? undefined
        : await resolve(statBlock, creature?.statBlockId),
    };
    if (creature) {
      await update({
        creatureId: creature._id,
        campaignId: campaign._id,
        ...fields,
      });
      return creature._id;
    }
    return await create({
      campaignId: campaign._id,
      kind: isHero ? "hero" : kind,
      ...fields,
    });
  };

  const fieldsColumn = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="creature-name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="creature-name"
          autoFocus
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      {!isHero && (
        <>
          {!creature && (
            <div className="flex flex-col gap-1.5">
              <span id="creature-kind" className="text-sm font-medium">
                Type
              </span>
              <SegmentedControl
                name="kind"
                aria-labelledby="creature-kind"
                value={kind}
                options={[
                  { value: "standard", label: "Standard" },
                  ...(system === "drawSteel"
                    ? [{ value: "minion" as const, label: "Minion" }]
                    : []),
                ]}
                onChange={setKind}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="creature-challenge"
                className="text-sm font-medium"
              >
                {kind === "minion"
                  ? "EV per 4 minions"
                  : challengeLabel(system)}
              </label>
              <Input
                id="creature-challenge"
                inputMode="decimal"
                required
                placeholder={system === "dnd5e" ? "e.g. 1/4" : undefined}
                value={challenge}
                onChange={(e) => setChallenge(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="creature-hp" className="text-sm font-medium">
                {kind === "minion" ? "HP per minion" : "Max HP"}
              </label>
              <Input
                id="creature-hp"
                type="number"
                min={1}
                required
                value={maxHp}
                onChange={(e) => setMaxHp(e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={campaignOnly}
              onCheckedChange={(checked) => setCampaignOnly(checked === true)}
              className="mt-0.5"
            />
            <span>
              Only use in this campaign
              <span className="block text-xs text-muted-foreground">
                Otherwise it's available in all your{" "}
                {system === "drawSteel" ? "Draw Steel" : "5e"} campaigns.
              </span>
            </span>
          </label>
        </>
      )}
      <ImageField
        label="Icon"
        value={icon}
        onChange={setIcon}
        className="h-28"
      />
    </div>
  );

  return (
    <form
      className="flex min-h-0 flex-col gap-4"
      onPaste={(e) => {
        if (isHero) return;
        const file = imageFromClipboard(e);
        if (file) {
          e.preventDefault();
          setStatBlock({ file });
        }
      }}
      onSubmit={(e) => {
        e.preventDefault();
        setPending(true);
        save()
          .then((id) => {
            onOpenChange(false);
            onSaved?.(id);
          })
          .catch((error) => {
            toastError(error);
            setPending(false);
          });
      }}
    >
      {isHero ? (
        fieldsColumn
      ) : (
        <div className="grid min-h-0 grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6">
          <ImageField
            label="Stat block (required)"
            value={statBlock}
            onChange={setStatBlock}
            className="h-[min(70vh,640px)]"
            hint="or paste it (Ctrl+V) — it stays visible while you fill in the values"
          />
          {fieldsColumn}
        </div>
      )}
      <DialogFooter>
        {needsStatBlock && (
          <p className="mr-auto self-center text-xs text-muted-foreground">
            Add a stat block to save.
          </p>
        )}
        <Button
          type="submit"
          disabled={pending || name.trim() === "" || needsStatBlock}
        >
          {pending
            ? "Saving…"
            : creature
              ? "Save"
              : isHero
                ? "Add hero"
                : "Add adversary"}
        </Button>
      </DialogFooter>
    </form>
  );
}
