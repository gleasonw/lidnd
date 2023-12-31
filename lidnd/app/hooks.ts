import { useQuery } from "@tanstack/react-query";
import { getCookie } from "cookies-next";

export function useUser() {
  const token = getCookie("discord_oauth_state");
  return useQuery({
    queryKey: ["user", token],
    queryFn: async () => {
      const response = await fetch("https://discord.com/api/users/@me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 200) {
        return (await response.json()) as {
          id: string;
          username: string;
          avatar: string;
          discriminator: string;
        };
      } else {
        return null;
      }
    },
  });
}
