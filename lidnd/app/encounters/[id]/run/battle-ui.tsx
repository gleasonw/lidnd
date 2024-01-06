"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  ChevronUp,
  ColumnsIcon,
  Dog,
  MoveHorizontal,
  Plus,
  StretchHorizontal,
  X,
} from "lucide-react";
import { ParticipantHealthForm } from "@/app/encounters/[id]/run/creature-health-form";
import { CharacterIcon } from "@/app/encounters/[id]/character-icon";
import {
  CustomCreature,
  ExistingCreature,
} from "@/app/encounters/[id]/creature-add-form";
import InitiativeInput from "@/app/encounters/[id]/InitiativeInput";
import React, { Suspense, experimental_useEffectEvent } from "react";
import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import clsx from "clsx";
import { api } from "@/trpc/react";
import { useEncounterId } from "@/app/encounters/hooks";
import { EncounterCreature } from "@/server/api/router";
import {
  useCreateCreatureInEncounter,
  useRemoveStatusEffect,
} from "@/app/encounters/[id]/hooks";
import { FadePresenceItem } from "@/components/ui/animate/FadePresenceItem";
import { BasePopover } from "@/app/encounters/base-popover";
import { StatusInput } from "./status-input";
import { effectIconMap } from "./effectIconMap";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ButtonWithTooltip, Tip } from "@/components/ui/tip";
import { LinearBattleUI } from "./linear-battle-ui";
import { GroupBattleUI } from "@/app/encounters/[id]/run/group-battle-ui";
import { EncounterTime } from "@/app/encounters/[id]/run/encounter-time";

export function BattleUILoader() {
  return (
    <AnimatePresence>
      <Suspense fallback={<div>Loading...</div>}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.1 } }}
        >
          <BattleUIHeader />
        </motion.div>
      </Suspense>
    </AnimatePresence>
  );
}

export function BattleUIHeader() {
  const id = useEncounterId();
  const { data: encounter } = api.encounterById.useQuery(id);

  const roundText =
    encounter?.current_round === 0
      ? "Surprise round"
      : `Round ${encounter?.current_round}`;

  return (
    <div className="flex gap-3 flex-col">
      <div className="flex gap-10 flex-wrap items-center justify-center">
        <h1 className="text-xl text-center">{roundText}</h1>
        <EncounterTime time={encounter?.started_at ?? undefined} />
        <InitiativeTypeToggle />
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus /> Add creature
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl overflow-auto max-h-screen">
            <BattleAddCreatureForm />
          </DialogContent>
        </Dialog>
      </div>

      {encounter?.initiative_type === "linear" ? (
        <LinearBattleUI />
      ) : (
        <GroupBattleUI />
      )}
    </div>
  );
}

export function InitiativeTypeToggle() {
  const id = useEncounterId();
  const { encounterById } = api.useUtils();
  const { data: encounter } = api.encounterById.useQuery(id);
  const { mutate: toggleInitiativeType } =
    api.updateEncounterInitiativeType.useMutation({
      onSettled: async () => {
        return await encounterById.invalidate(id);
      },
    });

  return (
    <div>
      <ButtonWithTooltip
        text="Linear initiative"
        variant={
          encounter?.initiative_type === "linear" ? "default" : "outline"
        }
        onClick={() =>
          toggleInitiativeType({ encounter_id: id, initiative_type: "linear" })
        }
      >
        <MoveHorizontal />
      </ButtonWithTooltip>
      <ButtonWithTooltip
        variant={encounter?.initiative_type === "group" ? "default" : "outline"}
        onClick={() =>
          toggleInitiativeType({ encounter_id: id, initiative_type: "group" })
        }
        text="Group initiative"
      >
        <StretchHorizontal />
      </ButtonWithTooltip>
    </div>
  );
}

export interface SimpleIconBattleCardProps {
  children?: React.ReactNode;
  creature: EncounterCreature;
  className?: string;
  index: number;
  activeIndex: number;
}

export function SimpleIconBattleCard({
  children,
  creature,
  className,
  index,
  activeIndex,
}: SimpleIconBattleCardProps) {
  const [encounter] = api.encounterById.useSuspenseQuery(useEncounterId());
  const { encounterById } = api.useUtils();

  const { mutate: removeStatusEffect } = api.removeStatusEffect.useMutation({
    onSettled: async () => {
      return await encounterById.invalidate(encounter.id);
    },
    onMutate: async (newStatusEffect) => {
      await encounterById.cancel(encounter.id);
      const previousEncounter = encounterById.getData(encounter.id);
      encounterById.setData(encounter.id, (old) => {
        if (!old) return old;
        return {
          ...old,
          participants: old.participants.map((participant) => {
            if (participant.id === newStatusEffect.encounter_participant_id) {
              return {
                ...participant,
                status_effects: participant.status_effects.filter(
                  (effect) => effect.id !== newStatusEffect.status_effect_id
                ),
              };
            }
            return participant;
          }),
        };
      });
      return previousEncounter;
    },
  });
  return (
    <span className="flex flex-col gap-2">
      {creature.status_effects?.map((effect) => (
        <BasePopover
          key={effect.id}
          trigger={
            <Button variant="outline" className="w-10 h-10">
              {effectIconMap[effect.name as keyof typeof effectIconMap]}
            </Button>
          }
          className="flex flex-col gap-2 text-sm f."
        >
          {effect.description}
          {!!effect.save_ends_dc && (
            <span>Save ends ({effect.save_ends_dc})</span>
          )}
          <Button onClick={() => removeStatusEffect(effect)}>Remove</Button>
        </BasePopover>
      ))}
      <Tip text={creature.name}>
        <Card
          data-active={creature.is_active}
          className={clsx(
            "w-28 h-40 shadow-lg relative select-none mb-8 rounded-sm justify-between overflow-hidden pt-3 gap-0 items-center flex flex-col transition-all",
            {
              "h-48 mb-0": creature.is_active,
              "opacity-40":
                (encounter?.current_round === 0 && !creature.has_surprise) ||
                index < activeIndex,
            },
            className
          )}
        >
          <HealthMeterOverlay creature={creature} />
          {creature.creature_id === "pending" ? (
            <span>Loading</span>
          ) : (
            <CharacterIcon
              id={creature.creature_id}
              name={creature.name}
              width={400}
              height={400}
              className="h-60 object-cover"
            />
          )}
          {children}
        </Card>
      </Tip>

      <div className={"flex justify-center "}>
        {creature.is_active && <ChevronUp />}
      </div>
    </span>
  );
}

export type BattleCardProps = {
  creature: EncounterCreature;
  children?: React.ReactNode;
  className?: string;
  isSelected?: boolean;
  header?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

export function BattleCard({
  creature,
  className,
  isSelected,
  header,
  ...props
}: BattleCardProps) {
  const id = useEncounterId();
  const [encounter] = api.encounterById.useSuspenseQuery(id);

  return (
    <div
      className={`relative flex-col gap-6 items-center justify-between flex`}
      {...props}
    >
      {creature?.minion_count && creature.minion_count > 1 ? (
        <MinionCardStack minionCount={creature.minion_count} />
      ) : null}
      <BattleCardLayout
        key={creature.id}
        data-active={creature.is_active}
        className={clsx(className, {
          "outline-zinc-900 outline": isSelected,
          "opacity-40":
            encounter?.current_round === 0 && !creature.has_surprise,
        })}
      >
        <BattleCardStatusEffects creature={creature} />
        <BattleCardCreatureName creature={creature} />
        <BattleCardContent>
          <span className="flex justify-between">
            <BattleCardCreatureIcon creature={creature} />
            <InitiativeInput participant={creature} key={creature.id} />
          </span>
          <BattleCardHealthAndStatus creature={creature} />
        </BattleCardContent>
      </BattleCardLayout>
      <AnimatePresence>
        <div className={"flex absolute -bottom-8 flex-row gap-2"}>
          {creature.is_active && (
            <FadePresenceItem>
              <ChevronUp />
            </FadePresenceItem>
          )}
        </div>
      </AnimatePresence>
    </div>
  );
}

export function BattleCardLayout({
  className,
  children,
  ...props
}: {
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Card
      className={clsx(
        "bg-white w-[300px] shadow-lg flex flex-col justify-between transition-all hover:rounded-xl group",
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
}

export function BattleCardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <CardContent className={clsx("flex flex-col gap-2", className)}>
      {children}
    </CardContent>
  );
}

export function BattleCardStatusEffects({
  creature,
}: {
  creature: EncounterCreature;
}) {
  const { mutate: removeStatusEffect } = useRemoveStatusEffect();

  return (
    <span className={"h-12 flex gap-1 flex-wrap items-center"}>
      {creature.status_effects?.map((effect) => (
        <BasePopover
          key={effect.id}
          trigger={
            <Button variant="outline">
              {effectIconMap[effect.name as keyof typeof effectIconMap]}
            </Button>
          }
          className="flex flex-col gap-2 text-sm"
        >
          {effect.description}
          {!!effect.save_ends_dc && (
            <span>Save ends ({effect.save_ends_dc})</span>
          )}
          <Button onClick={() => removeStatusEffect(effect)}>Remove</Button>
        </BasePopover>
      ))}
    </span>
  );
}

export function BattleCardCreatureName({
  creature,
}: {
  creature: EncounterCreature;
}) {
  return (
    <CardHeader className="flex pt-0 flex-col gap-2 justify-between items-center">
      <CardTitle className="text-xl truncate max-w-full group-hover:opacity-50">
        {creature.name}
      </CardTitle>
    </CardHeader>
  );
}

export function BattleCardCreatureIcon({
  creature,
  className,
}: {
  creature: EncounterCreature;
  className?: string;
}) {
  return creature.creature_id === "pending" ? (
    <span>Loading</span>
  ) : (
    <div className={clsx("relative", className)}>
      <CharacterIcon
        id={creature.creature_id}
        name={creature.name}
        width={200}
        height={200}
        className="object-cover w-32 h-32"
      />
      <HealthMeterOverlay creature={creature} />
    </div>
  );
}

export function BattleCardHealthAndStatus({
  creature,
}: {
  creature: EncounterCreature;
}) {
  return (
    <div className="flex flex-col gap-3">
      {!creature.is_player && <ParticipantHealthForm participant={creature} />}
      <StatusInput participant={creature} />
    </div>
  );
}

export function MinionCardStack({ minionCount }: { minionCount: number }) {
  return (
    <Badge className="absolute top-2 right-2 w-11 whitespace-nowrap">
      x {minionCount}
    </Badge>
  );
}

export function HealthMeterOverlay({
  creature,
}: {
  creature: EncounterCreature;
}) {
  let missingHp = creature.max_hp - creature.hp;
  missingHp = Math.min(missingHp, creature.max_hp);
  const creaturePercentDamage = (missingHp / creature.max_hp) * 100;
  return (
    <div
      style={{ height: `${creaturePercentDamage}%` }}
      className={clsx(
        "absolute rounded bottom-0 left-0 w-full bg-opacity-70 transition-all",
        {
          "bg-gray-500": creaturePercentDamage === 100,
          "bg-red-500": creaturePercentDamage !== 100,
        }
      )}
    />
  );
}

export const AnimationListItem = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const isPresent = useIsPresent();
  const animations = {
    style: {
      position: isPresent ? "static" : "absolute",
    },
  } as const;
  return (
    <motion.div {...animations} layout>
      {children}
    </motion.div>
  );
};

export function BattleAddCreatureForm({
  children,
}: {
  children?: React.ReactNode;
}) {
  const { mutate: addCreature, isLoading: isPendingCreatureAdd } =
    useCreateCreatureInEncounter();
  return (
    <div className={"flex gap-10 flex-wrap w-full justify-center"}>
      <CardContent className={"flex flex-col gap-6 pt-5"}>
        <CardTitle>New creature</CardTitle>
        <CustomCreature
          mutation={{
            onAddCreature: (data) => addCreature(data),
            isPending: isPendingCreatureAdd,
          }}
        />
      </CardContent>
      <CardContent className={"flex flex-col gap-3 pt-5 max-h-full"}>
        <CardTitle>Existing creature</CardTitle>
        <ExistingCreature />
      </CardContent>
    </div>
  );
}

export function SpellSearcher() {
  const [showSearch, setShowSearch] = React.useState(false);
  const [searchInput, setSearchInput] = React.useState("");

  React.useEffect(() => {
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.keyCode === 75) {
        e.preventDefault();
        setShowSearch(true);
      }
    });
    return () => {
      document.removeEventListener("keydown", () => {});
    };
  }, []);

  const { data: spells } = api.spells.useQuery(searchInput);

  return (
    <Dialog open={showSearch} onOpenChange={(isOpen) => setShowSearch(isOpen)}>
      <DialogContent className="max-w-3xl h-[500px] overflow-auto">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        {
          <div className="flex flex-col gap-8">
            {spells?.map((spell) => (
              <div key={spell.id} className="flex flex-col gap-3">
                <DialogTitle>
                  {spell.name} ({spell.source})
                </DialogTitle>
                <DialogDescription className="text-lg whitespace-break-spaces">
                  {spell.entries}
                </DialogDescription>
              </div>
            ))}
          </div>
        }
      </DialogContent>
    </Dialog>
  );
}
