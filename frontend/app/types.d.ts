/// <reference types="lucia" />
declare namespace Lucia {
  type Auth = import("./lucia.js").Auth;
  type DatabaseUserAttributes = {
    username: string;
    avatar: string | null;
  };
  type DatabaseSessionAttributes = {};
}
