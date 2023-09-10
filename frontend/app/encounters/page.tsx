import apiURL from "@/app/apiURL";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LoadingButton } from "@/app/components/LoadingButton";
import Link from "next/link";

export default async function Encounters() {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;

  const response = await fetch(`${apiURL}/encounters`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (response.status === 401) {
    redirect("/");
  }
  const parsedResponse = await response.json();
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
    <div className="flex flex-col gap-10">
      <form action={createEncounter}>
        <LoadingButton type={"submit"}>Create encounter</LoadingButton>
      </form>
      {encounters &&
        encounters.map((encounter) => (
          <Link
            key={encounter.id}
            href={`/encounters/${encounter.id}`}
            className="p-5 border hover:bg-white transition-all"
          >
            {encounter.name} {encounter.id}
          </Link>
        ))}
    </div>
  );
}
