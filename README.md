# Daggerheart Character Companion

A single-file, offline-friendly character tracker for Daggerheart — built to run anywhere
a browser does, with no install, no server, and no account.

**Current version:** `1.3.0` — also shown live in the app itself, top-left of the Party Roster
screen. Compare that number to the [changelog](#changelog) below to see if the copy hosted
on GitHub Pages is up to date.

## What it does

**Roster & campaigns**
- Multiple campaigns/games, each with its own roster, shared inventory, and recaps
- Custom banner and background images per campaign
- Per-character portraits

**Character sheets**
- Identity: name, pronouns, ancestry, community, class, subclass, level
- The six core traits
- Evasion, Armor Score, Proficiency
- Hit Points, Stress, Armor Slots, and Hope tracked as tappable pip rows
  - HP and Stress start full and count down as damage/stress is marked, matching
    standard table play
- Damage thresholds (Major / Severe) with a built-in damage calculator that marks
  the right number of HP automatically, including support for active modifiers
- Weapons (primary and secondary, each with its own feature list) and armor, with an
  **Equipped** toggle per weapon
- Domain cards / loadout and vault
- Experiences, gold, inventory, conditions (built-in + custom)
- Companion sheets: stats, HP/Stress, attacks, features, backstory
- Downtime moves, short/long rest (long rest clears HP, Stress, and Armor marks, and
  resets rest-only features)
- Session recaps log
- Light and dark themes, with a per-campaign accent color

**Guided character creation** — a step-by-step wizard covering class, ancestry,
traits, domain cards, starting equipment, companion, experiences, background, and
portrait.

## How it's built

This is a plain HTML/CSS/JS file — no build step, no framework, no external requests
once the page has loaded (fonts are embedded, images are stored locally in the
browser). Character data is saved to the browser's `localStorage`, scoped to whatever
URL the page is served from.

**Important:** data does *not* sync between devices or browsers. If you open the app
on your phone and your iPad, each one keeps its own separate save. There's currently
no shared/cloud storage — see the "Possible future work" note below if that ever
becomes worth doing.

## Running it

- **Locally:** download `index.html` and open it in any modern browser (double-click,
  or drag it into a browser window).
- **Hosted (recommended for phone/tablet use):** this repo is set up for
  [GitHub Pages](https://pages.github.com/). Once Pages is enabled on the `main`
  branch, the app is available at the repo's Pages URL. Add that URL to your phone or
  tablet's home screen for an app-like icon and full-screen feel.

## Changelog
[1.3.0] — 2026-07-18

Added


Bulk card import. Compendium screen now has a paste-in importer: one person can type out a whole batch of domain cards (any domain, including Blood/Dread) in a simple text format and import them all at once instead of everyone retyping the same cards into the wizard by hand. Re-pasting a card with the same name updates it in place rather than creating a duplicate, so correcting a typo is just "fix it and re-import."
Imported cards now show up everywhere the built-in library does — the wizard's domain-card picker, and the auto-fill when padding out a higher-level starting character.


[1.2.0] — 2026-07-18

Added


The Void content — first pass. Added as official-adjacent content, not homebrew:

2 new domains: Blood, Dread
6 new classes: Assassin, Witch, Warlock, Brawler, Blood Hunter, Summoner — each wired up with correct domain pairing(s) and subclass names
6 new ancestries: Aetheris, Earthkin, Emberkin, Skykin, Tidekin, Gnome
6 new communities: Duneborne, Freeborne, Frostborne, Hearthborne, Reborne, Warborne



Character wizard: dedicated starting-level step. "What level is this character starting at?" is now its own first screen (Level 1 / Higher level toggle) instead of a buried number field under Class. Fixes the confusion from zero session.


Changed


Compendium's built-in vs. custom content lists (domains/classes/ancestries) now read directly from the app's real data instead of a separately hardcoded list, so new built-in content can't silently fall out of sync going forward.
Version bumped 1.1.0 → 1.2.0.

### 1.1.0
- Added an in-app version badge (Party Roster header) so you can tell what's deployed
- Fixed: checkboxes throughout the Gear & Notes tab (including weapon **Equipped**
  toggles) weren't registering clicks
- Fixed: Hit Points and Stress pips now start full and count down as marked, per
  table rules (previously started empty and filled up)
- Fixed: Long Rest now also resets Hit Points (Stress and Armor marks were already
  being cleared)

### 1.0.0
- Initial standalone rebuild — ported from the Claude.ai artifact export into a
  dependency-free HTML file that runs in any browser, including as a local file with
  no server

## Possible future work

- Shared/cloud storage so the whole party can see one live campaign state instead of
  each device keeping its own copy — a meaningfully bigger project involving a real
  backend, noted here for reference rather than currently planned
