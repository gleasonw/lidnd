/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
let privateKey: string;

beforeAll(async () => {
  const keys = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const bytes = new Uint8Array(
    await crypto.subtle.exportKey("pkcs8", keys.privateKey),
  );
  privateKey = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...bytes))}\n-----END PRIVATE KEY-----`;
});

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("JWT_PRIVATE_KEY", privateKey);
  vi.stubEnv("CONVEX_SITE_URL", "https://test.convex.site");
});

afterEach(() => vi.unstubAllEnvs());

test("developer sign-ins create separate users with isolated campaigns", async () => {
  vi.stubEnv("DEV_SIGN_IN", "true");
  const t = convexTest(schema, modules);
  async function signIn() {
    const result = await t.action(api.auth.signIn, { provider: "anonymous" });
    expect(result.tokens).not.toBeNull();
    const payload = JSON.parse(atob(result.tokens!.token.split(".")[1]));
    const refreshed = await t.action(api.auth.signIn, {
      refreshToken: result.tokens!.refreshToken,
    });
    expect(refreshed.tokens).not.toBeNull();
    const refreshedPayload = JSON.parse(
      atob(refreshed.tokens!.token.split(".")[1]),
    );
    expect(refreshedPayload.sub).toBe(payload.sub);
    return t.withIdentity({ subject: payload.sub });
  }
  const alice = await signIn();
  const bob = await signIn();
  const aliceUser = await alice.query(api.users.viewer);
  const bobUser = await bob.query(api.users.viewer);
  expect(aliceUser).toMatchObject({ name: "Local developer", isAnonymous: true });
  expect(bobUser?._id).not.toEqual(aliceUser?._id);

  const campaignId = await alice.mutation(api.campaigns.create, {
    name: "Local campaign",
    system: "drawSteel",
    partyLevel: 1,
  });
  expect(await alice.query(api.campaigns.list)).toHaveLength(1);
  expect(await bob.query(api.campaigns.list)).toEqual([]);
  expect(await bob.query(api.campaigns.get, { campaignId })).toBeNull();
  await expect(
    bob.mutation(api.campaigns.update, { campaignId, name: "Someone else's" }),
  ).rejects.toThrow("Campaign not found");
});

test("anonymous sign-in is unavailable without the deployment opt-in", async () => {
  vi.stubEnv("DEV_SIGN_IN", "false");
  const t = convexTest(schema, modules);
  expect(await t.query(api.users.devSignInEnabled)).toBe(false);
  await expect(
    t.action(api.auth.signIn, { provider: "anonymous" }),
  ).rejects.toThrow();
});

test("the shared developer login is no longer available", async () => {
  vi.stubEnv("DEV_SIGN_IN", "true");
  const t = convexTest(schema, modules);
  await expect(t.action(api.auth.signIn, { provider: "dev" })).rejects.toThrow();
});
