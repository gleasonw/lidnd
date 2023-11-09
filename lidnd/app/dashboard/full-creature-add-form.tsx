import {
  CreaturePost,
  ImageUpload,
} from "@/app/dashboard/encounters/[id]/creature-add-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Form,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { creatureUploadSchema } from "@/server/api/router";
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  created_at: z.date().optional(),
  max_hp: z.coerce.number(),
  challenge_rating: z.coerce.number().optional(),
  is_player: z.boolean().optional(),
  icon_image: z.instanceof(File),
  stat_block_image: z.instanceof(File),
});

export function FullCreatureAddForm({
  className,
  children,
  uploadCreature,
}: {
  className?: string;
  children?: React.ReactNode;
  uploadCreature: (data: CreaturePost) => void;
}) {
  const form = useForm<z.infer<typeof creatureUploadSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      max_hp: 0,
      challenge_rating: 0,
      icon_image: undefined,
      stat_block_image: undefined,
      is_player: false,
    },
  });
  const [keyToResetFile, setKeyToResetFile] = React.useState(0);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => {
          uploadCreature(data);
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
          name="icon_image"
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
          name="stat_block_image"
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
                value={field.value?.toString()}
              />
            </CreatureFormItems>
          )}
        />

        <FormField
          control={form.control}
          name="is_player"
          render={({ field }) => (
            <CreatureFormItems name="Player">
              <Checkbox
                checked={field.value ?? false}
                onCheckedChange={(checked) => field.onChange(checked)}
              />
            </CreatureFormItems>
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
