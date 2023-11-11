import { GroupInitiativeInput } from "@/app/dashboard/encounters/[id]/roll/group-initiative-input";
import { Suspense } from "react";

export default function SurprisePage() {
  return (
    <Suspense>
      <GroupInitiativeInput />
    </Suspense>
  );
}
