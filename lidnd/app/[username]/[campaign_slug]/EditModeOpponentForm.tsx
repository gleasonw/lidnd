"use client";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { ImageUpload } from "@/encounters/image-upload";
import { Angry, FileText, ImagePlus, Plus, PlusIcon, User } from "lucide-react";
import { FormProvider } from "react-hook-form";
import { useState } from "react";
import { useParticipantForm } from "@/encounters/[encounter_index]/hooks";
import { LidndLabel } from "@/components/ui/LidndLabel";
import { ButtonWithTooltip } from "@/components/ui/tip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { creatureTypes } from "@/server/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExistingCreatureAdd } from "@/encounters/[encounter_index]/ExistingCreatureAdd";

/**like the other form, but more flat.  */
export function EditModeOpponentForm({
  onSubmitSuccess,
}: {
  onSubmitSuccess?: () => void;
}) {
  const [overrideHp, setOverrideHp] = useState<string | undefined>(undefined);
  const [isShowingIconInput, setIsShowingIconInput] = useState(false);

  const hpAsNumber = Number(overrideHp);
  const overrideHpValue =
    !isNaN(hpAsNumber) && hpAsNumber > 0 ? hpAsNumber : undefined;
  const { form, onSubmit, isPending } = useParticipantForm({
    role: "opponent",
    overrideHp: overrideHpValue,
    afterSubmit: () => {
      setOverrideHp(undefined);
      onSubmitSuccess?.();
    },
  });

  const reactiveCreatureType = form.watch("type");

  return (
    <Tabs defaultValue="new" className="max-h-full flex flex-col gap-2 h-full">
      <span>
        <TabsList>
          <TabsTrigger value="new">
            <Plus /> New opponent
          </TabsTrigger>
          <TabsTrigger value="existing">
            <Angry /> Existing opponent
          </TabsTrigger>
        </TabsList>
      </span>
      <TabsContent value="new" className="flex max-h-full overflow-hidden">
        <FormProvider {...form}>
          <form
            // If I add a void, the form reloads the page
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-5 w-full h-full max-h-full p-2 overflow-auto"
          >
            <div className="flex flex-col gap-5 pt-2">
              <div className="flex items-baseline">
                <LidndLabel label="Name">
                  <FormField
                    control={form.control}
                    name={"name"}
                    render={({ field }) => {
                      return (
                        <LidndTextInput
                          variant="ghost"
                          className="col-start-1"
                          required
                          placeholder="Balrog"
                          {...field}
                        />
                      );
                    }}
                  />
                </LidndLabel>
                <ButtonWithTooltip
                  tabIndex={-1}
                  variant={"ghost"}
                  className="text-gray-400 ml-auto"
                  text="Add Icon Image"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsShowingIconInput(!isShowingIconInput);
                  }}
                >
                  <ImagePlus />
                </ButtonWithTooltip>
              </div>

              {isShowingIconInput && (
                <div className="w-[200px] h-full">
                  <FormField
                    control={form.control}
                    name="iconImage"
                    render={({ field }) => {
                      return (
                        <ImageUpload
                          image={field.value}
                          dropContainerClassName="h-full"
                          clearImage={() => field.onChange(undefined)}
                          onUpload={(image) => {
                            field.onChange(image);
                          }}
                          dropText="Drop an Icon"
                          dropIcon={<User />}
                          fileInputProps={{ name: "icon_image" }}
                        />
                      );
                    }}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 h-full max-h-full overflow-auto">
              <FormField
                control={form.control}
                name="statBlockImage"
                render={({ field }) => (
                  <div className="w-full h-full min-h-[150px]">
                    <ImageUpload
                      dropContainerClassName="p-5 h-full"
                      onUpload={(image) => {
                        field.onChange(image);
                      }}
                      dropText="Drop a Statblock"
                      dropIcon={<FileText />}
                      previewSize={500}
                      image={field.value}
                      clearImage={() => field.onChange(undefined)}
                      fileInputProps={{ name: "stat_block_image" }}
                    />
                  </div>
                )}
              />
            </div>
            <div className="flex w-full gap-5 flex-wrap">
              <LidndLabel label="Creature type">
                <FormField
                  control={form.control}
                  name={"type"}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) =>
                        field.onChange(value as (typeof creatureTypes)[number])
                      }
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {creatureTypes.map((ct) => (
                          <SelectItem key={ct} value={ct}>
                            {ct.replaceAll("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </LidndLabel>
              <LidndLabel label="EV">
                <FormField
                  control={form.control}
                  name={"challenge_rating"}
                  render={({ field }) => (
                    <LidndTextInput
                      className="w-32"
                      type="number"
                      required
                      placeholder={"3"}
                      {...field}
                      value={field.value ?? ""}
                    />
                  )}
                />
              </LidndLabel>
              <LidndLabel label="Max Stamina">
                <FormField
                  control={form.control}
                  name={"max_hp"}
                  render={({ field }) => (
                    <LidndTextInput
                      type="number"
                      required
                      placeholder="120"
                      className="w-32"
                      {...field}
                      value={field.value ?? ""}
                    />
                  )}
                />
              </LidndLabel>
              <LidndLabel
                label={
                  reactiveCreatureType === "minion_monster"
                    ? "# of minions"
                    : "Override HP"
                }
              >
                <LidndTextInput
                  type="number"
                  placeholder={
                    reactiveCreatureType === "minion_monster" ? "4" : "80"
                  }
                  tabIndex={-1}
                  className="w-32"
                  value={overrideHp ?? ""}
                  onChange={(e) => setOverrideHp(e.target.value)}
                />
              </LidndLabel>
            </div>
            <Button
              type="submit"
              className="col-span-2 bg-gray-200"
              variant="outline"
            >
              <PlusIcon />
              {isPending ? "Uploading..." : "Add participant"}
            </Button>
          </form>
        </FormProvider>
      </TabsContent>
      <TabsContent value="existing">
        <ExistingCreatureAdd />
      </TabsContent>
    </Tabs>
  );
}
