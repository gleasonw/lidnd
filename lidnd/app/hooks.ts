import { discordApi } from "@/utils/discord";
import { useQuery } from "@tanstack/react-query";
import { getCookie } from "cookies-next";

export function useUser() {
  const token = getCookie("discord_oauth_state");
  return useQuery({
    queryKey: ["user", token],
    queryFn: () => discordApi.getUser(token as string),
  });
}
