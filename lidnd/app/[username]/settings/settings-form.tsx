"use client";

import { Switch } from "@/components/ui/switch";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import z from "zod";

export function SettingsForm() {
  const [userSettings] = api.settings.useSuspenseQuery();
  const { settings } = api.useUtils();
  const { mutate: updateSettings, isPending: isLoading } =
    api.updateSettings.useMutation({});

  const updateSettingsSchema = z.object({
    show_health_in_discord: z.boolean(),
    show_icons_in_discord: z.boolean(),
    average_turn_seconds: z.coerce.number(),
    enable_minions: z.boolean(),
  });

  return (
    <div className={"flex flex-col gap-5 max-w-sm"}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target as HTMLFormElement);
          const settings = Object.fromEntries(formData.entries());
          const settingsWithBooleans = {
            ...settings,
            show_health_in_discord: settings.show_health_in_discord === "on",
            show_icons_in_discord: settings.show_icons_in_discord === "on",
            enable_minions: settings.enable_minions === "on",
          };
          updateSettings(updateSettingsSchema.parse(settingsWithBooleans));
        }}
        className={"flex flex-col gap-5"}
      >
        <div className={"flex gap-5 justify-between"}>
          <label>
            Default average turn seconds
            <Input
              name="average_turn_seconds"
              type="number"
              defaultValue={userSettings?.average_turn_seconds ?? 180}
            />
          </label>
        </div>
        <div className={"flex gap-5 justify-between"}>
          <label>
            Enable minions
            <Switch
              name="enable_minions"
              defaultChecked={userSettings?.enable_minions ?? false}
            />
          </label>
        </div>
        <LoadingButton isLoading={isLoading} type={"submit"} className="w-32">
          Save settings
        </LoadingButton>
      </form>
    </div>
  );
}
