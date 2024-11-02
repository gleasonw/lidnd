import { EncounterId } from "@/encounters/[encounter_index]/encounter-id";
import { EncounterUI } from "@/encounters/[encounter_index]/EncounterUiStore";
import { EncounterPrepBar } from "@/encounters/[encounter_index]/prep-bar";
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
        <EncounterPrepBar />
        <section className="flex flex-col overflow-y-auto h-full">
          {props.children}
        </section>
      </EncounterId>
    </EncounterUI>
  );
}
