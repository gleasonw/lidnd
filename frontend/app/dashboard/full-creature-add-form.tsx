import {
  CreaturePost,
  ImageUpload,
} from "@/app/dashboard/encounters/[id]/creature-add-form";
import { useAddCreatureToEncounter } from "@/app/dashboard/encounters/api";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Form,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

export const creatureForm = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  max_hp: z.coerce.number().gte(1, { message: "Max HP must be at least 1." }),
  challenge_rating: z.coerce.number(),
  icon: z.any(),
  stat_block: z.any(),
  strategy_notes: z.string().optional(),
  resistances: z.array(z.string()).optional(),
  immunities: z.array(z.string()).optional(),
  vulnerabilities: z.array(z.string()).optional(),
  is_player: z.boolean().default(false).optional(),
});

export function FullCreatureAddForm({
  className,
  children,
  createCreatureMutation,
}: {
  className?: string;
  children?: React.ReactNode;
  createCreatureMutation?: (data: CreaturePost) => void;
}) {
  const { mutate: addCreatureToEncounter } = useAddCreatureToEncounter();
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
  const [keyToResetFile, setKeyToResetFile] = React.useState(0);

  const addCreatureMutation = createCreatureMutation ?? addCreatureToEncounter;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data, e) => {
          addCreatureMutation({
            icon: data.icon,
            max_hp: data.max_hp,
            name: data.name,
            stat_block: data.stat_block,
            challenge_rating: data.challenge_rating,
          });
          form.reset();
          setKeyToResetFile(keyToResetFile + 1);
        })}
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
            <FormItem className="flex flex-col gap-2">
              <FormLabel>Select or paste icon</FormLabel>
              <FormControl>
                <ImageUpload
                  onUpload={(file) =>
                    field.onChange({ target: { value: file } })
                  }
                  key={keyToResetFile}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="stat_block"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-2">
              <FormLabel>Select or paste stat block</FormLabel>
              <FormControl>
                <ImageUpload
                  onUpload={(file) =>
                    field.onChange({ target: { value: file } })
                  }
                  key={keyToResetFile}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-5">
          {children}
          <Button type="submit">Submit</Button>
        </div>
      </form>
    </Form>
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
