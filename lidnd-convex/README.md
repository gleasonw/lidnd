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

For local development without Discord, enable anonymous developer sessions on
your personal Convex dev deployment:

```
npx convex env set DEV_SIGN_IN true
```

Running `pnpm run dev` adds a "Continue as local developer" button. Each new
sign-in creates a separate ordinary user with their own campaigns; the browser
keeps its session across reloads. Signing out or clearing browser storage means
the next developer sign-in creates a new user. Existing shared dev-user data is
not transferred to these new users.

The button is omitted from built/hosted clients. The backend provider is disabled
unless `DEV_SIGN_IN` is `true`; never set it on a production deployment.

Each developer should use their own Convex dev deployment. On first setup,
`npx convex dev` configures the deployment and writes its URLs to `.env.local`.
Complete the [Convex Auth setup](https://labs.convex.dev/auth/setup) to generate
the deployment's session signing keys, then set `DEV_SIGN_IN` as above. Discord
credentials are only needed if you also want to test Discord sign-in.

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
