# LiDnD desktop product spec

Status: product draft; unresolved decisions are listed in §7  
First platform: Linux  
Direction: new application built from this spec, with freedom to redesign the UX

## 1. Product goal

LiDnD is a game-master desktop app for preparing reusable encounters and running them in **Draw Steel** and **D&D 5e (2024 rules)**. A game master can build an encounter once, run it in multiple sessions, and retain each run's history without resetting or changing the plan.

The app works locally without a network connection. Optional cloud save lets the same user continue on another machine. Live combat has **one editor**. Two game masters might occasionally prepare the same encounter, but simultaneous collaboration is not part of the initial product.

Electron is acceptable. The product need is access to the user's files and smooth image drag-and-drop, not OS-native widgets. PGlite is the preferred local database, PostgreSQL the preferred cloud store, and Electric a candidate for cloud-to-device updates. These are implementation preferences, not user-facing features.

## 2. Core concepts

| Concept | Purpose |
| --- | --- |
| Campaign | Holds a game system, party, sessions, and encounter plans. |
| Creature | Player character or adversary with an icon and optional stat-block image. Reusable across campaigns by default, with an option to limit it to one campaign. |
| Encounter plan | Reusable preparation: name, roster, target difficulty, notes, images, reminders, and tags. Draw Steel plans may include turn groups. |
| Session | A named period of play with start/end time and encounter runs. Draw Steel sessions also track victories. |
| Encounter run | One playthrough of a plan, linked to a session, with its own combat state and result. |

## 3. Required workflows

### 3.1 Campaign and party setup

- Create and open campaigns for Draw Steel or D&D 5e.
- Set the party's level and roster of player characters. Show party size and names where needed during prep and combat.
- Create adversaries by manually entering the values needed for encounter difficulty and combat: name, EV for Draw Steel or CR for D&D 5e, maximum HP, relevant type, icon, and optional stat-block image. Keep the image visible while entering or correcting those values.
- Reuse a creature in other campaigns of the same game system by default. Allow a creature to be kept within one campaign.
- Edits to a creature update plans that reference it and future runs. Existing run records retain the creature name and game values they started with.
- **Do not track player-character HP.**

### 3.2 Encounter preparation

- Create, edit, and delete an encounter plan in a campaign. Keep it available after every run.
- Search plans by name and filter by reusable tags. Create, attach, and remove tags.
- Build a roster from party members and adversaries, with multiple instances of the same adversary where needed.
- Set a target difficulty and show the current difficulty and remaining or exceeded EV/CR budget. Calculation uses the plan's roster and party. Exact formulas must be defined and verified for each game system before implementation.
- Write encounter notes in Markdown, attach reference images and stat-block images alongside the notes, and add reminders for a chosen round or every round.
- Import images using a file picker, paste, or dragging a file from the desktop. Copy imported files into app-managed storage so moving the source file does not break the plan. Preview images before attaching them.
- Present notes, reference images, and many stat blocks in a **dense but readable workspace** that minimizes wasted space. The precise arrangement is a UX decision; resizable custom columns are not a product requirement.
- For Draw Steel, arrange adversaries into named turn groups.
- Start a new run from the same plan any number of times. Each run begins with a fresh copy of the planned roster and reminders. Previous runs remain separate and reviewable.
- Editing the plan affects future runs. Changes made during a run affect that run only; the user edits the plan separately to change future runs.

### 3.3 Sessions and run history

- Start and end a named session. Show its elapsed time while active.
- In Draw Steel, track session victories, allowing increases and decreases down to zero. Offer the previous Draw Steel session's final count when starting a new session.
- Associate every encounter run directly with a session. Starting a run without an active session prompts the user to start one.
- Show a session's runs and a plan's run history. A completed run shows its start/end time, duration, and final combat state. An unfinished run can be resumed after restarting the app.

### 3.4 Live combat shared by both systems

- Start a run from a plan and show the current round, elapsed time, participant roster, notes, reminders, and stat-block/reference images.
- Track adversary and ally HP, including temporary HP. Enter damage and healing and show current and maximum HP. Player-character HP remains outside the app.
- Add and remove participants during a run without changing the reusable plan.
- Apply and remove status effects and show them on participants. Enter a free-text name and duration note when applying an effect. In D&D 5e, also allow a save-ends DC. Removal is manual; the app does not interpret the duration note or automatically expire effects. A built-in effect catalog is unnecessary.
- Show reminders when their round condition is met; allow the game master to dismiss them.
- End a run without deleting it or its plan. Keep the final state for review. Run history is a summary, not an event-by-event replay.

### 3.5 Draw Steel combat

- Track malice and allow direct adjustments. Initialize and advance it according to verified Draw Steel rules, taking party and session victories into account where appropriate.
- Show heroes, individual adversaries, and adversary turn groups. Mark each as having acted this round and allow corrections.
- Advance rounds and reset acted markers. Make the current turn or group clear.
- Track minion count and apply damage using the correct Draw Steel minion and overkill rules.

### 3.6 D&D 5e combat

- Enter or correct initiative before and during combat.
- Show participants in initiative order, identify the active turn, and move to the next or previous turn and round.
- Calculate encounter difficulty using verified D&D 5e 2024 rules rather than Draw Steel EV rules. The Draw Steel minion and overkill workflow is not part of 5e's initial scope.

## 4. Local data and cloud save

- All required workflows work offline. A saved edit and active combat state survive app restart.
- Users can opt into an account to save their data remotely and continue on another Linux machine. Offer Discord sign-in for the cloud account; local use needs no sign-in. Discord is an identity provider only. The expected pattern is **switching machines between sessions**, not editing one live run on two machines.
- Show whether local changes are saved and whether they have reached the cloud. Retry pending uploads after reconnecting.
- Merge independent changes automatically. If two offline edits to the same value cannot be combined without guessing, preserve both versions and let the user recover them. No combat state may be silently overwritten.
- Sync image files as well as their metadata. Cloud save is incomplete if a plan appears on another machine without its images.
- Linking local data to an account keeps both the local and remote data. Independent items are combined; an ambiguous duplicate is preserved for review.
- Import existing LiDnD data in the first release: campaigns, parties, creatures, sessions, encounters, notes, and image assets. Convert an old prepared encounter into a reusable plan and any started combat into one run, resumable if still active. Preserve note text and attached/embedded images when converting old rich text to Markdown; small formatting differences are acceptable. A one-time export/import path is sufficient; ongoing compatibility with the old app is not required.

## 5. Desktop and quality requirements

- Support normal Linux desktop window resizing, keyboard navigation, file selection, image paste, and image drag-and-drop.
- Keep the primary combat controls visible and responsive on an ordinary laptop screen, even with many stat blocks open.
- Give controls readable labels and visible keyboard focus. Color alone must not carry turn, difficulty, or health meaning.
- Persist combat edits promptly and recover cleanly after a crash or network outage.
- Present file access through a narrow desktop API rather than granting arbitrary filesystem access to web content.

## 6. Intentional scope limits

- No Discord bot, server integration, or Discord-specific game features. Discord sign-in for cloud save remains in scope.
- No player-character HP, dice roller, rules compendium, or public player/observer view.
- No requirement to reproduce the old web app's pages, custom columns, drag handles, keyboard shortcuts, or settings.
- No simultaneous editing of a live encounter. Shared encounter prep and real-time co-editing can be considered later if the rare two-GM case becomes important.
- No automatic merge of ambiguous concurrent combat edits. This product assumes one live editor.
- No event-by-event combat replay or generic plugin framework for more game systems.
- No automatic extraction of creature values from stat-block images in the initial product. A later assisted-entry flow could suggest fields from an image, with the game master reviewing every value before saving.
- No ongoing compatibility or two-way sync with the old LiDnD app after its data is imported.

## 7. Implementation checks

These checks must be resolved while designing the data model and game-rule calculations. They do not add more product features.

| Decision | Current lean |
| --- | --- |
| Creature scope | Reusable across campaigns of the same system by default, with a campaign-only option. Existing runs keep snapshots of relevant creature data. |
| Notes | Markdown with separately attached images. Verify conversion of old rich-text note content and embedded images. |
| Status effects | Free-text name and duration note, plus optional save-ends DC in D&D 5e; manual removal. No built-in catalog. |
| Difficulty and malice rules | Use the Draw Steel behavior specified in §10. Define D&D 5e 2024 encounter math before implementation; the old 5e calculation is not the 2024 rule. |
| Imported 5e encounters | Recalculate editable plans with 2024 difficulty rules; preserve the historical state of completed runs. Clearly mark any changed difficulty label after import. |
| Account attachment | Combine independent local and cloud items; preserve ambiguous duplicates for review. Verify this with two existing data sets. |
| Legacy data import | Choose an export format and verify conversion of old rich text, S3 images, and the current encounter state. Keep it one-time. |

## 8. Acceptance journeys

1. **Prepare offline:** create a campaign, party, adversaries, and a searchable, tagged encounter plan with difficulty feedback, notes, images, and reminders; restart the app and find them intact.
2. **Run and reuse:** start a Draw Steel session, run an encounter, track turns, HP, effects, minions, malice, victories, and reminders; end it, then run the same plan again with fresh combat state and both runs in history.
3. **D&D 5e:** build a 5e plan, review its CR difficulty, set initiative, advance and correct turns, then end the run.
4. **Switch machines:** finish on one machine, sync, open the same campaign on another, work offline, reconnect, and see the update on both machines with images present.
5. **Import old data:** export from the current app, import into the new app, and verify campaigns, parties, creatures, images, notes, sessions, and completed or active encounters. Old encounter data appears as a plan plus a run when applicable; an active run remains resumable.

## 9. Technical note, separate from product scope

Current Electric Sync streams PostgreSQL changes into a local client, including PGlite. It does not provide the device-to-PostgreSQL write path. An implementation using it needs a durable local write queue, an authenticated write API, retries, acknowledgments, and conflict handling. Image files need their own storage and transfer path. Prototype the complete offline-edit/reconnect/cross-machine journey before committing to this stack. See [Electric's writes guide](https://electric.ax/docs/sync/guides/writes), [PGlite](https://electric.ax/sync/pglite), and [Electron's security guidance](https://www.electronjs.org/docs/latest/tutorial/security).

## 10. Game-system calculations and legacy code map

Port the old app's business logic where it matches the intended behavior. Use the functions below as implementation references and test fixtures. Resolve the documented discrepancies before porting those calculations: the missing victory term in later-round malice, minion EV derived from combat HP, and the old 5e difficulty table. Put the resulting calculations in small, pure, system-specific functions so prep and live combat call the same rules. The new app need not preserve legacy API names or data structures.

### 10.1 Draw Steel encounter value (EV)

- Each standard adversary contributes its entered EV. Allies and heroes contribute zero to the opposing roster's EV. The old calculation is `ParticipantUtils.challengeRating` summed by `EncounterUtils.totalCr`, despite the CR names.
- The current app treats **four minions as one creature's entered EV**: `floor(plannedMinionCount / 4) × minionEV`. The old `challengeRating` infers minion count from *current HP*, so the displayed EV can drop during combat. The new app stores the planned minion count explicitly and calculates prep EV from that count; damage during a run does not rewrite the plan's difficulty.
- Let `H` be hero count, `V` be session victories (zero if no active session), and `E(level)` be EV per hero from the table below. Effective hero count is `H + floor(V / 2)`. Base budget `B = E(level) × effectiveHeroCount`. Trivial ceiling is `B − E`; easy ceiling is `B`; standard ceiling is `B + E`; hard ceiling is `B + 3E`. Above hard is deadly. With zero heroes, show “add heroes” rather than a difficulty label. Source: `EncounterUtils.findCRBudget`.
- Boundary behavior in the old app: total EV `≤ trivial ceiling` is Trivial; `< easy ceiling` is Easy; `≤ standard ceiling` is Standard; `≤ hard ceiling` is Hard; anything higher is Deadly. Target budget is the selected easy, standard, or hard ceiling; remaining EV is target minus planned roster EV, and can be negative. Source: `difficultyForCR`, `goalCr`, `remainingCr`.

| Draw Steel hero level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `E(level)` | 6 | 8 | 10 | 12 | 14 | 16 | 18 | 20 | 22 | 24 |

### 10.2 Draw Steel malice and victories

- At run start, set round to 1 and malice to `heroCount + sessionVictories + 1`. At the start of each later round `R`, add `heroCount + sessionVictories + R` to current malice. Count heroes by roster membership because LiDnD does not track their HP. Do not award malice again when correcting an acted marker inside the same round. Allow manual malice adjustments, with a floor of zero. Source: `EncounterUtils.start`, `calculateInitialMalice`, `calculateMaliceForRound`, `toggleGroupTurn`, and `MaliceTracker`.
- Victories are a nonnegative, manually edited **Draw Steel session** value. When starting a session, offer the previous session's final count as the initial value. Use the current session value when preparing or starting a run; a later victory edit affects future round awards and prep budget, never retroactively recalculates malice already awarded.
- **Legacy discrepancy:** `calculateMaliceForRound` currently omits victories even though its `gameSession` argument, the UI tooltip, and a test expect them. The new rule above includes victories on every round. Several old tests describe “alive heroes” by HP, but the actual `alivePlayerCount` returns roster count; the new rule uses roster count.

### 10.3 Draw Steel minion damage and turns

- Represent a minion group with an explicit nonnegative current count, planned count, and HP **per minion**. The old app defaults a new group to four minions and sometimes encodes count as `group HP ÷ per-minion HP` (`ParticipantUtils.numberOfMinions`); the new app should not need that encoding.
- Current legacy overkill workflow asks for damage `D` and the number of **additional** minions in range `A`. For positive damage, casualties are `min(currentCount, A + 1, ceil(D / HPperMinion))`; for zero or negative damage, casualties are zero. Apply casualties to the group's count. Source: `ParticipantUtils.updateMinionCount` and `updateEncounterMinionParticipant`. This is a description of the app's current calculation; verify it against the intended Draw Steel rule before implementing.
- Draw Steel uses acted markers on heroes, individual adversaries, and turn groups. Marking the final outstanding turn advances the round, clears all acted markers, and awards malice once. A member of a turn group uses its group's marker. Source: `EncounterUtils.toggleGroupTurn`, `moveToNextGroupTurnRound`, `participantHasPlayed`.

### 10.4 D&D 5e and other system behavior

- D&D 5e uses descending initiative order, with creation time and ID as stable tie breakers. The current participant is explicit; next/previous wraps through eligible participants and changes the round on wrap. The old app skips defeated nonactive adversaries. Source: `ParticipantUtils.sortLinearly`, `EncounterUtils.cycleNextTurn`, `cyclePreviousTurn`, `cycleTurn`.
- The old 5e budget in `EncounterUtils.findCRBudget` is a custom per-level CR table with ally weighting, and its own comment says it is not proper 5e support. **Do not use it as the 2024 difficulty formula.** The 2024 encounter-budget rules, monster contribution, and boundary labels still need an explicit design decision and test examples before 5e difficulty can be implemented.
- Both systems alert reminders on a selected round or every round (legacy `alert_after_round = 0` means every round). Effects are manually applied and removed. The old schema's save-ends DC is retained for 5e only; duration remains free text in both systems.

### 10.5 Rules still to confirm

1. The old minion EV formula gives a partial group of one to three minions zero EV and counts five to seven as only one full group. Confirm whether to keep that exact rounding for encounter prep.
2. Verify the old overkill casualty formula against the intended Draw Steel rules; keep the simple manual damage and in-range input unless the rule requires another value.
3. Specify D&D 5e 2024 difficulty from an identified rules source. The old CR thresholds must not silently become the new rules.
