"use client";

import { updateEncounterDescription } from "@/app/dashboard/actions";
import { Textarea, TextareaProps } from "@/components/ui/textarea";
import { Encounter } from "@/server/api/router";
import React from "react";
import { useDebouncedCallback } from "use-debounce";

export interface DescriptionTextProps extends TextareaProps {
  encounter: Encounter;
}

export function DescriptionTextArea(props: DescriptionTextProps) {
  const { encounter } = props;
  const [description, setDescription] = React.useState<string | undefined>(
    encounter.description ?? "",
  );
  const [status, setStatus] = React.useState<"idle" | "saving">("idle");

  const debouncedUpdate = useDebouncedCallback(async (description: string) => {
    if (!encounter) {
      return;
    }
    const formData = new FormData();
    formData.append("description", description);
    await updateEncounterDescription(encounter.id, formData);
    setStatus("idle");
  }, 500);

  return (
    <div>
      <span className="h-5 relative flex">
        <div
          data-saving={status === "saving"}
          className={
            "opacity-0 absolute top-0 transition-opacity data-[saving=true]:opacity-100"
          }
        >
          Saving...
        </div>
        <div
          className="opacity-100 absolute top-0 transition-opacity data-[saving=true]:opacity-0 flex items-center gap-2"
          data-saving={status === "saving"}
        >
          Saved
        </div>
      </span>
      <Textarea
        className="h-40"
        name="description"
        value={description}
        placeholder="Flow, terrain, monster strategy, etc..."
        onChange={(e) => {
          setStatus("saving");
          setDescription(e.target.value);
          debouncedUpdate(e.target.value);
        }}
      />
    </div>
  );
}
