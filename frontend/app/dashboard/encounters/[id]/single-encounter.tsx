"use client";

import EncounterCreatureAddForm, {
  CreaturePost,
  ImageUpload,
  creatureFormSchema,
} from "@/app/dashboard/encounters/[id]/creature-add-form";
import { DamageType } from "@/app/dashboard/encounters/[id]/resistance-selector";
import {
  AnimationListItem,
  BattleCard,
} from "@/app/dashboard/encounters/[id]/run/battle-ui";
import {
  useEncounter,
  useEncounterCreatures,
  useStartEncounter,
} from "@/app/dashboard/encounters/api";
import { useEncounterId } from "@/app/dashboard/encounters/hooks";
import { Button } from "@/components/ui/button";
import { AnimatePresence } from "framer-motion";
import { FilePlus, Play, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import * as z from "zod";

export const creatureForm = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  max_hp: z.coerce.number().gte(1, { message: "Max HP must be at least 1." }),
  challenge_rating: z.number(),
  icon: z.instanceof(File),
  stat_block: z.instanceof(File),
  strategy_notes: z.string(),
  resistances: z.array(z.string()),
  immunities: z.array(z.string()),
  vulnerabilities: z.array(z.string()),
  is_player: z.boolean(),
});

export default function SingleEncounter() {
  const { data: encounterParticipants } = useEncounterCreatures();
  const { data: encounter } = useEncounter();
  const { mutate: startEncounter } = useStartEncounter();
  const id = useEncounterId();
  const [damageTypes, setDamageTypes] = useState<DamageType[]>([]);

  const form = useForm<z.infer<typeof creatureForm>>({
    resolver: zodResolver(creatureForm),
    defaultValues: {
      name: "",
      max_hp: 0,
      challenge_rating: 0,
      icon: undefined,
      stat_block: undefined,
    },
  });

  function onSubmit(data: CreaturePost) {
    console.log(data);
  }

  return (
    <div className={"flex flex-col items-center gap-10 relative"}>
      <div className="justify-self-center self-center absolute top-0 right-0">
        {encounter?.started_at ? (
          <Link href={`${id}/run`}>
            <Button>
              <Play />
              Continue the battle!
            </Button>
          </Link>
        ) : (
          <Link href={`${id}/run`} onClick={() => startEncounter()}>
            <Button>
              <Play />
              Commence the battle!
            </Button>
          </Link>
        )}
      </div>

      <AnimatePresence>
        <div className={"flex gap-10 overflow-auto justify-center w-full p-5"}>
          {encounterParticipants
            ?.sort((a, b) => a.initiative - b.initiative)
            .map((participant) => (
              <AnimationListItem key={participant.id}>
                <BattleCard creature={participant} />
              </AnimationListItem>
            ))}
        </div>
      </AnimatePresence>
      <EncounterCreatureAddForm
        className="w-1/2"
        customCreatureForm={
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-8"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <CreatureFormItems name="Name">
                    <Input type="text" placeholder="Kobold..." {...field} />
                  </CreatureFormItems>
                )}
              />
              <FormField
                control={form.control}
                name="max_hp"
                render={({ field }) => (
                  <CreatureFormItems name="Max HP">
                    <Input
                      type="text"
                      placeholder="10..."
                      {...field}
                      value={field.value.toString()}
                    />
                  </CreatureFormItems>
                )}
              />
              <FormField
                control={form.control}
                name="challenge_rating"
                render={({ field }) => (
                  <CreatureFormItems name="Challenge Rating">
                    <Input
                      type="text"
                      placeholder="1..."
                      {...field}
                      value={field.value.toString()}
                    />
                  </CreatureFormItems>
                )}
              />
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <CreatureFormItems name="Icon">
                    <ImageUpload
                      onUpload={(file) =>
                        field.onChange({ target: { value: file } })
                      }
                    />
                  </CreatureFormItems>
                )}
              />
              <FormField
                control={form.control}
                name="stat_block"
                render={({ field }) => (
                  <CreatureFormItems name="Stat Block">
                    <ImageUpload
                      onUpload={(file) =>
                        field.onChange({ target: { value: file } })
                      }
                    />
                  </CreatureFormItems>
                )}
              />
              <Button type="submit">Submit</Button>
            </form>
          </Form>
        }
      />
    </div>
  );
}

function CreatureFormItems({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <FormItem className="flex flex-col gap-2">
      <FormLabel>{name}</FormLabel>
      <FormControl>{children}</FormControl>
      <FormMessage />
    </FormItem>
  );
}

const encounterCRPerCharacter = [
  { level: 1, easy: 0.125, standard: 0.125, hard: 0.25, cap: 1 },
  { level: 2, easy: 0.125, standard: 0.25, hard: 0.5, cap: 3 },
  { level: 3, easy: 0.25, standard: 0.5, hard: 0.75, cap: 4 },
  { level: 4, easy: 0.5, standard: 0.75, hard: 1, cap: 6 },
  { level: 5, easy: 1, standard: 1.5, hard: 2.5, cap: 8 },
  { level: 6, easy: 1.5, standard: 2, hard: 3, cap: 9 },
  { level: 7, easy: 2, standard: 2.5, hard: 3.5, cap: 10 },
  { level: 8, easy: 2.5, standard: 3, hard: 4, cap: 13 },
  { level: 9, easy: 3, standard: 3.5, hard: 4.5, cap: 13 },
  { level: 10, easy: 3.5, standard: 4, hard: 5, cap: 15 },
  { level: 11, easy: 4, standard: 4.5, hard: 5.5, cap: 16 },
  { level: 12, easy: 4.5, standard: 5, hard: 6, cap: 17 },
  { level: 13, easy: 5, standard: 5.5, hard: 6.5, cap: 19 },
  { level: 14, easy: 5.5, standard: 6, hard: 7, cap: 20 },
  { level: 15, easy: 6, standard: 6.5, hard: 7.5, cap: 22 },
  { level: 16, easy: 6.5, standard: 7, hard: 8, cap: 24 },
  { level: 17, easy: 7, standard: 7.5, hard: 8.5, cap: 25 },
  { level: 18, easy: 7.5, standard: 8, hard: 9, cap: 26 },
  { level: 19, easy: 8, standard: 8.5, hard: 9.5, cap: 28 },
  { level: 20, easy: 8.5, standard: 9, hard: 10, cap: 30 },
];
