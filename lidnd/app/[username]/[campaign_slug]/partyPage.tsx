"use client";

import {
  useAddNewToParty,
  useCampaign,
  useRemoveFromParty,
  useUpdateCampaign,
} from "@/app/[username]/[campaign_slug]/campaign-hooks";
import {
  PlayerCreatureUploadForm,
  usePlayerCreatureForm,
  type PlayerUpload,
} from "@/app/[username]/[campaign_slug]/CreatureUploadForm";
import { useUIStore } from "@/app/UIStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Creature } from "@/server/api/router";
import { CreatureUtils } from "@/utils/creatures";
import { observer } from "mobx-react-lite";
import Image from "next/image";
import React from "react";
import * as R from "remeda";
import { useDebouncedCallback } from "use-debounce";

export function PartyPage() {
  const [campaign] = useCampaign();
  const { mutate: removeFromParty } = useRemoveFromParty(campaign);

  return (
    <div className="flex flex-col gap-5 w-[700px] mx-auto">
      {/* todo: make a table */}
      <div className="p-5">
        <AddPlayerToPartyForm />
      </div>
      <PartyLevelInput />
      <div className="flex gap-5 p-3">
        {campaign.campaignToPlayers.map((c) => (
          <Card
            key={c.id}
            className="flex gap-2 flex-col w-fit items-center p-3"
          >
            <CharacterIcon c={c.player} />
            <span className="text-xl font-bold">{c.player.name}</span>
            <Button
              variant="ghost"
              className="text-red-500"
              onClick={() => removeFromParty(c.player.id)}
            >
              Remove
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

const CharacterIcon = observer(function CharacterIcon({ c }: { c: Creature }) {
  const uiStore = useUIStore();
  const status = uiStore.getIconUploadStatus(c);
  const statBlock = (
    <Image
      src={CreatureUtils.awsURL(c, "icon")}
      width={c.icon_width}
      height={c.icon_height}
      className="w-32 h-32"
      alt="icon"
      onError={() =>
        console.log("error loading image... this should never happen")
      }
    />
  );
  switch (status) {
    case "pending":
      return <div>pending</div>;
    case "error":
      return <div>error</div>;
    case "idle":
      return statBlock;
    case "success":
      return statBlock;
    case undefined:
      return statBlock;
    default: {
      //@ts-expect-error - exhaustive check
      const _: never = status;
      throw new Error(`Unhandled case: ${status}`);
    }
  }
});

function PartyLevelInput() {
  const [campaign] = useCampaign();
  const { mutate: updateCampaign } = useUpdateCampaign(campaign);

  const [partyLevel, setPartyLevel] = React.useState(
    campaign?.party_level ?? 1
  );

  const handlePartyLevelChange = useDebouncedCallback((level: string) => {
    const stringAsInt = parseInt(level);
    if (!isNaN(stringAsInt)) {
      updateCampaign({
        ...campaign,
        party_level: Math.max(1, stringAsInt),
      });
    }
  });
  return (
    <label className="flex gap-2 items-center font-light whitespace-nowrap">
      Level
      <Input
        type="number"
        className="w-16"
        value={partyLevel}
        onChange={(e) => {
          setPartyLevel(Math.max(1, parseInt(e.target.value)));
          handlePartyLevelChange(e.target.value);
        }}
      />
    </label>
  );
}

function AddPlayerToPartyForm() {
  const [campaign] = useCampaign();
  const playerForm = usePlayerCreatureForm();

  function onSubmitPlayer(data: PlayerUpload) {
    const creatureValue = R.omit(data, ["iconImage"]);
    onPlayerUpload({
      campaign_id: campaign.id,
      creature: {
        ...creatureValue,
        is_player: true,
        max_hp: 1,
        challenge_rating: 0,
        type: "player",
      },
      hasIcon: data.iconImage !== undefined,
      hasStatBlock: false,
    });
  }

  const { mutate: onPlayerUpload, isPending } = useAddNewToParty({
    campaign,
    form: playerForm,
  });

  return (
    <PlayerCreatureUploadForm
      form={playerForm}
      onSubmit={onSubmitPlayer}
      isPending={isPending}
    />
  );
}
