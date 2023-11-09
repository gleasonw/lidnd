"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Settings } from "@/server/api/router";

export function SettingsForm({
  initialSettings,
}: {
  initialSettings?: Settings;
}) {
  return (
    <div className={"flex flex-col gap-5 max-w-sm"}>
      <form>
        <div className={"flex gap-5 justify-between"}>
          <label className="flex justify-between w-full">
            Show monster health
            <Switch
              name="health"
              defaultChecked={initialSettings?.show_health_in_discord ?? false}
            />
          </label>
        </div>
        <div className={"flex gap-5 justify-between"}>
          <label className="flex justify-between w-full">
            Show active icon
            <Switch
              name="icon"
              defaultChecked={initialSettings?.show_icons_in_discord ?? false}
            />
          </label>
        </div>

        <div className={"flex gap-5 justify-between"}>
          <label>
            Default average turn seconds
            <Input
              name="average_turn_duration"
              type="number"
              defaultValue={initialSettings?.average_turn_seconds ?? 180}
            />
          </label>
        </div>
        <div className={"flex gap-5 justify-between"}>
          <label>
            Default player level
            <Input
              name="average_turn_duration"
              type="number"
              defaultValue={initialSettings?.default_player_level ?? 1}
            />
          </label>
        </div>
        <LoadingButton type={"submit"} className="w-32">
          Save settings
        </LoadingButton>
      </form>
    </div>
  );
}
