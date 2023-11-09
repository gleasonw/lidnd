/// <reference types="lucia" />
declare namespace Lucia {
  type Auth = import("@/server/api/auth/lucia.ts").Auth;
  type DatabaseUserAttributes = {
    username: string;
    avatar: string | null;
    discord_id: number;
  };
  type DatabaseSessionAttributes = {};
}
