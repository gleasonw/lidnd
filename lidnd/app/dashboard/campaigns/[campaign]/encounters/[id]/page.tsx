import { LidndAuth } from "@/app/authentication";
import EncounterPrep from "@/encounters/[id]/encounter-prep";

export default async function EncounterPage() {
  const user = await LidndAuth.getUser();
  if (!user) {
    console.error("No session found, layout should have redirected");
    return <div>User not logged in</div>;
  }

  return <EncounterPrep />;
}
