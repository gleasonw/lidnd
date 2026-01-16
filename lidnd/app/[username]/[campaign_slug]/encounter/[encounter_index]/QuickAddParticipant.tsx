"use client";

import { useState } from "react";
import { LidndPopover } from "@/encounters/base-popover";
import { ExistingCreatureAdd } from "@/encounters/[encounter_index]/ExistingCreatureAdd";

type QuickAddParticipantsButtonProps = {
  encounterId: string;
  campaignId: string;
  className?: string;
  trigger: React.ReactNode;
};

export function QuickAddParticipantsButton({
  trigger,
}: QuickAddParticipantsButtonProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <LidndPopover
      className="w-80 p-0"
      open={isPopoverOpen}
      onOpenChange={setIsPopoverOpen}
      trigger={trigger}
    >
      <ExistingCreatureAdd />
    </LidndPopover>
  );
}
