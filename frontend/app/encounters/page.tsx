import apiURL from "@/app/apiURL";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LoadingButton } from "@/app/components/LoadingButton";

export default async function Encounters() {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;

  const response = await fetch(`${apiURL}/encounters`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const parsedResponse = await response.json();
  console.log(parsedResponse.detail);
  const encounters = parsedResponse.encounters;

  async function createEncounter() {
    "use server";
    const response = await fetch(`${apiURL}/encounters`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: "New Encounter",
        description: "",
      }),
    });
    const parsedResponse = await response.json();
    revalidatePath("/encounters");
    redirect(`/encounters/${parsedResponse.encounter.id}`);
  }

  return (
    <>
      <form action={createEncounter}>
        <LoadingButton type={"submit"}>Create encounter</LoadingButton>
      </form>
      {encounters &&
        encounters.map((encounter) => (
          <div key={encounter.id}>
            {encounter.name} {encounter.id}
          </div>
        ))}
    </>
  );
}
