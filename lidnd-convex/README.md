# Runsheet (Convex prototype)

See [LIDND_PROTOTYPE_PLAN.md](../LIDND_PROTOTYPE_PLAN.md) for scope and milestones.

## Development

```
pnpm install
pnpm run dev     # Convex dev deployment + Vite
pnpm test        # convex-test + vitest
pnpm lint        # typecheck + eslint
```

### Sign-in

Discord is the only real sign-in. Each environment uses its own Discord OAuth app
(dev and prod don't share one). Create an app with the redirect URL
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

## Deployments

| | Dev | Prod |
| --- | --- | --- |
| Convex deployment | `bold-elephant-805` (dev) | `proper-chinchilla-877` (prod) |
| Vercel project | `lidnd-convex-dev` | `runsheet-gm` |
| Frontend URL | https://lidnd-convex-dev.vercel.app | https://runsheet-gm.vercel.app |
| Discord OAuth app | dev app | prod app |
| `DEV_SIGN_IN` | `true` | unset |
| Backend deploys | `convex dev` | Vercel build on push to `prod` |
| Frontend deploys | Vercel build on push to `main`, or `vercel deploy --prod` | Vercel build on push to `prod` |

Each deployment's Discord credentials, `SITE_URL` (its frontend URL), and Convex
Auth signing keys (`JWT_PRIVATE_KEY`, `JWKS`) are Convex env vars. Use `--prod`
to read or change prod's, e.g. `npx convex env list --prod`.

### Production

Prod deploys only when you push to the `prod` branch. Day-to-day work goes on
`main`; to release a commit, push it to `prod`:

```sh
git push origin main:prod
```

The `runsheet-gm` Vercel project is connected to this GitHub repo with root
directory `lidnd-convex` and production branch `prod`. Its build command is
`pnpm test run && npx convex deploy --cmd 'pnpm run build'`: the tests run first,
then the Convex functions and schema deploy to prod, then the frontend builds
against them. If the tests or the Convex deploy fail (for example, a schema
change that doesn't match existing data), the build stops and nothing new is
published. To roll back, push an older commit to `prod` (this needs
`--force`), which redeploys the backend and frontend together. Don't use
Vercel's instant rollback or promote: they only change the frontend, and the
Convex deploy has already happened during the build.

`CONVEX_DEPLOY_KEY` is a prod deploy key, set in Vercel for the Production
environment only. Vercel's ignored-build-step setting skips every non-production
build, so branches and PRs don't get preview deployments. These settings live on
the Vercel project, not in `vercel.json`, which the dev project also uses.

Don't keep the prod deploy key in your shell profile. While it's set, every
`npx convex` command targets prod instead of your dev deployment.

### Dev

The Vercel project `lidnd-convex-dev` hosts the test frontend at
https://lidnd-convex-dev.vercel.app against the Convex dev deployment. Its
Production and Preview environments set `VITE_CONVEX_URL` to
`https://bold-elephant-805.ca-central-1.convex.cloud`. The dev deployment's
`SITE_URL` is the hosted dev frontend, so local Discord sign-in also returns there.

This project is also connected to this GitHub repo, so a push to `main` rebuilds
the dev frontend too. It uses the default build command (`pnpm run build` from
`vercel.json`), which builds only the frontend and never deploys Convex. Run
`convex dev` to bring the dev backend up to date with the pushed code.

To update the stable dev URL from your working tree, run from this directory:

```sh
vercel link --yes --project lidnd-convex-dev --scope gleasonws-projects
vercel deploy --prod
```

Here `--prod` updates the stable URL of the dev frontend project. The backend
continues to use the Convex dev deployment, updated separately by `convex dev`.
