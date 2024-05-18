import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCampaign } from "@/app/dashboard/actions";
import React from "react";
import { getSystems } from "@/server/api/utils";

export interface CreateCampaignButtonProps {
  trigger?: React.ReactNode;
}

export async function CreateCampaignButton(props: CreateCampaignButtonProps) {
  const { trigger } = props;
  const systems = await getSystems();
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form action={createCampaign} className="flex flex-col gap-5 w-full">
          <div className="flex gap-2 flex-col">
            <label>
              <span>Name</span>

              <Input type="text" name="name" />
            </label>
            <label>
              <span>Description</span>
              <Textarea name="description" />
            </label>
            <Select name="system_id">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a system" />
              </SelectTrigger>
              <SelectContent>
                {systems.map((system) => (
                  <SelectItem key={system.id} value={system.id}>
                    {system.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit">Create a new campaign</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
