# Changelog

All notable changes to the Daggerheart Tracker are logged here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

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
