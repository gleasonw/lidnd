import apiURL from "@/app/apiURL";
import { cookies } from "next/headers";

export default async function Encounters() {
  const cookieStore = cookies();
  console.log(cookieStore);
  const token = cookieStore.get("token")?.value;

  const response = await fetch(`${apiURL}/encounter/list/${token}`);
  const { encounters } = await response.json();
  if (encounters) {
    return encounters.map((encounter: any) => (
      <div key={encounter.id}>An encounter!</div>
    ));
  } else {
    return <div>No encounters yet</div>;
  }
}
