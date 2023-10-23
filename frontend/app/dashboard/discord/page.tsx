import apiURL from "@/app/apiURL";
import { getDiscordSettings } from "@/app/dashboard/actions";
import { DiscordSettingsForm } from "@/app/dashboard/discord/settings-form";
import { Button } from "@/components/ui/button";
import { cookies } from "next/headers";
import Link from "next/link";

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
      <div className="flex items-center justify-center flex-col gap-10 text-lg">
        <span>Looks like you have not activated the bot in a channel yet.</span>

        <Link
          href={
            "https://discord.com/api/oauth2/authorize?client_id=1146486327072800768&permissions=124928&scope=bot"
          }
          target="_blank"
        >
          <Button>Invite the bot to your server</Button>
        </Link>

        <span className="flex items-center flex-wrap gap-2">
          If the bot is already in your server, type{" "}
          <div className="bg-gray-100 p-2 rounded-md shadow-md w-fit">
            <code className="text-sm font-mono text-gray-800 whitespace-pre-wrap block">
              /track
            </code>
          </div>{" "}
          in the channel you want encounters to be posted in.
        </span>
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
