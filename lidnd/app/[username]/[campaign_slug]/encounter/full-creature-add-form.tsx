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
import { Angry, FileText, Plus, Shield, Skull, User, X } from "lucide-react";
import type { CreaturePost } from "./types";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { LidndDialog } from "@/components/ui/lidnd_dialog";

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

export function CompactMonsterUploadForm({ uploadCreature }: CreatureAddProps) {
  const form = useForm<z.infer<typeof monsterFormSchema>>({
    resolver: zodResolver(monsterFormSchema),
    defaultValues: {
      icon_image: undefined,
      stat_block_image: undefined,
      is_player: false,
      name: "",
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
        className="flex flex-col w-full h-full gap-6"
      >
        <div className="grid grid-cols-4 gap-5 items-center w-full h-full">
          <FormField
            control={form.control}
            name="icon_image"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-2 h-full">
                <FormControl>
                  <ImageUpload
                    onUpload={(file) =>
                      field.onChange({ target: { value: file } })
                    }
                    dropText="Drop an icon"
                    dropIcon={<User />}
                    dropContainerClassName="p-5 h-full"
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
          />{" "}
          <FormField
            control={form.control}
            name="stat_block_image"
            render={({ field }) => (
              <FormItem className="flex gap-2 flex-col h-full">
                <FormControl>
                  <ImageUpload
                    onUpload={(file) =>
                      field.onChange({ target: { value: file } })
                    }
                    dropText="Drop a stat block"
                    dropContainerClassName="p-5 w-full h-full"
                    dropIcon={<FileText />}
                    previewRender={(url) => (
                      <div className="max-h-full overflow-hidden relative flex flex-col">
                        <Button
                          variant="destructive"
                          onClick={(e) => {
                            e.preventDefault();
                            field.onChange({ target: { value: undefined } });
                          }}
                          size="sm"
                          className="absolute top-0 right-0"
                        >
                          <X />
                        </Button>
                        <span>{field.value?.name}</span>

                        <LidndDialog
                          title={"Preview"}
                          trigger={
                            <Image
                              src={url}
                              alt={`Preview image for ${field.value?.name}`}
                              width={100}
                              height={100}
                              className="hover:cursor-pointer hover:outline-2"
                            />
                          }
                          content={
                            <Image
                              src={url}
                              alt={`Preview image for ${field.value?.name}`}
                              width={700}
                              height={700}
                            />
                          }
                        />
                      </div>
                    )}
                    key={keyToResetFile}
                    image={field.value}
                    clearImage={() =>
                      field.onChange({ target: { value: undefined } })
                    }
                    previewSize={200}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex gap-2 flex-col h-full justify-between">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <CreatureFormItems name="Name">
                  <LidndTextInput
                    variant="ghost"
                    placeholder="Creature name"
                    className="text-xl"
                    {...field}
                  />
                </CreatureFormItems>
              )}
            />
            <FormField
              control={form.control}
              name="max_hp"
              render={({ field }) => (
                <CreatureFormItems name="Max HP">
                  <Input
                    placeholder="Max HP"
                    {...field}
                    type="number"
                    onChange={(e) =>
                      field.onChange(Math.max(1, parseInt(e.target.value)))
                    }
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
                    onChange={(e) => field.onChange(e.target.value)}
                    type="number"
                  />
                </CreatureFormItems>
              )}
            />
          </div>
          <div className="h-full flex flex-col justify-between gap-4">
            <Button type="submit" className="h-full flex flex-col">
              <Skull /> Add as adversary
            </Button>
            <Button variant="outline" className="h-full flex flex-col">
              <Shield /> Add as ally
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
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
        className="flex flex-col gap-6 pt-3"
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
                  dropText="Drop an icon"
                  dropIcon={<User />}
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
                  dropIcon={<FileText />}
                  dropContainerClassName="h-48"
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
                  placeholder="HP"
                  {...field}
                  type="number"
                  onChange={(e) =>
                    field.onChange(Math.max(1, parseInt(e.target.value)))
                  }
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
                  placeholder="CR"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value)}
                  type="number"
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
      name: "",
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
                  dropIcon={<User />}
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
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <FormItem className="flex flex-col">
      <FormControl>{children}</FormControl>
      <FormMessage />
    </FormItem>
  );
}
