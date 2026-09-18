This is the LiDnD [Next.js](https://nextjs.org/) app.

## Getting started (dev/test mode - no AWS or Discord keys needed)

This is the fastest way to get a working local copy running: real Postgres
and an S3-compatible store both run in Docker, and login uses a seeded
dummy user instead of real Discord OAuth.

```bash
cp .env.development.example .env
pnpm install
pnpm dev:mock
```

That single command:

1. Starts Postgres and [MinIO](https://min.io/) (an S3-compatible store) via `docker-compose.yml`.
2. Pushes the current schema (`server/db/schema.ts`) to that Postgres instance with `drizzle-kit push`.
3. Seeds a fixed dummy user (see `seed-dev-user.ts`).
4. Starts `next dev`.

Open [http://localhost:3000/login](http://localhost:3000/login) and click
**"Log in as test user (dev mode)"**. Image/creature uploads work too - they
go to the local MinIO container instead of real S3.

Other useful commands:

- `pnpm dev:up` - just start the Postgres/MinIO containers.
- `pnpm dev:migrate` - push schema changes to whatever `DATABASE_URL` points at.
- `pnpm dev:seed` - (re-)seed the dummy user; safe to run repeatedly.
- `pnpm dev:down` - stop the containers (add `-v` to also wipe their data volumes).

### How the bypass works, and why it's safe

`app/api/dev-login/route.ts` skips the Discord OAuth round-trip and logs
in directly as the user seeded by `seed-dev-user.ts`, using the same
session-creation code path (`LidndAuth.createSession`) as the real
Discord callback.

It's gated by `isDevLoginEnabled()` in `server/auth/dev-user.ts`, which
requires **both**:

- `NODE_ENV !== "production"` (Next.js sets this automatically for
  `next build`/`next start`, regardless of what's in the environment), and
- an explicit `DEV_LOGIN_ENABLED=true` env var, which should never be set
  in any real deployment's environment config.

Either one being false is enough to disable it. When disabled, the route
returns a plain 404 rather than a 403, so it doesn't reveal it exists.
The "Log in as test user" button on the login page is hidden using the
same check, but that's just UI convenience - the route's own server-side
check is what actually protects it.

### Regular (production-like) setup

If you want to run against real Discord OAuth and real AWS S3 instead,
set these in `.env` and skip `dev:mock` (use `pnpm dev` directly against
your own Postgres instance):

```
DATABASE_URL=
CLIENT_ID=            # Discord OAuth app
CLIENT_SECRET=
AWS_BUCKET_NAME=
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

Leave `DEV_LOGIN_ENABLED` and `AWS_ENDPOINT_URL` unset in this mode.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
