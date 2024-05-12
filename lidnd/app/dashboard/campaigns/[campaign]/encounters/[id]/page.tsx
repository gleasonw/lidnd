import { updateEncounterDescription } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DescriptionTextArea } from "@/encounters/[id]/debounce-text-area";
import EncounterPrep from "@/encounters/[id]/encounter-prep";
import { getPageSession, getUserEncounter } from "@/server/api/utils";
import { NextResponse } from "next/server";

export default function EncounterPage({ params }: { params: { id: string } }) {
  return (
    <EncounterPrep notesInput={<EncounterDescriptionInput id={params.id} />} />
  );
}

async function EncounterDescriptionInput(props: { id: string }) {
  const { id } = props;

  const doUpdate = updateEncounterDescription.bind(null, id);

  const session = await getPageSession();

  if (!session) {
    console.log("user not logged in");
    return <div>No session found.</div>;
  }

  const user = session.user;

  const encounter = await getUserEncounter(user.userId, id);

  return (
    <form action={doUpdate}>
      <DescriptionTextArea encounter={encounter} />
    </form>
  );
}
