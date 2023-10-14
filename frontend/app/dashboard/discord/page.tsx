import apiURL from "@/app/apiURL";
import { getDiscordSettings } from "@/app/dashboard/actions";
import { DiscordSettingsForm } from "@/app/dashboard/discord/settings-form";
import { cookies } from "next/headers";

export default async function DiscordPage() {
  const cookieStore = cookies();
  const token = cookieStore.get("token");
  console.log(token);

  const channelResponse = await fetch(`${apiURL}/api/discord-channel`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token?.value}`,
    },
  });

  const currentSettings = await getDiscordSettings();

  if (channelResponse.status !== 200) {
    return (
      <div>
        Looks like you have not activated the bot in a channel yet. Or, I broke
        something.{" "}
      </div>
    );
  }

  const channel = await channelResponse.json();

  return (
    <section
      className={" mx-auto max-w-screen-xl flex flex-col items-center gap-20"}
    >
      <h1 className={"text-lg"}>
        The LiDnD bot is tracking encounters in{" "}
        <span className={"font-bold"}>{channel.name}</span>, part of the{" "}
        <span className={"font-bold"}>{channel.guild}</span> conglomerate.
      </h1>
      <DiscordSettingsForm initialSettings={currentSettings} />
    </section>
  );
}
