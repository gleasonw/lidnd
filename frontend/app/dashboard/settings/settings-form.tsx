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
      <div className={"flex gap-5 justify-between"}>
        <label htmlFor="average_turn_duration">
          Default average turn seconds
        </label>
        <Input
          id="average_turn_duration"
          type="number"
          value={averageTurnDuration}
          onChange={(e) => setAverageTurnDuration(parseInt(e.target.value))}
        />
      </div>
      <div className={"flex gap-5 justify-between"}>
        <label htmlFor="average_turn_duration">Default player level</label>
        <Input
          id="average_turn_duration"
          type="number"
          value={playerLevel}
          onChange={(e) => setPlayerLevel(parseInt(e.target.value))}
        />
      </div>
      <form action={updateSettingsWithArgs}>
        <LoadingButton type={"submit"} className="w-32">
          Save settings
        </LoadingButton>
      </form>
    </div>
  );
}
