import { GroupSurpriseInput } from "@/app/campaigns/[campaign]/encounters/[id]/surprise/group-surprise-input";
import { Suspense } from "react";

export default function SurprisePage() {
  return (
    <Suspense>
      <GroupSurpriseInput />
    </Suspense>
  );
}
