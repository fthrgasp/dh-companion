# Daggerheart Character Companion

> ⚠️ **This is a fan-made, unofficial tool.** It is not produced, reviewed, or
> endorsed by Darrington Press or Critical Role. Everything mechanical in here
> comes from Daggerheart, which they made and own — we just built a tracker
> around it for our own table. If something's wrong, that's on us, not them.
> Use of Playtest Materials from The Void is exactly that — playtest, unfinished,
> subject to change without notice. No warranty express or implied, and no
> guarantee this app won't curse your bloodline for nine generations if you
> mismark a domain card. Play at your own risk.

A single-file, offline-friendly character tracker for Daggerheart — built to run anywhere
a browser does, with no install, no server, and no account.

**Current version:** `1.3.5` — also shown live in the app itself, top-left of the Party Roster
screen. Compare that number to the [changelog](#changelog) below to see if the copy hosted
on GitHub Pages is up to date. The app also checks for updates itself (see
"Keeping deployed copies current" below) and will tell you directly if it's stale.

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

## Keeping deployed copies current

Home-screen icons on iOS/iPadOS (and long-lived browser tabs in general) can hold
onto a stale, already-loaded copy of the app well past when a fresh visit would pick
up changes — there's no reload button on a home-screen icon to force it manually.

To fix that, the app polls a small `version.json` file (same folder as `index.html`)
with the browser cache forced off, both on load and whenever it comes back to the
foreground. If the deployed version doesn't match what's currently running, a banner
offers a one-tap reload — character data is in `localStorage`, not in whatever got
cached, so this never touches anyone's saves.

**When you bump `APP_VERSION` in `index.html`, bump the version number in
`version.json` to match.** They're two separate files on purpose — checking a few
bytes of JSON is a lot cheaper than re-fetching the whole app just to compare a
version string. If you forget to update `version.json`, nothing breaks; the banner
just won't show up until it's fixed.

## Changelog
[1.3.5] — 2026-07-19

Added

- Placeholder starting weapon/armor for the six Void classes. Assassin, Witch,
  Warlock, Brawler, Blood Hunter, and Summoner now preselect an obviously-fake
  "Class item — pending (Void)" / "Armor — pending (Void)" entry in the creation
  wizard instead of silently falling back to the generic weapon/armor picker.
  Damage is left blank on purpose (no guessed numbers); armor score defaults to 3.
  Replace with the real class item from the Void PDF before play.

[1.3.4] — 2026-07-19

Fixed

- Duplicate-experience prevention. Renaming an experience (or naming a new one) to
  match another experience already on the sheet — case-insensitive, whitespace-trimmed —
  is now blocked with an inline warning instead of silently allowed. The field snaps
  back to its previous value until the name is changed to something distinct.

[1.3.3] — 2026-07-19

Added

- Transformation forms (Void), first pass. Any character can opt into a Transformation
  tab (checkbox on the Edit tab) that works like Druid Wildshape: a set of named forms
  with Tier/Evasion/Attack/Damage/Feature/Stress cost, one active at a time. Seeded with
  the six named Void transformations — Vampire, Werewolf, Reanimated, Shapeshifter,
  Ghost, Demigod — but their stats/features are placeholder text flagged "Void —
  pending official text" until someone replaces them with the real card text from the
  Void source. Data model and UI are done; the content isn't.

[1.3.2] — 2026-07-19

Fixed

- Proficiency now auto-scales at tier breaks (levels 2/5/8), matching the same formula
  used when a character is created directly at a higher level. Previously this only
  happened if a player remembered to spend an advancement pick on "+1 Proficiency,"
  so tables that forgot fell permanently behind.
- The manual "+1 Proficiency" advancement option is still pickable at any level. Picking
  it on a level where Proficiency just auto-increased now prompts a confirmation, since
  that stacks an extra point on top of the automatic one.

[1.3.0] — 2026-07-18

Added


- Bulk card import. Compendium screen now has a paste-in importer: one person can type 
  out a whole batch of domain cards (any domain, including Blood/Dread) in a simple text 
  format and import them all at once instead of everyone retyping the same cards into the 
  wizard by hand. Re-pasting a card with the same name updates it in place rather than 
  creating a duplicate, so correcting a typo is just "fix it and re-import."
  
- Imported cards now show up everywhere the built-in library does — the wizard's domain-card 
  picker, and the auto-fill when padding out a higher-level starting character.


[1.2.0] — 2026-07-18

Added

The Void content — first pass. Added as official-adjacent content, not homebrew:

- 2 new domains: Blood, Dread
- 6 new classes: Assassin, Witch, Warlock, Brawler, Blood Hunter, Summoner — each wired up with 
  correct domain pairing(s) and subclass names
- 6 new ancestries: Aetheris, Earthkin, Emberkin, Skykin, Tidekin, Gnome
- 6 new communities: Duneborne, Freeborne, Frostborne, Hearthborne, Reborne, Warborne



- Character wizard: dedicated starting-level step. "What level is this character starting at?" 
  is now its own first screen (Level 1 / Higher level toggle) instead of a buried number field 
  under Class. Fixes the confusion from zero session.


Changed


- Compendium's built-in vs. custom content lists (domains/classes/ancestries) now read 
  directly from the app's real data instead of a separately hardcoded list, so new 
  built-in content can't silently fall out of sync going forward.

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

## KNOWN BUGS

None currently tracked.

## Possible future work

- Shared/cloud storage so the whole party can see one live campaign state instead of
  each device keeping its own copy — a meaningfully bigger project involving a real
  backend, noted here for reference rather than currently planned

- Void domain cards still need someone to type them in once. Blood and Dread have zero 
  cards in them until they're imported — use the new Bulk card import panel in the Compendium 
  (one paste job for whoever volunteers) rather than the old one-field-at-a-time wizard fallback.

- Void class stats are estimates, not confirmed. Evasion/HP for the 6 new classes are placeholders
  (flagged voidPending in code) until checked against the official PDFs — don't take them as gospel yet.
  Class items/weapons now preselect an obvious "pending (Void)" placeholder (1.3.5) instead of the
  generic picker, but still need the real class item swapped in from the Void PDF.

- Transformation cards (Vampire, Werewolf, Reanimated, Shapeshifter, Ghost, Demigod) — data
  model and UI shipped in 1.3.3 (opt-in Transformation tab, same pattern as Wildshape), but
  the six forms are still placeholder stats/text flagged "Void — pending official text."
  Someone needs to pull the real card text from the Void source and fill them in.

- Void adversaries/environments — no code changes needed; add them through the existing Creatures 
  screen like any other bestiary entry.

## Attribution & License

Daggerheart Compatible.

This project uses game content from **Daggerheart**, published by Darrington Press,
under the [Darrington Press Community Gaming License](https://darringtonpress.com/license/)
(DPCGL):

- Core classes, domains, ancestries, and communities are drawn from the **Daggerheart
  System Reference Document (SRD) 1.0**.
- Assassin, Witch, Warlock, Brawler, Blood Hunter, and Summoner (plus the Blood and
  Dread domains and the six newer ancestries/communities) are **Playtest Materials**
  from [The Void](https://www.daggerheart.com/thevoid/), also covered under the DPCGL.
  Void content is explicitly unfinished and gets revised by Darrington Press on an
  ongoing basis — what's implemented here may lag behind the current live version.

> This product includes materials from the Daggerheart System Reference Document 1.0,
> © Critical Role, LLC, under the terms of the Darrington Press Community Gaming
> License. More information at [www.daggerheart.com](https://www.daggerheart.com).

**Daggerheart™** and **Darrington Press™** are trademarks of Critical Role, LLC. This
project is an unofficial fan creation and is not affiliated with, sponsored by, or
endorsed by Darrington Press or Critical Role.

This is a personal, non-commercial tool built for one home table. It isn't for sale
and isn't distributed as a product — per the DPCGL, Playtest Materials specifically
can't be sold or monetized in any form, and we're not doing that here.

  
