# Changelog

All notable changes to the Daggerheart Tracker are logged here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [0.12.1] — 2026-07-20

### Fixed
- **Magic-link sign-in redirected to a dead local dev server instead of back to the app.** Left over from testing the Supabase auth flow locally — the project's Site URL was still pointed at `localhost`, so every magic link (on any device) redirected there regardless of where it was actually requested from. `sendMagicLink()` now explicitly passes the current page's own URL as the redirect target on every request, so it's correct automatically in any environment (local dev, GitHub Pages, anywhere else this ever gets deployed) without needing the Supabase dashboard's Site URL to be flipped per environment.

## [0.12.0] — 2026-07-19

### Changed
- **Restructured into a Vite project (`/dh-tracker`).** The single-file `Daggerheart_Tracker.html` (~4,700 lines) is split into `src/core` (template engine, state, undo, migrations, storage, Supabase), `src/screens` (one file per screen), and `src/features` (character wizard, damage calculator). Pure reorganization — no logic or behavior changes; verified line-for-line against the original, including a full pass through every screen, every sheet tab, the character wizard, undo, and a production `npm run build`. The old single-file version stays at the repo root as a fallback, not actively maintained going forward.

### Added
- **Shared inventory sync.** Signed-in players can now share a campaign's inventory across every device at the table instead of it being stuck in one browser. Open Options → Share campaign to generate an invite link; anyone who opens it while signed in joins automatically (no approval step — the link itself is the invite). Everyone in a shared campaign can add, edit, or remove any item, matching how a table already shares physical loot.
- Shared inventory uses simple last-write-wins syncing — no conflict dialogs, no waiting on a lock. At this scale (a handful of players, infrequent simultaneous edits) that's a better trade than the complexity of per-row version checks.
- A campaign that hasn't been shared, or a player who never signs in, sees zero change — inventory stays exactly as local as it's always been.

## [0.11.0] — 2026-07-19

### Added
- **Optional account sign-in with cross-device character sync.** Sign in with a magic-link email (Supabase Auth, no password) and your characters sync to a Postgres backend instead of staying stuck in one browser's localStorage — the fix for "I made my character on my phone but we're playing on my laptop." Everything else (shared inventory, recaps, compendium, creatures) is unaffected and stays local for now; that's still on the roadmap for later steps.
- Signing in for the first time offers to import any characters already saved locally in that browser, so upgrading doesn't silently orphan existing sheets.
- **"Continue without an account" stays fully supported.** Nothing is required to keep using the tracker exactly as before — the sign-in screen can be dismissed permanently per device, and signing out returns to local-only mode with no data loss.

## [0.10.1] — 2026-07-19

### Changed
- **Export PDF / Export JSON moved into a "⋯" overflow menu** on the Sheet header, same dropdown pattern as the "Pages" menu. They were sitting right next to the Dark/Light toggle and session timer controls, easy to tap by accident — tucking them away cuts down on that for less careful hands at the table.

## [0.10.0] — 2026-07-19

### Added
- **JSON export/import for character sheets.** The Sheet screen has an "Export JSON" button (next to Export PDF) that downloads the full character object — same shape as the localStorage schema, plus a `schemaVersion` key — as `{charactername}-{campaignname}.json` (sanitized filename).
- The Roster screen has a matching "Import character" tile. Imported files are parsed, validated for required fields (name, class, stats, HP, inventory), and run through the same schema-migration path used for old localStorage saves (extracted into a reusable `normalizeChar()`), so an import a few versions behind still loads cleanly.
- **Conflict handling on import.** If the imported character's id or name matches an existing character, a dialog offers three options: **Cancel** (no changes), **Import as new** (fresh id, auto-suffixes the name on collision — e.g. "Kael Ashwind (2)"), or **Merge** (imported file wins per differing field, but fields absent from the imported JSON are left untouched — handles partial/older exports without clobbering data the import never mentioned). Merge shows a before→after diff summary of every field that would actually change before you commit to it.
- Malformed JSON or a file missing required character data shows an error toast instead of silently corrupting the roster.

## [0.9.0] — 2026-07-19

### Added
- **Placeholder starting weapon/armor for the six Void classes.** Assassin, Witch, Warlock, Brawler, Blood Hunter, and Summoner now preselect an obviously-fake "Class item — pending (Void)" / "Armor — pending (Void)" entry in the creation wizard instead of silently falling back to the generic weapon/armor picker. Damage is left blank on purpose (no guessed numbers); armor score defaults to 3. Replace with the real class item from the Void PDF before play.

## [0.8.0] — 2026-07-19

### Fixed
- **Duplicate-experience prevention.** Renaming an experience (or naming a new one) to match another experience already on the sheet — case-insensitive, whitespace-trimmed — is now blocked with an inline warning instead of silently allowed. The field snaps back to its previous value until the name is changed to something distinct.

## [0.7.0] — 2026-07-19

### Added
- **Transformation forms (Void), first pass.** Any character can now opt into a Transformation tab (checkbox on the Edit tab) that works just like Druid Wildshape: a set of named forms with Tier/Evasion/Attack/Damage/Feature/Stress cost, one active at a time, transform/revert buttons.
- Seeded with the six named Void transformations — Vampire, Werewolf, Reanimated, Shapeshifter, Ghost, Demigod — but their stats/features are placeholder text flagged "Void — pending official text," same convention as the other `voidPending` Void content. **These need to be replaced with the real card text from the Void source before they're used at the table** — the data model and UI are done, the content isn't.

## [0.6.0] — 2026-07-19

### Fixed
- **Proficiency now auto-scales at tier breaks.** Reaching level 2, 5, or 8 automatically bumps Proficiency by 1, matching the same formula used when a character is created directly at a higher level. Previously this only happened if a player remembered to spend one of their two advancement picks on "+1 Proficiency," so tables that forgot fell permanently behind.
- The "+1 Proficiency" advancement option is still pickable on any level, including tier-break levels. Picking it on a level where Proficiency just auto-increased now prompts a confirmation ("Increase Proficiency again?") since that stacks an extra point on top of the automatic one — occasionally intentional, so it's a warning rather than a block.

## [0.5.0] — 2026-07-18

### Added
- **"Update available" banner.** A `version.json` file now ships alongside `index.html`.
  The app checks it — with the browser cache forced off — on load *and* whenever the
  app comes back to the foreground, which is the part that actually matters for a
  home-screen icon on an iPad/iPhone: those are notorious for holding onto a stale
  copy well past when a normal browser tab would refresh. If the deployed version
  doesn't match what's running, a small banner offers a one-tap reload. Character
  data lives in localStorage, not in this cache, so reloading never touches it.

### Deploying an update from here on
Whenever `index.html`'s `APP_VERSION` gets bumped, **`version.json` needs the same
bump** — it's a separate file on purpose (checking it is a much smaller request than
re-fetching the whole app just to compare a version string). Forgetting to update it
just means the banner won't show up; nothing breaks, it just goes quiet.

## [0.4.0] — 2026-07-18

### Added
- **Bulk card import.** Compendium screen now has a paste-in importer: one person can type out a whole batch of domain cards (any domain, including Blood/Dread) in a simple text format and import them all at once instead of everyone retyping the same cards into the wizard by hand. Re-pasting a card with the same name updates it in place rather than creating a duplicate, so correcting a typo is just "fix it and re-import."
- Imported cards now show up everywhere the built-in library does — the wizard's domain-card picker, and the auto-fill when padding out a higher-level starting character.

## [0.3.0] — 2026-07-18

### Added
- **The Void content — first pass.** Added as official-adjacent content, not homebrew:
  - **2 new domains:** Blood, Dread
  - **6 new classes:** Assassin, Witch, Warlock, Brawler, Blood Hunter, Summoner — each wired up with correct domain pairing(s) and subclass names
  - **6 new ancestries:** Aetheris, Earthkin, Emberkin, Skykin, Tidekin, Gnome
  - **6 new communities:** Duneborne, Freeborne, Frostborne, Hearthborne, Reborne, Warborne
- **Character wizard: dedicated starting-level step.** "What level is this character starting at?" is now its own first screen (Level 1 / Higher level toggle) instead of a buried number field under Class. Fixes the confusion from zero session.

### Changed
- Compendium's built-in vs. custom content lists (domains/classes/ancestries) now read directly from the app's real data instead of a separately hardcoded list, so new built-in content can't silently fall out of sync going forward.
- Version bumped 0.2.0 → 0.3.0.

### Known limitations — tracking for next pass
- **Void domain cards still need someone to type them in once.** Blood and Dread have zero cards in them until they're imported — use the new Bulk card import panel in the Compendium (one paste job for whoever volunteers) rather than the old one-field-at-a-time wizard fallback.
- **Void class stats are estimates, not confirmed.** Evasion/HP for the 6 new classes are placeholders (flagged `voidPending` in code) until checked against the official PDFs — don't take them as gospel yet.
- **Void class items/weapons not set.** Those classes currently fall back to the generic weapon/armor picker rather than their real class item.
- **Transformation cards** (Vampire, Werewolf, Reanimated, Shapeshifter, Ghost, Demigod) — not started. These need actual new data structure work, not just new list entries.
- **Void adversaries/environments** — no code changes needed; add them through the existing Creatures screen like any other bestiary entry.
- **Level-up wizard doesn't auto-scale Proficiency at tier breaks** (levels 2/5/8) — known bug, not yet fixed.
- **Duplicate-experience prevention** — still needs a decision on what exactly should de-duplicate (raised, not yet scoped).
