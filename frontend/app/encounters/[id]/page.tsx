import apiURL from "@/app/apiURL";
import { LoadingButton } from "@/app/components/LoadingButton";
import CreatureAddForm from "@/app/encounters/[id]/CreatureAddForm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import Image from "next/image";

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

  function getGoogleDriveImageLink(url: string) {
    const regex = /file\/d\/(.*?)\/view/;
    const match = url.match(regex);
    if (match && match[1]) {
      const id = match[1];
      return `https://drive.google.com/uc?export=view&id=${id}`;
    }
    return "";
  }

  return (
    <>
      {creatures.map((creature) => (
        <div key={creature.id}>
          <div className="flex gap-5 flex-wrap">
            {creature.name} {creature.initiative}
            <Image
              src={getGoogleDriveImageLink(creature.icon)}
              alt={creature.name}
              width={40}
              height={40}
            />
          </div>
        </div>
      ))}
      <CreatureAddForm add={addCreature} />
      <form action={startEncounter}>
        <LoadingButton type={"submit"}>Start encounter</LoadingButton>
      </form>
    </>
  );
}
