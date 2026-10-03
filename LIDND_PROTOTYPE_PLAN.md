# LiDnD Convex prototype plan

Companion to [LIDND_SPEC.md](LIDND_SPEC.md) and [LIDND_DEV_NOTES.md](LIDND_DEV_NOTES.md).

## Goal

Build the core prep-and-combat loop on idiomatic Convex to learn whether it is a good foundation for LiDnD: how naturally the data model fits, how combat feels with Convex's reactivity and optimistic updates, and how much of the current app's rule code carries over.

**Offline support is out of scope for this prototype.** The app assumes a connection, and Convex is the source of truth. §4 of the spec is deferred, not dropped; see "Keeping offline possible" below.

## Approach

- A React web app with Vite, using `convex/react` (`useQuery`, `useMutation`), run in a laptop browser. Packaging as a desktop app is deferred.
- shadcn/ui components and Tailwind CSS for styling, per the dev notes.
- Convex schema with validators and indexes in `convex/schema.ts`. Public queries and mutations for the UI, internal functions for shared server logic.
- Convex Auth with the Discord provider. Every function checks that the user owns the data it touches through one shared helper.
- Convex file storage for icons, stat blocks, and reference images: upload URLs from a mutation, `storageId` stored on the document, URLs resolved in queries.
- Game rules in a plain TypeScript `rules/` module with no Convex or React imports, ported from `EncounterUtils` and `ParticipantUtils` (see the dev notes). Mutations call the rules so the server is authoritative. The client calls the same rules for prep display and optimistic updates.
- New code lives in its own directory, separate from `lidnd/` and `desktop/`.

## Data model sketch

| Table | Notes |
| --- | --- |
| `campaigns` | Owner, name, system (`drawSteel` \| `dnd5e`), party level. |
| `creatures` | Owner, system, optional `campaignId` (campaign-only), kind (hero/adversary), name, EV or CR, max HP, minion flag and per-minion HP, icon and stat-block `storageId`s. |
| `plans` | Campaign, name, Markdown notes, target difficulty. |
| `planParticipants` | Plan, creature, count or planned minion count, optional initiative group. |
| `turnGroups` | Plan, name, color. Draw Steel initiative groups (the code keeps the `turnGroups` name). |
| `tags`, `planTags` | Reusable per campaign. |
| `planImages` | Plan, `storageId`, kind (reference/stat block), order. |
| `reminders` | Plan, text, round or "every round". |
| `sessions` | Campaign, name, start/end time, victories (Draw Steel). |
| `runs` | Plan, session, start/end time, round, malice, current turn, status. |
| `runParticipants` | Run, snapshot of creature name and game values, HP, temp HP, minion count, initiative, acted marker, initiative group. |
| `runEffects` | Run participant, name, duration note, optional save-ends DC. |
| `runReminders` | Run, copied from the plan, dismissed state. |
| `runActions` | Undo log; see below. |

Starting a run copies the plan's roster, initiative groups, and reminders into run tables in one mutation, which satisfies "run changes never touch the plan".

## Prototype-specific decisions

- **Combat mutations express intent:** `applyDamage(runParticipantId, amount)`, `killMinions(...)`, `toggleActed(...)`, `nextTurn(runId)`, not generic `setHp` or `patchRun`. This keeps rules on the server, makes undo entries meaningful, and maps cleanly to a queue of offline edits later.
- **Undo:** each combat mutation writes a `runActions` row with the action and the prior values of the documents it changed. `undo(runId)` restores the latest entry and marks it undone, and `redo` reapplies it. Any new action clears the redo entries. Because it's stored in Convex, undo history survives a reload.
- **Deletion guards:** delete mutations for plans, creatures, and sessions check for referencing runs inside the same transaction and refuse with a message naming the runs.
- **Optimistic updates** on high-frequency combat actions (damage, acted markers, turn advance) so the combat screen feels instant. Measure how it feels without them first.

## Milestones

1. **Skeleton:** Vite + React + Convex project, Discord sign-in, campaigns CRUD, ownership helper.
2. **Rules module:** port Draw Steel EV, budget, malice, minion overkill, acted-marker round logic, and 5e initiative order and turn cycling into `rules/`, with the fixes listed in the dev notes. Port the existing `utils.spec.ts` cases to tests.
3. **Prep:** party, creatures with image upload (picker, paste, drag-and-drop), plans with roster, initiative groups, tags, search, notes, images, reminders, and live difficulty feedback.
4. **Sessions and runs:** start and end sessions, victories, start a run from a plan, run history per plan and session.
5. **Draw Steel combat:** HP and temp HP, minions, effects, acted markers, rounds, malice, reminders, undo/redo.
6. **5e combat:** initiative entry, turn order, next/previous turn. Difficulty shows a "not yet defined" placeholder until the 2024 rules are specified.

## Out of scope

- Offline use, local persistence, the edit queue, and conflict preservation (spec §4 and most of §5).
- Linking local data to an account, and local-only use without sign-in.
- Importing data from the current app.
- D&D 5e 2024 difficulty math.
- Desktop packaging and visual polish beyond a usable, dense layout.

## Questions the prototype should answer

1. Does the Convex data model handle runs (snapshot copies, undo log, deletion guards) without awkward workarounds?
2. Is combat responsive enough with plain mutations, and how much optimistic-update code is needed where it isn't?
3. Can the rule functions be shared cleanly between Convex functions and the client?
4. Do Convex file storage and Discord sign-in work smoothly for image-heavy prep?
5. What would offline support cost on top of this? Estimate how much would need to change to add a local store, an edit queue, and local image copies (PowerSync's Convex connector or a custom layer), using what was learned here.

## Keeping offline possible

Avoid choices that would make the later offline layer harder:

- Keep game rules pure and usable on the client, not only inside Convex functions.
- Use intent-based mutations, as above, rather than patching whole documents.
- Avoid server-only derived state the client can't recompute; store inputs, such as the planned minion count, and compute display values with the rules.
- Keep timestamps as recorded start/end times rather than server-side timers.
