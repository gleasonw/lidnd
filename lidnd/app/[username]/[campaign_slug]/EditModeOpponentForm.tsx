"use client";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import {
  ExistingMonster,
  useParticipantForm,
} from "@/encounters/[encounter_index]/participant-upload-form";
import { ImageUpload } from "@/encounters/image-upload";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Angry, FileText, Plus, PlusIcon, User } from "lucide-react";
import { FormProvider } from "react-hook-form";
import { useCampaign } from "@/app/[username]/[campaign_slug]/campaign-hooks";

/**like the other form, but more flat.  */
export function EditModeOpponentForm() {
  const { form, onSubmit, isPending } = useParticipantForm("opponent");
  const [campaign] = useCampaign();

  return (
    <Tabs defaultValue="new" className="overflow-auto">
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
      <TabsContent value="new">
        <FormProvider {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-8 w-full p-3"
          >
            <div className="flex gap-5">
              <div className="w-[200px]">
                <FormField
                  control={form.control}
                  name="iconImage"
                  render={({ field }) => {
                    return (
                      <ImageUpload
                        image={field.value}
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
              <div className="flex flex-col">
                <FormField
                  control={form.control}
                  name={"name"}
                  render={({ field }) => {
                    return (
                      <LidndTextInput
                        variant="ghost"
                        required
                        placeholder="Name"
                        {...field}
                      />
                    );
                  }}
                />
                <FormField
                  control={form.control}
                  name={"max_hp"}
                  render={({ field }) => (
                    <LidndTextInput
                      type="number"
                      variant="ghost"
                      required
                      placeholder="HP"
                      {...field}
                      value={field.value ?? ""}
                    />
                  )}
                />
                <FormField
                  control={form.control}
                  name={"challenge_rating"}
                  render={({ field }) => (
                    <LidndTextInput
                      variant="ghost"
                      type="number"
                      placeholder={campaign.system === "dnd5e" ? "CR" : "EV"}
                      {...field}
                      value={field.value ?? ""}
                    />
                  )}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <FormField
                control={form.control}
                name="statBlockImage"
                render={({ field }) => (
                  <ImageUpload
                    dropContainerClassName="h-30 p-5"
                    onUpload={(image) => {
                      field.onChange(image);
                    }}
                    dropText="Drop a Statblock"
                    dropIcon={<FileText />}
                    previewSize={800}
                    image={field.value}
                    clearImage={() => field.onChange(undefined)}
                    fileInputProps={{ name: "stat_block_image" }}
                  />
                )}
              />
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
        <ExistingMonster />
      </TabsContent>
    </Tabs>
  );
}
