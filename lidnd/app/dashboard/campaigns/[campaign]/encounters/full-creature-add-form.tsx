import { ImageUpload } from "./image-upload";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Angry, Plus, User } from "lucide-react";
import { CreaturePost } from "./types";

type CreatureAddProps = {
  uploadCreature: (data: CreaturePost) => void;
};

export function FullCreatureAddForm(props: CreatureAddProps) {
  return (
    <Tabs defaultValue="monster">
      <TabsList>
        <TabsTrigger value="monster" className="flex gap-3">
          <Angry /> Monster
        </TabsTrigger>
        <TabsTrigger value="player" className="flex gap-3">
          <User /> Player
        </TabsTrigger>
      </TabsList>
      <TabsContent value="monster">
        <MonsterUploadForm {...props} />
      </TabsContent>
      <TabsContent value="player">
        <PlayerUploadForm {...props} />
      </TabsContent>
    </Tabs>
  );
}

const monsterFormSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  created_at: z.date().optional(),
  max_hp: z.coerce.number(),
  challenge_rating: z.coerce.number(),
  is_player: z.boolean(),
  icon_image: z.instanceof(File),
  stat_block_image: z.instanceof(File),
});

function MonsterUploadForm({ uploadCreature }: CreatureAddProps) {
  const form = useForm<z.infer<typeof monsterFormSchema>>({
    resolver: zodResolver(monsterFormSchema),
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
              <FormLabel>Icon</FormLabel>
              <FormControl>
                <ImageUpload
                  onUpload={(file) =>
                    field.onChange({ target: { value: file } })
                  }
                  key={keyToResetFile}
                  image={field.value}
                  clearImage={() =>
                    field.onChange({ target: { value: undefined } })
                  }
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
              <FormLabel>Stat block</FormLabel>
              <FormControl>
                <ImageUpload
                  onUpload={(file) =>
                    field.onChange({ target: { value: file } })
                  }
                  key={keyToResetFile}
                  image={field.value}
                  clearImage={() =>
                    field.onChange({ target: { value: undefined } })
                  }
                  previewSize={700}
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
        <div className="flex gap-2 items-center">
          {" "}
          <Button type="submit" className="w-full">
            <Plus /> Add Creature
          </Button>
        </div>
      </form>
    </Form>
  );
}

const playerFormSchema = monsterFormSchema.omit({
  stat_block_image: true,
});

export function PlayerUploadForm({ uploadCreature }: CreatureAddProps) {
  const form = useForm<z.infer<typeof playerFormSchema>>({
    resolver: zodResolver(playerFormSchema),
    defaultValues: {
      max_hp: 0,
      challenge_rating: 0,
      icon_image: undefined,
      is_player: true,
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
              <Input type="text" placeholder="Lan..." {...field} />
            </CreatureFormItems>
          )}
        />
        <FormField
          control={form.control}
          name="icon_image"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-2">
              <FormLabel>Icon</FormLabel>
              <FormControl>
                <ImageUpload
                  onUpload={(file) =>
                    field.onChange({ target: { value: file } })
                  }
                  key={keyToResetFile}
                  image={field.value}
                  clearImage={() =>
                    field.onChange({ target: { value: undefined } })
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-5">
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
