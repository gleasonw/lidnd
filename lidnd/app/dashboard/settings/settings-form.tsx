"use client";

import { Switch } from "@/components/ui/switch";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import z from "zod";

export function SettingsForm() {
  const [userSettings, userSettingsQuery] = api.settings.useSuspenseQuery();
  const { mutate: updateSettings, isLoading } =
    api.updateSettings.useMutation();

  const updateSettingsSchema = z.object({
    show_health_in_discord: z.boolean(),
    show_icons_in_discord: z.boolean(),
    average_turn_seconds: z.coerce.number(),
    default_player_level: z.coerce.number(),
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
          };
          updateSettings(updateSettingsSchema.parse(settingsWithBooleans));
        }}
      >
        <div className={"flex gap-5 justify-between"}>
          <label className="flex justify-between w-full">
            Show monster health
            <Switch
              name="show_health_in_discord"
              defaultChecked={userSettings?.show_health_in_discord ?? false}
            />
          </label>
        </div>
        <div className={"flex gap-5 justify-between"}>
          <label className="flex justify-between w-full">
            Show active icon
            <Switch
              name="show_icons_in_discord"
              defaultChecked={userSettings?.show_icons_in_discord ?? false}
            />
          </label>
        </div>

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
            Default player level
            <Input
              name="default_player_level"
              type="number"
              defaultValue={userSettings?.default_player_level ?? 1}
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
