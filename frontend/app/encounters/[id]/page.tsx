import apiURL from "@/app/apiURL";
import { LoadingButton } from "@/app/components/LoadingButton";
import CreatureAddForm from "@/app/encounters/[id]/CreatureAddForm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export async function addCreature({
  id,
  token,
  creatureData,
}: {
  id: string;
  token?: string;
  creatureData: {
    name: string;
    initiative: number;
    hitPoints?: number;
    maxHitPoints?: number;
    isPlayerCharacter?: boolean;
  };
}) {
  "use server";
  const response = await fetch(`${apiURL}/encounters/${id}/creatures`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(creatureData),
  });
  const parsedResponse = await response.json();
  revalidatePath(`/encounters/${id}`);
}

export default async function Encounter({
  params,
}: {
  params: { id: string };
}) {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;

  async function startEncounter() {
    "use server";
    await fetch(`${apiURL}/encounters/${params.id}/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  }

  const creaturesResponse = await fetch(
    `${apiURL}/encounters/${params.id}/creatures`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const { creatures } = await creaturesResponse.json();

  return (
    <>
      {creatures.map((creature) => (
        <div key={creature.id}>
          {creature.name} {creature.initiative}
        </div>
      ))}
      <CreatureAddForm addCreature={addCreature} />
      <form action={startEncounter}>
        <LoadingButton type={"submit"}>Start encounter</LoadingButton>
      </form>
    </>
  );
}
