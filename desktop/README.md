# LiDnD desktop

This is a new offline-first Electron app beside the legacy Next.js app in `../lidnd`. It uses a local PGlite database under Electron's user-data directory. Drizzle owns the schema and SQL migrations; `src/domain.ts` derives its row types from the Drizzle tables.

## Run

```bash
cd desktop
pnpm install
pnpm dev
```

`pnpm dev` starts Vite and Electron. Renderer edits update through HMR; main-process edits rebuild and restart Electron. Run `pnpm build` to type-check and build without opening a window, `pnpm test` for persistence and rules checks, and `pnpm smoke:ux` after building to walk through campaign, session, run, creature upload, and party creation in an isolated Electron profile. After a schema edit, run `pnpm db:generate` and commit the generated migration. The app applies committed migrations when it opens.

## Implemented so far

- Local campaigns, party membership, shared or campaign-only creatures, encounter plans, sessions, and separate run snapshots.
- Drizzle/PGlite persistence with a generated migration, narrow Electron IPC, and runtime input validation.
- Plan search and tags, notes, reminders, roster quantities, Draw Steel standard-adversary EV feedback, and run history.
- Basic live run controls for HP, temporary HP, effects, reminders, malice, rounds, and 5e initiative.
- Autosaved encounter plans and run notes, with queued local writes.
- App-managed PNG, JPEG, WebP, and GIF uploads for creature stat blocks, icons, and encounter references.
- shadcn/ui controls with a Tailwind based dark theme.

## Still to build from the spec

Legacy import, cloud save, full Draw Steel turn groups and minion rules, and verified 2024 D&D difficulty. The D&D difficulty display is explicitly pending. Current run controls are an initial scaffold and need the remaining system-specific behavior before the acceptance journeys are complete.
