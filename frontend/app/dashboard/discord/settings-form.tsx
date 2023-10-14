"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  DiscordEncounterSettings,
  updateDiscordSettings,
} from "@/app/dashboard/actions";
import { experimental_useFormStatus } from "react-dom";

export function DiscordSettingsForm({
  initialSettings,
}: {
  initialSettings?: DiscordEncounterSettings;
}) {
  const [health, setHealth] = useState(initialSettings?.show_health ?? false);
  const [icon, setIcon] = useState(initialSettings?.show_icons ?? false);
  const { pending } = experimental_useFormStatus();

  const updateSettingsWithArgs = updateDiscordSettings.bind(null, {
    show_health: health,
    show_icons: icon,
  });

  return (
    <div className={"flex flex-col gap-5 max-w-sm"}>
      <div className={"flex gap-5 justify-between"}>
        <label htmlFor="health">Show monster health</label>
        <Switch
          id="health"
          checked={health}
          onCheckedChange={(checked) => setHealth(checked)}
        />
      </div>
      <div className={"flex gap-5 justify-between"}>
        <label htmlFor="icon">Show active icon</label>
        <Switch
          id="icon"
          checked={icon}
          onCheckedChange={(checked) => setIcon(checked)}
        />
      </div>
      <form action={updateSettingsWithArgs}>
        <Button type={"submit"}>
          {pending ? "Saving..." : "Save settings"}
        </Button>
      </form>
    </div>
  );
}
