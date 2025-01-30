"use client";

import {
  useAddExistingToParty,
  useAddNewToParty,
  useCampaign,
  useRemoveFromParty,
  useUpdateCampaign,
} from "@/app/[username]/[campaign_slug]/campaign-hooks";
import {
  AllyCreatureUploadForm,
  PlayerCreatureUploadForm,
  useCreatureForm,
  usePlayerCreatureForm,
  type CreatureUpload,
  type PlayerUpload,
} from "@/app/[username]/[campaign_slug]/CreatureUploadForm";
import { useUIStore } from "@/app/UIStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddCreatureButton } from "@/encounters/add-creature-button";
import type { Creature } from "@/server/api/router";
import { api } from "@/trpc/react";
import { CreatureUtils } from "@/utils/creatures";
import { Plus, Smile, User, UserPlus } from "lucide-react";
import { observer } from "mobx-react-lite";
import Image from "next/image";
import React from "react";
import { useState } from "react";
import * as R from "remeda";
import { useDebouncedCallback } from "use-debounce";

export default function PartyPage() {
  const [campaign] = useCampaign();
  const { mutate: removeFromParty } = useRemoveFromParty(campaign);

  return (
    <div className="flex flex-col gap-5 w-[800px] mx-auto overflow-auto">
      {/* todo: make a table */}
      <Card className="p-5">
        <Tabs defaultValue="new">
          <span className="flex gap-1 flex-wrap pr-2">
            <TabsList>
              <TabsTrigger value="new">
                <Plus /> Add new creature
              </TabsTrigger>
              <TabsTrigger value="existing">
                <UserPlus /> Existing creatures
              </TabsTrigger>
            </TabsList>
          </span>
          <TabsContent value="new">
            <Tabs defaultValue="player">
              <TabsList>
                <TabsTrigger value="player" className="flex gap-3">
                  <User /> Player
                </TabsTrigger>
                <TabsTrigger value="npc" className="flex gap-3">
                  <Smile /> NPC
                </TabsTrigger>
              </TabsList>
              <TabsContent value="npc">
                <AddNpcToPartyForm />
              </TabsContent>
              <TabsContent value="player">
                <AddPlayerToPartyForm />
              </TabsContent>
            </Tabs>
          </TabsContent>
          <TabsContent value="existing">
            <ExistingCreaturesForPartyAdd campaignId={campaign.id} />
          </TabsContent>
        </Tabs>
      </Card>
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

function AddNpcToPartyForm() {
  const allyForm = useCreatureForm();
  const [campaign] = useCampaign();

  function onSubmitAlly(data: CreatureUpload) {
    const creatureValue = R.omit(data, ["iconImage", "statBlockImage"]);
    onPlayerUpload({
      campaign_id: campaign.id,
      creature: { ...creatureValue, is_player: false },
      hasIcon: data.iconImage !== undefined,
      hasStatBlock: data.statBlockImage !== undefined,
    });
  }

  const { mutate: onPlayerUpload, isPending } = useAddNewToParty({
    campaign,
    //@ts-expect-error - need to fix the types on the form... the playerupload object and the participant upload object differ slightly
    form: allyForm,
  });

  return (
    <AllyCreatureUploadForm
      form={allyForm}
      onSubmit={onSubmitAlly}
      isPending={isPending}
    />
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

function ExistingCreaturesForPartyAdd({ campaignId }: { campaignId: string }) {
  const [name, setName] = useState("");
  const { data: creatures } = api.getUserCreatures.useQuery({
    name,
  });
  const { mutate: addCreature } = useAddExistingToParty({ id: campaignId });
  const creaturesPlayersFirst = R.sort(creatures ?? [], (a, b) =>
    a.is_player ? -1 : b.is_player ? 1 : 0
  );
  return (
    <div className="flex flex-col gap-5">
      <Input
        placeholder="Search..."
        type="text"
        onChange={(e) => setName(e.target.value)}
        value={name}
      />
      <div className={"flex flex-col gap-2 h-96 overflow-auto"}>
        {creaturesPlayersFirst?.map((creature) => (
          <AddCreatureButton
            creature={creature}
            key={creature.id}
            onClick={() => addCreature({ creature, campaign_id: campaignId })}
          />
        ))}
      </div>
    </div>
  );
}
