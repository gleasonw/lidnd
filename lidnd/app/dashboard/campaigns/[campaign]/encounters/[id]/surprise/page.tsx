import { GroupSurpriseInput } from "@/encounters/[id]/surprise/group-surprise-input";
import { Suspense } from "react";

export default function SurprisePage() {
  return (
    <Suspense>
      <GroupSurpriseInput />
    </Suspense>
  );
}
