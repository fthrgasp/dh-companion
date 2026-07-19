# Changelog

All notable changes to the Daggerheart Tracker are logged here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [1.3.4] — 2026-07-19

### Fixed
- **Duplicate-experience prevention.** Renaming an experience (or naming a new one) to match another experience already on the sheet — case-insensitive, whitespace-trimmed — is now blocked with an inline warning instead of silently allowed. The field snaps back to its previous value until the name is changed to something distinct.

## [1.3.3] — 2026-07-19

### Added
- **Transformation forms (Void), first pass.** Any character can now opt into a Transformation tab (checkbox on the Edit tab) that works just like Druid Wildshape: a set of named forms with Tier/Evasion/Attack/Damage/Feature/Stress cost, one active at a time, transform/revert buttons.
- Seeded with the six named Void transformations — Vampire, Werewolf, Reanimated, Shapeshifter, Ghost, Demigod — but their stats/features are placeholder text flagged "Void — pending official text," same convention as the other `voidPending` Void content. **These need to be replaced with the real card text from the Void source before they're used at the table** — the data model and UI are done, the content isn't.

## [1.3.2] — 2026-07-19

### Fixed
- **Proficiency now auto-scales at tier breaks.** Reaching level 2, 5, or 8 automatically bumps Proficiency by 1, matching the same formula used when a character is created directly at a higher level. Previously this only happened if a player remembered to spend one of their two advancement picks on "+1 Proficiency," so tables that forgot fell permanently behind.
- The "+1 Proficiency" advancement option is still pickable on any level, including tier-break levels. Picking it on a level where Proficiency just auto-increased now prompts a confirmation ("Increase Proficiency again?") since that stacks an extra point on top of the automatic one — occasionally intentional, so it's a warning rather than a block.

## [1.3.1] — 2026-07-18

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

## [1.3.0] — 2026-07-18

### Added
- **Bulk card import.** Compendium screen now has a paste-in importer: one person can type out a whole batch of domain cards (any domain, including Blood/Dread) in a simple text format and import them all at once instead of everyone retyping the same cards into the wizard by hand. Re-pasting a card with the same name updates it in place rather than creating a duplicate, so correcting a typo is just "fix it and re-import."
- Imported cards now show up everywhere the built-in library does — the wizard's domain-card picker, and the auto-fill when padding out a higher-level starting character.

## [1.2.0] — 2026-07-18

### Added
- **The Void content — first pass.** Added as official-adjacent content, not homebrew:
  - **2 new domains:** Blood, Dread
  - **6 new classes:** Assassin, Witch, Warlock, Brawler, Blood Hunter, Summoner — each wired up with correct domain pairing(s) and subclass names
  - **6 new ancestries:** Aetheris, Earthkin, Emberkin, Skykin, Tidekin, Gnome
  - **6 new communities:** Duneborne, Freeborne, Frostborne, Hearthborne, Reborne, Warborne
- **Character wizard: dedicated starting-level step.** "What level is this character starting at?" is now its own first screen (Level 1 / Higher level toggle) instead of a buried number field under Class. Fixes the confusion from zero session.

### Changed
- Compendium's built-in vs. custom content lists (domains/classes/ancestries) now read directly from the app's real data instead of a separately hardcoded list, so new built-in content can't silently fall out of sync going forward.
- Version bumped 1.1.0 → 1.2.0.

### Known limitations — tracking for next pass
- **Void domain cards still need someone to type them in once.** Blood and Dread have zero cards in them until they're imported — use the new Bulk card import panel in the Compendium (one paste job for whoever volunteers) rather than the old one-field-at-a-time wizard fallback.
- **Void class stats are estimates, not confirmed.** Evasion/HP for the 6 new classes are placeholders (flagged `voidPending` in code) until checked against the official PDFs — don't take them as gospel yet.
- **Void class items/weapons not set.** Those classes currently fall back to the generic weapon/armor picker rather than their real class item.
- **Transformation cards** (Vampire, Werewolf, Reanimated, Shapeshifter, Ghost, Demigod) — not started. These need actual new data structure work, not just new list entries.
- **Void adversaries/environments** — no code changes needed; add them through the existing Creatures screen like any other bestiary entry.
- **Level-up wizard doesn't auto-scale Proficiency at tier breaks** (levels 2/5/8) — known bug, not yet fixed.
- **Duplicate-experience prevention** — still needs a decision on what exactly should de-duplicate (raised, not yet scoped).
