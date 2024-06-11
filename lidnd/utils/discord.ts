export const discordApi = {
  getUser: async (token: string) => {
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
};
