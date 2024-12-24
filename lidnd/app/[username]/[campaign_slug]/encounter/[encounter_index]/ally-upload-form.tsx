import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { ImageUpload } from "../image-upload";
import { FileText, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import * as UploadHooks from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/encounter-upload-hooks";
import { useEncounter } from "./hooks";

export function AllyUploadForm() {
  const [role, setRole] = useState<"ally" | "player">("player");

  return (
    <>
      <RadioGroup value={role} onValueChange={(v) => setRole(v as any)}>
        <div className="flex gap-3 justify-start">
          <label>
            Ally
            <RadioGroupItem value="ally" />
          </label>
          <label>
            Player
            <RadioGroupItem value="player" />
          </label>
        </div>
      </RadioGroup>
      <FormForRole role={role} />
    </>
  );
}

function FormForRole({ role }: { role: "ally" | "player" }) {
  const { mutate: uploadCreature } = UploadHooks.useCreateCreatureInEncounter();
  const [encounter] = useEncounter();
  const [keyToResetImages, setKeyToResetImages] = useState(0);
  switch (role) {
    case "ally":
      return (
        <form
          className="flex flex-col gap-6 pt-3 w-full"
          onSubmit={(e) => {
            const form = e.target as HTMLFormElement;
            e.preventDefault();
            const data = new FormData(form);
            for (const [key, value] of data.entries()) {
              console.log(key, value);
            }
            form.reset();
            setKeyToResetImages(keyToResetImages + 1);

            //not sure this is the best way to do this
            data.append("encounter_id", encounter.id);
            data.append("is_ally", "true");
            data.append("is_player", "false");
            uploadCreature(data);
          }}
        >
          <LidndTextInput required placeholder="Name" name="name" />
          <ImageUpload
            dropContainerClassName="h-52"
            onUpload={() => {}}
            dropText="Drop a Statblock"
            dropIcon={<FileText />}
            fileInputProps={{ name: "stat_block_image" }}
            key={`stat block ${keyToResetImages}`}
          />
          <div className="flex gap-3">
            <Input type="number" required placeholder="HP" name="max_hp" />
            <Input
              type="number"
              placeholder="Challenge Rating"
              name="challenge_rating"
              required
            />
          </div>
          <ImageUpload
            onUpload={() => {}}
            dropText="Drop an Icon"
            dropIcon={<User />}
            fileInputProps={{ name: "icon_image" }}
            key={`icon ${keyToResetImages}`}
          />

          <Button type="submit">Add Ally</Button>
        </form>
      );
    case "player":
      return (
        <form className="flex flex-col gap-6 pt-3 w-full">
          <LidndTextInput required placeholder="Name" name="name" />
          <ImageUpload
            onUpload={() => {}}
            dropText="Drop an Icon"
            dropIcon={<User />}
            fileInputProps={{ name: "icon_image" }}
            key={keyToResetImages}
          />
          <Button type="submit">Add Player</Button>
        </form>
      );
    default: {
      const _: never = role;
      throw new Error("invalid role");
    }
  }
}
