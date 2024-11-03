import { EncounterId } from "@/encounters/[encounter_index]/encounter-id";
import { EncounterUI } from "@/encounters/[encounter_index]/EncounterUiStore";
import { EncounterTopBar } from "@/encounters/[encounter_index]/encounter-top-bar";
import { isEncounterPathParams } from "@/server/utils";

export default async function EncounterLayout(props: {
  children: React.ReactNode;
  params: Promise<{ id: string; campaign_slug: string }>;
}) {
  const param = await props.params;
  if (!isEncounterPathParams(param)) {
    console.error("params object has missing fields");
    return;
  }
  return (
    <EncounterUI>
      <EncounterId encounterIndex={param.encounter_index}>
        <EncounterTopBar />
        <section className="flex flex-col overflow-y-auto max-h-full min-h-0 ">
          {props.children}
        </section>
      </EncounterId>
    </EncounterUI>
  );
}
