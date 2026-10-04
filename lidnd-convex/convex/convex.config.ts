import { defineApp } from "convex/server";
import { v } from "convex/values";

export default defineApp({
  env: {
    // Set to "true" on a dev deployment to enable separate anonymous
    // developer sessions without Discord. Never set it in production.
    DEV_SIGN_IN: v.optional(v.string()),
  },
});
