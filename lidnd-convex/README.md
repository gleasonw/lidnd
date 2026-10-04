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

### Hosted dev client

The Vercel project `lidnd-convex-dev` hosts the test frontend at
https://lidnd-convex-dev.vercel.app and uses the existing Convex dev deployment.
Vercel's Production and Preview environments have `VITE_CONVEX_URL` set to
`https://bold-elephant-805.ca-central-1.convex.cloud`. Discord credentials and
session keys stay on Convex; its `SITE_URL` is the hosted frontend URL.
Local Discord sign-in therefore also returns to the hosted frontend.

To update the stable test URL, run from this directory:

```sh
vercel link --yes --project lidnd-convex-dev --scope gleasonws-projects
vercel deploy --prod
```

Here `--prod` updates the stable URL of the dev frontend project. The backend
continues to use the Convex dev deployment, updated separately by `convex dev`.
