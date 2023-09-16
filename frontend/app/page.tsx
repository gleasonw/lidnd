import { cookies } from "next/headers";

import { redirect } from "next/navigation";

export default async function Home() {
  const user = await verifyDiscordToken();
  if (user) {
    redirect("/encounters");
  }
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="flex flex-col">
        Login to Discord here:
        <a
          href={`https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&scope=identify&response_type=code`}
        >
          login
        </a>
      </div>
    </main>
  );
}

export async function verifyDiscordToken() {
  const cookieStore = cookies();
  const token = cookieStore.get("token");
  const response = await fetch("https://discord.com/api/users/@me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (response.status === 200) {
    return (await response.json()) as unknown;
  } else {
    return null;
  }
}
