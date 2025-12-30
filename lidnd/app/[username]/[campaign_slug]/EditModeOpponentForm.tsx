"use client";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { ImageUpload } from "@/encounters/image-upload";
import { FileText, PlusIcon, User } from "lucide-react";
import { FormProvider } from "react-hook-form";
import { useCampaign } from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { useState } from "react";
import { useParticipantForm } from "@/encounters/[encounter_index]/hooks";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/**like the other form, but more flat.  */
export function EditModeOpponentForm({
  onSubmitSuccess,
}: {
  onSubmitSuccess?: () => void;
}) {
  const [overrideHp, setOverrideHp] = useState<string | undefined>(undefined);

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
  const [campaign] = useCampaign();

  return (
    <div
      defaultValue="new"
      className="max-h-full flex flex-col gap-2 h-full overflow-hidden"
    >
      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-5 w-full h-full max-h-full overflow-hidden p-2"
        >
          <div className="flex gap-5 pt-2">
            <div className="grid grid-cols-2 grid-rows-3 gap-3">
              <FormField
                control={form.control}
                name={"name"}
                render={({ field }) => {
                  return (
                    <LidndTextInput
                      className="col-start-1"
                      required
                      placeholder="Name"
                      {...field}
                    />
                  );
                }}
              />
              <FormField
                control={form.control}
                name={"is_inanimate"}
                render={({ field }) => (
                  <div className="flex h-full items-center">
                    <Checkbox
                      tabIndex={-1}
                      id="is_inanimate"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="col-start-2"
                    />
                    <Label
                      htmlFor="is_inanimate"
                      className="ml-2 text-gray-500"
                    >
                      Only render name + statblock
                    </Label>
                  </div>
                )}
              />
              <FormField
                control={form.control}
                name={"max_hp"}
                render={({ field }) => (
                  <LidndTextInput
                    type="number"
                    required
                    placeholder="Base HP"
                    className="col-start-1"
                    {...field}
                    value={field.value ?? ""}
                  />
                )}
              />

              <LidndTextInput
                type="number"
                placeholder="Override HP for encounter"
                tabIndex={-1}
                className="col-start-2 row-start-2"
                value={overrideHp ?? ""}
                onChange={(e) => setOverrideHp(e.target.value)}
              />
              <FormField
                control={form.control}
                name={"challenge_rating"}
                render={({ field }) => (
                  <LidndTextInput
                    className="col-start-1"
                    type="number"
                    placeholder={campaign.system === "dnd5e" ? "CR" : "EV"}
                    {...field}
                    value={field.value ?? ""}
                  />
                )}
              />
            </div>
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
    </div>
  );
}
