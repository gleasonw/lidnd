import apiURL from "@/app/apiURL";
import { LoadingButton } from "@/app/components/LoadingButton";
import CreatureAddForm from "@/app/encounters/[id]/CreatureAddForm";
import { getCreatures } from "@/app/encounters/data";
import { getGoogleDriveImageLink } from "@/app/encounters/utils";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";

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
    redirect(`/encounters/${params.id}/run`);
  }

  const { creatures } = await getCreatures(params.id);

  return (
    <>
      {creatures.map((creature) => (
        <div key={creature.id}>
          <div className="flex gap-5 flex-wrap items-center">
            {creature.name} {creature.max_hp}
            <Image
              src={getGoogleDriveImageLink(creature.icon)}
              alt={creature.name}
              width={80}
              height={80}
            />
          </div>
        </div>
      ))}
      <CreatureAddForm add={addCreature} />
      <form action={startEncounter}>
        <LoadingButton
          type={"submit"}
          className="w-full h-24 bg-green-400 hover:bg-green-700 transition-all"
        >
          Start encounter
        </LoadingButton>
      </form>
    </>
  );
}
