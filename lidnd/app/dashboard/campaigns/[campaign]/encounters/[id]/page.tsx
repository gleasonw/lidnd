import { LidndAuth } from "@/app/authentication";
import { updateEncounterDescription } from "@/app/dashboard/actions";
import { DescriptionTextArea } from "@/encounters/[id]/debounce-text-area";
import EncounterPrep from "@/encounters/[id]/encounter-prep";
import { ServerEncounter } from "@/server/encounters";

export default async function EncounterPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await LidndAuth.getUser();
  if (!user) {
    console.error("No session found, layout should have redirected");
    return <div>User not logged in</div>;
  }

  return (
    <EncounterPrep notesInput={<EncounterDescriptionInput id={params.id} />} />
  );
}

async function EncounterDescriptionInput(props: { id: string }) {
  const { id } = props;

  const doUpdate = updateEncounterDescription.bind(null, id);

  const user = await LidndAuth.getUser();

  if (!user) {
    console.log("user not logged in");
    return <div>No session found.</div>;
  }

  const encounter = await ServerEncounter.encounterById(user.id, id);

  if (!encounter) {
    return <div>Encounter not found.</div>;
  }

  return (
    <form action={doUpdate}>
      <DescriptionTextArea encounter={encounter} />
    </form>
  );
}
