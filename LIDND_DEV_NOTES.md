# LiDnD developer notes

Companion to [LIDND_SPEC.md](LIDND_SPEC.md). See [LIDND_PROTOTYPE_PLAN.md](LIDND_PROTOTYPE_PLAN.md) for the current Convex prototype. The spec defines product behavior; this doc points at existing code that implements much of the game-system logic.

## Reusing the current app's business logic

The current app (`lidnd/`) keeps most encounter and participant rules in two utility modules. Ideally, reuse these directly, or extract them into a shared package with no app dependencies. At minimum, treat them as the reference implementation, and their tests as fixtures, for the rules in spec §11.

- `lidnd/utils/encounters.ts` exports `EncounterUtils`
- `lidnd/utils/participants.ts` exports `ParticipantUtils`
- Tests: `lidnd/app/[username]/[campaign_slug]/encounter/utils.spec.ts` cover turn order, overkill minions, group turn toggles, malice, and adding participants.

### What is already pure, and what isn't

The rule functions are mostly pure (input in, new value out, no I/O), but the modules are coupled to the current app:

- They import types from the tRPC router (`@/server/api/router`), the Drizzle schema (`@/server/db/schema`), and app route types.
- `encounters.ts` imports `appRoutes` and `LidndUser` and mixes routing and UI helpers with the rules.
- Both use `remeda`, and `encounters.ts` also uses `lodash`.

To reuse them, move the rule functions behind small structural input types (such as the existing `ChallengeRatingParticipant` and `CyclableEncounter`) and leave the app-specific helpers behind. Keep the rules **system-specific** (Draw Steel and 5e separately), and have prep and live combat call the same functions.

## Function map

| Spec rule | Current code | Reuse notes |
| --- | --- | --- |
| §11.1 Participant EV | `ParticipantUtils.challengeRating` | Infers minion count from current HP and rounds sets of four down. The spec uses planned squad sizes and rounds **up** per minion type (minions are bought four at a time). |
| §11.1 Roster EV | `EncounterUtils.totalCr` | Named "CR" but computes Draw Steel EV. |
| §11.1 Budget tiers | `EncounterUtils.findCRBudget` | Draw Steel branch matches except that allies don't add to encounter strength; the book counts each allied NPC as a hero. **Do not reuse the 5e branch**: it is a custom table, not the 2024 rules. |
| §11.1 Difficulty label | `EncounterUtils.difficultyForCR` | Treats total EV equal to `ES − E` as trivial and calls the top tier "Deadly"; the book says trivial is *less than* `ES − E` and the top tier is "Extreme". |
| §11.1 Target / remaining EV | `EncounterUtils.goalCr`, `EncounterUtils.remainingCr` | `goalCr` returns `"no-players"` with zero heroes. |
| §11.2 Run start | `EncounterUtils.start` | Sets round 1 and initial malice. |
| §11.2 Initial malice | `EncounterUtils.calculateInitialMalice` | Matches the spec. |
| §11.2 Round malice | `EncounterUtils.calculateMaliceForRound` | Omits session victories, which matches the spec: victories only count toward starting malice. The legacy "victories" test expects them in later rounds and should be dropped. |
| §11.2 Hero count | `EncounterUtils.alivePlayerCount` | Despite the name, returns roster count, which is what the spec wants. Tests about "dead players" describe HP-based behavior that the spec drops. |
| §11.2 Manual malice UI | `MaliceTracker.tsx` (encounter route) | UI reference only. |
| §11.3 Minion count | `ParticipantUtils.numberOfMinions` | Derives the count from the group's HP pool, which matches the book's shared Stamina pool during a run. Plans still need an explicit planned squad size. |
| §11.3 Overkill | `ParticipantUtils.updateMinionCount` | **Doesn't match the book.** `ceil(damage / HP)` over-kills (3 damage to a 5-Stamina squad kills one), and "minions in range" limits single-target kills, which the book doesn't. Use the shared-pool rules in spec §11.3. |
| §11.3 Acted markers / rounds | `EncounterUtils.toggleGroupTurn`, `moveToNextGroupTurnRound`, `participantHasPlayed` | Handles group markers, round advance, and single malice award. |
| §11.4 5e initiative order | `ParticipantUtils.sortLinearly` | Descending initiative; tie-break by creation time, then ID. |
| §11.4 5e turn cycling | `EncounterUtils.cycleNextTurn`, `cyclePreviousTurn`, `cycleTurn` | Wraps and changes rounds; skips defeated nonactive adversaries. |

## Known discrepancies to fix when porting

1. `calculateMaliceForRound` should only add session victories at the start of the combat.
2. Minion EV and count must come from stored planned/current counts, not HP.
3. 5e difficulty needs a new implementation from the 2024 rules; `findCRBudget`'s 5e branch is not a reference.
4. Update or drop tests that assume HP-based "alive hero" counting.

## UI components and styling

Use [shadcn/ui](https://ui.shadcn.com/) for components and [Tailwind CSS](https://tailwindcss.com/) for styling. The current app already uses both (`lidnd/components.json`, `lidnd/components/ui/`). Add shadcn components through its CLI so they live in the repo and can be edited, rather than wrapping them in another component library. Style with Tailwind utilities and shadcn's CSS variables for theme tokens instead of custom CSS files.
