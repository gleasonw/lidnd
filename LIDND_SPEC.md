# LiDnD product spec

Status: product draft. Open decisions are listed in §9.  
Developer notes: [LIDND_DEV_NOTES.md](LIDND_DEV_NOTES.md) maps the rules in §11 to the current app's code.

## 1. Product goal

LiDnD is a game-master tool for preparing reusable encounters and running them in **Draw Steel** and **D&D 5e (2024 rules)**. A game master can build an encounter once, run it in multiple sessions, and retain each run's history without resetting or changing the plan.

LiDnD is **offline-first**: every workflow works without a network connection, and the user's own device is the primary home of their data. Optional cloud save lets the same user continue on another device. Live combat has **one editor**. Two game masters might occasionally prepare the same encounter, but simultaneous collaboration is not part of the initial product.

The target device is a **laptop**: keyboard, trackpad or mouse, and a screen the game master runs the whole session on. Tablets and phones are not design targets.

## 2. Core concepts

| Concept | Purpose |
| --- | --- |
| Campaign | Holds a game system, party, sessions, and encounter plans. |
| Creature | Player character (hero) or adversary, with an icon. Adversaries always have a stat-block image; heroes don't have one. Adversaries are reusable across campaigns by default, with an option to limit one to a campaign. |
| Encounter plan | Reusable preparation: name, roster, target difficulty, notes, images, reminders, and tags. Draw Steel plans may include initiative groups. |
| Session | A named period of play with start/end time and encounter runs. Draw Steel sessions also track victories. |
| Encounter run | One playthrough of a plan, linked to a session, with its own combat state and result. |

## 3. Required workflows

### 3.1 Campaign and party setup

- Create and open campaigns for Draw Steel or D&D 5e.
- Set the party's level and roster of player characters. Show party size and names where needed during prep and combat.
- Create adversaries by manually entering the values needed for encounter difficulty and combat: name, EV for Draw Steel or CR for D&D 5e, maximum HP, relevant type, icon, and a **required** stat-block image. Keep the image visible while entering or correcting those values. An adversary's stat block can be replaced but not removed.
- Heroes have a name and optional icon, and no stat block.
- Reuse a creature in other campaigns of the same game system by default. Allow a creature to be kept within one campaign.
- Edits to a creature update plans that reference it and future runs. Existing run records retain the creature name and game values they started with.
- A creature used by any run, active or completed, cannot be deleted. Tell the user which runs use it.
- **Do not track player-character HP.**

### 3.2 Encounter preparation

- Create, edit, and delete an encounter plan in a campaign. Keep it available after every run. A plan with any runs cannot be deleted.
- Search plans by name and filter by reusable tags. Create, attach, and remove tags.
- Build a roster from party members and adversaries, with multiple instances of the same adversary where needed.
- Set a target difficulty and show the current difficulty and remaining or exceeded EV/CR budget. Calculation uses the plan's roster and party, following the rules in §11. Prep and live combat use the same rules.
- Write encounter notes in Markdown, attach reference images and stat-block images alongside the notes, and add reminders for a chosen round or every round.
- Import images using a file picker, paste, or drag-and-drop from the system's file manager. Imported images are owned by LiDnD, so moving or deleting the source file does not break the plan. Preview images before attaching them.
- Present notes, reference images, and many stat blocks in a **dense but readable workspace** that minimizes wasted space. The precise arrangement is a UX decision; resizable custom columns are not a product requirement.
- For Draw Steel, arrange adversaries into named initiative groups. Show each group's EV next to one hero's EV, `E(level)`, since a group is roughly worth one hero. A group can have an optional color label, always shown alongside its name.
- Start a new run from the same plan any number of times. Each run begins with a fresh copy of the planned roster and reminders. Previous runs remain separate and reviewable.
- Editing the plan affects future runs. Changes made during a run affect that run only; the user edits the plan separately to change future runs.

### 3.3 Sessions and run history

- Start and end a named session. Show its elapsed time while active.
- In Draw Steel, track session victories, allowing increases and decreases down to zero. Offer the previous Draw Steel session's final count when starting a new session.
- Associate every encounter run directly with a session. Starting a run without an active session prompts the user to start one.
- Show a session's runs and a plan's run history. A completed run shows its start/end time, duration, and final combat state. An unfinished run can be resumed after restarting the app.
- A session with any runs cannot be deleted.

### 3.4 Live combat shared by both systems

- Start a run from a plan and show the current round, elapsed time, participant roster, notes, reminders, and stat-block/reference images.
- Track adversary and ally HP, including temporary HP. Enter damage and healing and show current and maximum HP. Player-character HP remains outside the app.
- Add and remove participants during a run without changing the reusable plan.
- Apply and remove status effects and show them on participants. Enter a free-text name and duration note when applying an effect. In D&D 5e, also allow a save-ends DC. Removal is manual; the app does not interpret the duration note or automatically expire effects. A built-in effect catalog is unnecessary.
- Show reminders when their round condition is met; allow the game master to dismiss them.
- Undo and redo recent combat actions in the active run: damage and healing, temporary HP, minion casualties, effects, acted markers, turn and round changes (including any malice awarded with them), manual malice and victory adjustments, and adding or removing participants. Undo history survives app restart while the run is active.
- End a run without deleting it or its plan. Keep the final state for review. Run history is a summary, not an event-by-event replay; undo history need not be kept after the run ends.

### 3.5 Draw Steel combat

- Track malice and allow direct adjustments. Initialize and advance it according to §11.2.
- Show heroes, individual adversaries, and adversary initiative groups. Mark each as having acted this round and allow corrections.
- Advance rounds and reset acted markers. Make the current turn or group clear.
- Track minion count and apply damage using the Draw Steel minion and overkill rules in §11.3.

### 3.6 D&D 5e combat

- Enter or correct initiative before and during combat.
- Show participants in initiative order, identify the active turn, and move to the next or previous turn and round.
- Calculate encounter difficulty using D&D 5e 2024 rules rather than Draw Steel EV rules. The Draw Steel minion and overkill workflow is not part of 5e's initial scope.

## 4. Offline-first operation

The device holds the user's data. The cloud is an optional backup and transfer path, never a prerequisite for using the app.

- Every workflow in §3 works with no network connection, including first launch and use without an account.
- Edits are saved locally and take effect immediately, without waiting on the network. In normal use, no loading state, error, or disabled control is caused by connectivity.
- Saved edits and active combat state survive app restart, crash, power loss, and network outage.
- A signed-in device keeps a complete copy of the user's data, **including image files**. After syncing, a device that goes offline can open any campaign, plan, session, or run with its images.
- Edits made offline are kept durably and uploaded automatically when the device reconnects, without user action. Quitting or restarting with pending uploads loses nothing.
- A signed-in user stays signed in while offline. An expired or revoked cloud credential pauses sync; it never locks the user out of local data.
- Session and run timers continue correctly across restarts and while offline.
- Show sync status unobtrusively: whether changes are saved locally, whether they have reached the cloud, when the last successful sync happened, and any sync problem that needs the user's attention.

## 5. Cloud save and multiple devices

- Users can opt into an account to save their data remotely and continue on another device. Offer Discord sign-in for the cloud account; local use needs no sign-in. Discord is an identity provider only.
- The expected pattern is **switching devices between sessions**, not editing one live run on two devices at once.
- Merge independent changes automatically. If two offline edits to the same value cannot be combined without guessing, preserve both versions and let the user recover them. No combat state may be silently overwritten.
- Deletions propagate to other devices. An offline edit to an item deleted elsewhere is not silently discarded (see §9). If one device deletes a plan, creature, or session while another device offline starts a run that uses it, the run wins and the item is kept.
- Sync image files as well as their metadata. Cloud save is incomplete if a plan appears on another device without its images.
- Linking existing local data to an account keeps both the local and remote data. Independent items are combined; an ambiguous duplicate is preserved for review.

## 6. Existing data migration

- Users of the current LiDnD app can import their existing data: campaigns, parties, creatures, sessions, encounters, notes, and image assets.
- Convert an old prepared encounter into a reusable plan and any started combat into one run, resumable if still active.
- Preserve note text and attached/embedded images when converting old rich text to Markdown; small formatting differences are acceptable.
- Recalculate imported 5e plans with 2024 difficulty rules and clearly mark any changed difficulty label. Preserve the historical state of completed runs.
- A one-time export/import path is sufficient; ongoing compatibility or two-way sync with the current app is not required.

## 7. Device and quality requirements

- Design for laptop screens and keyboard-plus-pointer input. Support window resizing, keyboard navigation, file selection, image paste, and image drag-and-drop.
- Keep the primary combat controls visible and responsive on an ordinary laptop screen, even with many stat blocks open. Common combat actions (damage, healing, turn advance) are fast from the keyboard.
- Give controls readable labels and visible keyboard focus. Color alone must not carry turn, difficulty, or health meaning.
- Image access is limited to files the user explicitly picks, pastes, or drops.

## 8. Intentional scope limits

- No Discord bot, server integration, or Discord-specific game features. Discord sign-in for cloud save remains in scope.
- No player-character HP, dice roller, rules compendium, or public player/observer view.
- No tablet- or phone-first design.
- No requirement to reproduce the current app's pages, custom columns, drag handles, keyboard shortcuts, or settings.
- No simultaneous editing of a live encounter. Shared encounter prep and real-time co-editing can be considered later if the rare two-GM case becomes important.
- No automatic merge of ambiguous concurrent combat edits. This product assumes one live editor.
- No event-by-event combat replay or generic plugin framework for more game systems.
- No automatic extraction of creature values from stat-block images in the initial product. A later assisted-entry flow could suggest fields from an image, with the game master reviewing every value before saving.
- No ongoing compatibility or two-way sync with the current LiDnD app after its data is imported.

## 9. Open decisions

| Decision | Current lean |
| --- | --- |
| Creature scope | Reusable across campaigns of the same system by default, with a campaign-only option. Existing runs keep snapshots of relevant creature data. |
| Notes | Markdown with separately attached images. Verify conversion of old rich-text note content and embedded images. |
| Status effects | Free-text name and duration note, plus optional save-ends DC in D&D 5e; manual removal. No built-in catalog. |
| Undo depth | How many combat actions undo reaches back, and whether undo also covers prep edits. Lean: generous depth for the active run; prep undo is optional. |
| Creatures in plans | Whether a creature used only by plans (no runs) can be deleted. Lean: allow it after confirmation, removing it from those plans. |
| Archiving | Plans, creatures, and sessions with runs can't be deleted, so lists will grow. Decide whether to offer archiving to hide them from everyday views. |
| Deleting campaigns | Whether a campaign with runs can be deleted, which would bypass the rules above. |
| Edit vs. remote delete | Lean: an offline edit to an item deleted on another device restores it for review rather than being discarded. |
| Signing out | What happens to local data on sign-out, and whether a device can switch accounts. Lean: keep local data unless the user chooses to remove it. |
| Local backup | Whether local-only users can export all their data (with images) to a file and restore it. Without cloud save, the device is otherwise the only copy. |
| Account recovery | Discord is the only sign-in. Decide whether losing Discord access means losing cloud access, or whether a second identity provider is needed. |
| Cloud storage limits | Whether image storage per account is capped, and what happens on a device with little free space when the full image set must be kept locally. |
| Account attachment | Combine independent local and cloud items; preserve ambiguous duplicates for review. Verify with two existing data sets. |
| Difficulty and malice rules | Use the Draw Steel behavior specified in §11. Define D&D 5e 2024 encounter math before building 5e difficulty. |

## 10. Acceptance journeys

1. **Prepare offline:** with no network, create a campaign, party, adversaries, and a searchable, tagged encounter plan with difficulty feedback, notes, images, and reminders; restart the app and find them intact.
2. **Run and reuse:** start a Draw Steel session, run an encounter, track turns, HP, effects, minions, malice, victories, and reminders; undo a mistaken damage entry and a mistaken turn advance; end it, then run the same plan again with fresh combat state and both runs in history.
3. **D&D 5e:** build a 5e plan, review its CR difficulty, set initiative, advance and correct turns, then end the run.
4. **Survive interruption:** mid-combat, force-quit the app or cut power; reopen and resume the run with no lost edits.
5. **Switch devices:** finish on one device, sync, open the same campaign on another, disconnect it, make edits offline, reconnect, and see the update on both devices with images present.
6. **Conflicting offline edits:** edit the same plan on two offline devices, reconnect both, and confirm independent edits merge and the conflicting value is recoverable.
7. **Import old data:** export from the current app, import, and verify campaigns, parties, creatures, images, notes, sessions, and completed or active encounters. Old encounter data appears as a plan plus a run when applicable; an active run remains resumable.

## 11. Game-system rules

Prep and live combat use the same calculations. Notes on the current app's behavior are included only where this spec intentionally differs from it. See [LIDND_DEV_NOTES.md](LIDND_DEV_NOTES.md) for the existing implementations and tests that serve as a reference for these rules.

### 11.1 Draw Steel encounter value (EV)

Rules in §11.1–11.3 were checked against *Draw Steel: Monsters* v1.01 and *Draw Steel: Heroes* v1.01b.

- Each standard adversary contributes its entered EV. Allies and heroes contribute zero to the opposing roster's EV.
- **Minions are bought four at a time.** A minion's entered EV is for a set of four. For each minion creature type, cost is `ceil(totalMinionsOfThatType / 4) × minionEV`, however those minions are split into squads. A squad holds 1–8 minions. Prep EV uses the plan's planned squad sizes; damage during a run does not change the plan's difficulty.
- Let `H` be hero count, `A` be allies (NPCs fighting alongside the heroes, who each count as a hero of the party's level), `V` be session victories (the party's average; zero if no active session), and `E(level)` be EV per hero from the table below. Encounter strength `ES = E(level) × (H + A + floor(V / 2))`. With zero heroes, show “add heroes” rather than a difficulty label.
- Difficulty: total EV `< ES − E` is Trivial; `< ES` is Easy; `≤ ES + E` is Standard; `≤ ES + 3E` is Hard; anything higher is **Extreme**. Target budget is the selected easy (`ES`), standard (`ES + E`), or hard (`ES + 3E`) ceiling; remaining EV is target minus planned roster EV, and can be negative.
- Initiative groups: show each group's EV against one to two heroes' `E(level)`, the book's guideline for a group.

| Draw Steel hero level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `E(level)` | 6 | 8 | 10 | 12 | 14 | 16 | 18 | 20 | 22 | 24 |

### 11.2 Draw Steel malice and victories

- At run start, set round to 1 and malice to `heroCount + sessionVictories + 1`. At the start of each later round `R`, add `heroCount + R` to current malice; victories count only toward the starting malice. The book counts heroes still in the battle (a dead hero stops generating malice); LiDnD counts heroes in the run's roster, since it does not track their HP, so remove a hero who dies. Do not award malice again when correcting an acted marker inside the same round. Allow manual malice adjustments, with a floor of zero.
- Victories are a nonnegative, manually edited **Draw Steel session** value. When starting a session, offer the previous session's final count as the initial value. Use the current session value when preparing or starting a run; a later victory edit affects the prep budget and future runs' starting malice, and never retroactively recalculates malice already awarded.

### 11.3 Draw Steel stamina, minions, and turns

- Temporary Stamina absorbs damage first. Gaining temporary Stamina while you have some gives the greater amount, not the sum.
- A creature is **winded** at or below half its Stamina maximum (rounded down); show it, since abilities key off it. Director-controlled creatures die at 0 Stamina. Healing can't exceed the maximum.
- A minion squad shares one **Stamina pool**: per-minion Stamina × squad size. Minions can't regain Stamina or gain temporary Stamina, and squads can't be winded.
- One minion dies each time the pool drops by one minion's Stamina, so the minions alive are `ceil(pool / staminaPerMinion)`. A single-target hit takes its full damage from the pool and can drop several minions.
- An **area** effect damages only the minions in the area: the pool loses `minionsInArea × min(damage, staminaPerMinion)`, so it can't kill minions outside the area. The GM enters how many of the squad's minions were in the area; leaving it blank means a single-target hit.
- Draw Steel uses acted markers on heroes, individual adversaries, and initiative groups. Marking the final outstanding turn advances the round, clears all acted markers, and awards malice once. A member of an initiative group uses its group's marker.

### 11.4 D&D 5e and shared behavior

- D&D 5e uses descending initiative order with a stable tie-break. The current participant is explicit; next/previous wraps through eligible participants and changes the round on wrap. Defeated adversaries that are not the current participant are skipped.
- 5e difficulty uses the 2024 encounter-budget rules. The current app's custom per-level CR table is not the 2024 rule and must not be reused.
- Both systems trigger reminders on a selected round or every round. Effects are manually applied and removed. Save-ends DC applies to 5e only; duration is free text in both systems.

### 11.5 Rules still to confirm

1. ~~Minion EV rounding~~ — resolved: minions are bought in sets of four per type (§11.1).
2. ~~Overkill formula~~ — resolved: replaced by the book's shared Stamina pool (§11.3).
3. Specify D&D 5e 2024 difficulty from an identified rules source, including monster contribution, ally handling, and boundary labels, with test examples.
