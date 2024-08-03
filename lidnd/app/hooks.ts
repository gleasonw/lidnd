import type { LidndUserName } from "@/app/authentication";
import { discordApi } from "@/utils/discord";
import { useQuery } from "@tanstack/react-query";
import { getCookie } from "cookies-next";
import { usePathname } from "next/navigation";

export function useDiscordUser() {
  const token = getCookie("discord_oauth_state");
  return useQuery({
    queryKey: ["user", token],
    queryFn: () => discordApi.getUser(token as string),
  });
}

// maybe just use the user object passed in from auth boundary
export function useUsernameFromUrl() {
  const path = usePathname();

  const userId = path.split("/")[1];

  if (userId === undefined) {
    throw new Error("Attempted to use userId but not found");
  }

  return userId as LidndUserName;
}
