import apiURL from "@/app/apiURL";
import { cookies } from "next/headers";

export default async function Encounters() {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;

  const response = await fetch(`${apiURL}/encounters?token=${token}`);
  const parsedResponse = await response.json();
  console.log(parsedResponse);
  const encounters = parsedResponse.encounters;
  if (encounters) {
    return encounters.map((encounter: any) => (
      <div key={encounter.id}>An encounter!</div>
    ));
  } else {
    return <div>No encounters yet</div>;
  }
}
