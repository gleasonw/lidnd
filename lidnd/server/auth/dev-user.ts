// Shared by the dev-login route, the login page, and the seed script.
// isDevLoginEnabled() is the single gate that must hold before any
// bypass-related code path (route or UI) is allowed to act.

export const DEV_USER = {
  id: "dev-user-0000000001",
  username: "dev-user",
  avatar: null,
  discord_id: "0",
};

export function isDevLoginEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_LOGIN_ENABLED === "true"
  );
}
