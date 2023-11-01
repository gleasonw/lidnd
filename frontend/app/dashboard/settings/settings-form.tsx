"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Settings, updateDiscordSettings } from "@/app/dashboard/actions";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";

export function SettingsForm({
  initialSettings,
}: {
  initialSettings?: Settings;
}) {
  const [health, setHealth] = useState(initialSettings?.show_health ?? false);
  const [icon, setIcon] = useState(initialSettings?.show_icons ?? false);
  const [playerLevel, setPlayerLevel] = useState(
    initialSettings?.player_level ?? 1
  );
  const [averageTurnDuration, setAverageTurnDuration] = useState(
    initialSettings?.average_turn_duration ?? 120
  );

  const updateSettingsWithArgs = updateDiscordSettings.bind(null, {
    show_health: health,
    show_icons: icon,
    average_turn_duration: averageTurnDuration,
    player_level: playerLevel,
  });

  return (
    <div className={"flex flex-col gap-5 max-w-sm"}>
      <div className={"flex gap-5 justify-between"}>
        <label className="flex justify-between w-full">
          Show monster health
          <Switch
            id="health"
            checked={health}
            onCheckedChange={(checked) => setHealth(checked)}
          />
        </label>
      </div>
      <div className={"flex gap-5 justify-between"}>
        <label className="flex justify-between w-full">
          Show active icon
          <Switch
            id="icon"
            checked={icon}
            onCheckedChange={(checked) => setIcon(checked)}
          />
        </label>
      </div>
      <div className={"flex gap-5 justify-between"}>
        <label>
          Default average turn seconds
          <Input
            id="average_turn_duration"
            type="number"
            value={averageTurnDuration}
            onChange={(e) => setAverageTurnDuration(parseInt(e.target.value))}
          />
        </label>
      </div>
      <div className={"flex gap-5 justify-between"}>
        <label>
          Default player level
          <Input
            id="average_turn_duration"
            type="number"
            value={playerLevel}
            onChange={(e) => setPlayerLevel(parseInt(e.target.value))}
          />
        </label>
      </div>
      <form action={updateSettingsWithArgs}>
        <LoadingButton type={"submit"} className="w-32">
          Save settings
        </LoadingButton>
      </form>
    </div>
  );
}
