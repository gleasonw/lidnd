# LiDnD Convex prototype

See [LIDND_PROTOTYPE_PLAN.md](../LIDND_PROTOTYPE_PLAN.md) for scope and milestones.

## Development

```
pnpm install
pnpm run dev     # Convex dev deployment + Vite
pnpm test        # convex-test + vitest
pnpm lint        # typecheck + eslint
```

### Sign-in

Discord is the only real sign-in. Create a Discord OAuth app with the redirect URL
`<VITE_CONVEX_SITE_URL>/api/auth/callback/discord`, then:

```
npx convex env set AUTH_DISCORD_ID <client id>
npx convex env set AUTH_DISCORD_SECRET <client secret>
```

For local testing without Discord, a dev deployment can enable a shared "Dev GM" user:

```
npx convex env set DEV_SIGN_IN true
```

This adds a "Sign in as dev user" button. Never set it on a production deployment.
