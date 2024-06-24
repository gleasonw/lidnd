import { ImageUpload } from "./image-upload";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Form,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Angry, Plus, User } from "lucide-react";
import { CreaturePost } from "./types";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { Input } from "@/components/ui/input";

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
  max_hp: z.coerce.number().gt(0),
  challenge_rating: z.coerce.number().gt(0),
  is_player: z.boolean(),
  icon_image: z.instanceof(File),
  stat_block_image: z.instanceof(File),
});

export function MonsterUploadForm({ uploadCreature }: CreatureAddProps) {
  const form = useForm<z.infer<typeof monsterFormSchema>>({
    resolver: zodResolver(monsterFormSchema),
    defaultValues: {
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
        className="flex flex-col gap-8"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <CreatureFormItems name="Name">
              <LidndTextInput
                variant="ghost"
                className="text-xl"
                placeholder="Name"
                {...field}
              />
            </CreatureFormItems>
          )}
        />
        <FormField
          control={form.control}
          name="icon_image"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-2">
              <FormControl>
                <ImageUpload
                  onUpload={(file) =>
                    field.onChange({ target: { value: file } })
                  }
                  fileText="Choose icon"
                  dropText="Drop an icon"
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
              <FormControl>
                <ImageUpload
                  onUpload={(file) =>
                    field.onChange({ target: { value: file } })
                  }
                  dropText="Drop a stat block"
                  fileText="Choose stat block"
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
        <div className="grid grid-cols-2 gap-5">
          <FormField
            control={form.control}
            name="max_hp"
            render={({ field }) => (
              <CreatureFormItems name="Max HP">
                <Input
                  placeholder="Max hp"
                  {...field}
                  value={field.value?.toString()}
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
                  placeholder="Challenge rating"
                  {...field}
                  value={field.value?.toString()}
                />
              </CreatureFormItems>
            )}
          />
        </div>
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
  challenge_rating: true,
  max_hp: true,
});

export function PlayerUploadForm({ uploadCreature }: CreatureAddProps) {
  const form = useForm<z.infer<typeof playerFormSchema>>({
    resolver: zodResolver(playerFormSchema),
    defaultValues: {
      icon_image: undefined,
      is_player: true,
    },
  });
  const [keyToResetFile, setKeyToResetFile] = React.useState(0);
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => {
          uploadCreature({ ...data, max_hp: 0, challenge_rating: 0 });
          form.reset();
          setKeyToResetFile(keyToResetFile + 1);
        })}
        className="flex flex-col gap-8"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <CreatureFormItems name="Name">
              <LidndTextInput
                variant="ghost"
                className="text-xl"
                type="text"
                placeholder="Name"
                {...field}
              />
            </CreatureFormItems>
          )}
        />
        <FormField
          control={form.control}
          name="icon_image"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-2">
              <FormControl>
                <ImageUpload
                  onUpload={(file) =>
                    field.onChange({ target: { value: file } })
                  }
                  dropText="Drop an icon"
                  fileText="Choose icon"
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
      <FormControl>{children}</FormControl>
      <FormMessage />
    </FormItem>
  );
}
