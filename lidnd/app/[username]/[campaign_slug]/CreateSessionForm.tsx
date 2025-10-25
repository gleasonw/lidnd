"use client";

import { createSession } from "@/app/[username]/sessionActions";
import { Button } from "@/components/ui/button";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogOverlay,
} from "components/ui/dialog";
import { Plus } from "lucide-react";
import React from "react";

export function SessionCreateForm({
  campaignData,
}: {
  campaignData: { id: string; name: string; slug: string };
}) {
  const [dialogIsOpen, setDialogIsOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");

  return (
    <Dialog open={dialogIsOpen} onOpenChange={setDialogIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add session
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-screen overflow-auto sm:max-w-[1000px]">
        <DialogTitle>Create new session</DialogTitle>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await createSession({
              campaign_id: campaignData.id,
              name,
              description,
            });
            setDialogIsOpen(false);
            setName("");
            setDescription("");
          }}
        >
          <div className="space-y-2">
            <LidndTextInput
              type="text"
              variant="ghost"
              name="name"
              placeholder="Name"
              className="w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <LidndTextInput
              type="text"
              variant="ghost"
              name="description"
              placeholder="Description"
              className="w-full"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full">
            Create Session
          </Button>
        </form>
      </DialogContent>
      <DialogOverlay />
    </Dialog>
  );
}
