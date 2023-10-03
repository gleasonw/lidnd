import apiURL from "@/app/apiURL";
import { Switch } from "@/components/ui/switch";
import { cookies } from "next/headers";

export default async function DiscordPaeg() {
  const cookieStore = cookies();
  const token = cookieStore.get("token");
  console.log(token);

  const channelResponse = await fetch(`${apiURL}/api/discord-channel`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token?.value}`,
    },
  });

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

      <div className={"flex flex-col gap-5 max-w-sm"}>
        <div className={"flex gap-5 justify-between"}>
          <label htmlFor="health">Show monster health</label>
          <Switch id="health" />
        </div>
        <div className={"flex gap-5 justify-between"}>
          <label htmlFor="icon">Show active icon</label>
          <Switch id="icon" />
        </div>
      </div>
    </section>
  );
}
