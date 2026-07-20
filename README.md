# Daggerheart Character Companion

> ⚠️ **This is a fan-made, unofficial tool.** It is not produced, reviewed, or
> endorsed by Darrington Press or Critical Role. Everything mechanical in here
> comes from Daggerheart, which they made and own — we just built a tracker
> around it for our own table. If something's wrong, that's on us, not them.
> Use of Playtest Materials from The Void is exactly that — playtest, unfinished,
> subject to change without notice. No warranty express or implied, and no
> guarantee this app won't curse your bloodline for nine generations if you
> mismark a domain card. Play at your own risk.

An offline-friendly character tracker for Daggerheart — built to run anywhere a browser
does, with no install and no account required. Optionally sign in with a magic-link
email to sync your characters and a campaign's shared inventory across devices; skip
that and it works exactly as a local-only, no-account tool.

**Current version:** `0.12.1` — also shown live in the app itself, top-left of the Party Roster
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
- Export a character as JSON and re-import it elsewhere — handy for moving a
  character between devices/browsers, or as a backup outside of localStorage
- Session recaps log
- Light and dark themes, with a per-campaign accent color

**Guided character creation** — a step-by-step wizard covering class, ancestry,
traits, domain cards, starting equipment, companion, experiences, background, and
portrait.

## How it's built

The deployed app (`Daggerheart_Tracker.html`) is a plain HTML/CSS/JS file — no build
step, no framework. Fonts are embedded and images are stored locally in the browser,
so it works fully offline once loaded. Character data is saved to the browser's
`localStorage` by default, scoped to whatever URL the page is served from.

**Optional account sync:** signing in (magic-link email, no password) syncs your
characters and a campaign's shared inventory to a small Postgres backend (Supabase),
so they follow you across devices instead of being stuck in one browser. This is
entirely opt-in — skip it (or sign out) and the app behaves exactly as the fully
local, no-account tool described above. Nothing about a signed-in session is
required to use any character sheet feature.

There's also a `/dh-tracker` directory in this repo — a Vite-based, multi-file
restructure of the same app (same behavior, just split across modules instead of
one file) used for active development. The deployed GitHub Pages site still runs
`Daggerheart_Tracker.html` for now.

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
[0.12.1] — 2026-07-20

Fixed

- Magic-link sign-in was redirecting to a local dev server left over from
  testing instead of back to the app. Now uses whatever URL the request
  actually came from, so it's correct on any device automatically.

[0.12.0] — 2026-07-19

Changed

- Restructured into a Vite project under `/dh-tracker` for active development
  (pure reorganization, no behavior change). The deployed site still runs
  `Daggerheart_Tracker.html`.

Added

- Shared campaign inventory sync for signed-in players — share an invite link
  from Options, anyone who opens it while signed in joins automatically, and
  everyone in the campaign can add/edit/remove shared items live across
  devices. Last-write-wins, no conflict dialogs. Unshared campaigns and
  signed-out use are unaffected.

[0.11.0] — 2026-07-19

Added

- Optional account sign-in (magic-link email, no password) with cross-device
  character sync. Signing out or never signing in keeps the app fully local,
  exactly as before.

[0.10.1] — 2026-07-19

Changed

- Export PDF / Export JSON moved into a "⋯" overflow menu on the Sheet header,
  same dropdown pattern as the "Pages" menu, so they're not sitting right next
  to the buttons players tap during normal play.

[0.10.0] — 2026-07-19

Added

- JSON export/import for character sheets. The Sheet screen has an "Export JSON"
  button that downloads the full character object as {charactername}-{campaignname}.json.
  The Roster screen has a matching "Import character" tile — imported files are
  validated and run through the same schema-migration path as an old localStorage
  save. If the imported character's id or name matches an existing character, a
  dialog offers Cancel / Import as new (auto-suffixes the name on collision) /
  Merge (imported file wins per differing field, but never touches fields absent
  from the imported JSON), with a before→after diff summary shown before merging.
  Malformed JSON or a file missing required fields shows an error toast instead of
  corrupting the roster.

[0.9.0] — 2026-07-19

Added

- Placeholder starting weapon/armor for the six Void classes. Assassin, Witch,
  Warlock, Brawler, Blood Hunter, and Summoner now preselect an obviously-fake
  "Class item — pending (Void)" / "Armor — pending (Void)" entry in the creation
  wizard instead of silently falling back to the generic weapon/armor picker.
  Damage is left blank on purpose (no guessed numbers); armor score defaults to 3.
  Replace with the real class item from the Void PDF before play.

[0.8.0] — 2026-07-19

Fixed

- Duplicate-experience prevention. Renaming an experience (or naming a new one) to
  match another experience already on the sheet — case-insensitive, whitespace-trimmed —
  is now blocked with an inline warning instead of silently allowed. The field snaps
  back to its previous value until the name is changed to something distinct.

[0.7.0] — 2026-07-19

Added

- Transformation forms (Void), first pass. Any character can opt into a Transformation
  tab (checkbox on the Edit tab) that works like Druid Wildshape: a set of named forms
  with Tier/Evasion/Attack/Damage/Feature/Stress cost, one active at a time. Seeded with
  the six named Void transformations — Vampire, Werewolf, Reanimated, Shapeshifter,
  Ghost, Demigod — but their stats/features are placeholder text flagged "Void —
  pending official text" until someone replaces them with the real card text from the
  Void source. Data model and UI are done; the content isn't.

[0.6.0] — 2026-07-19

Fixed

- Proficiency now auto-scales at tier breaks (levels 2/5/8), matching the same formula
  used when a character is created directly at a higher level. Previously this only
  happened if a player remembered to spend an advancement pick on "+1 Proficiency,"
  so tables that forgot fell permanently behind.
- The manual "+1 Proficiency" advancement option is still pickable at any level. Picking
  it on a level where Proficiency just auto-increased now prompts a confirmation, since
  that stacks an extra point on top of the automatic one.

[0.4.0] — 2026-07-18

Added


- Bulk card import. Compendium screen now has a paste-in importer: one person can type 
  out a whole batch of domain cards (any domain, including Blood/Dread) in a simple text 
  format and import them all at once instead of everyone retyping the same cards into the 
  wizard by hand. Re-pasting a card with the same name updates it in place rather than 
  creating a duplicate, so correcting a typo is just "fix it and re-import."
  
- Imported cards now show up everywhere the built-in library does — the wizard's domain-card 
  picker, and the auto-fill when padding out a higher-level starting character.


[0.3.0] — 2026-07-18

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

Version bumped 0.2.0 → 0.3.0.

### 0.2.0
- Added an in-app version badge (Party Roster header) so you can tell what's deployed
- Fixed: checkboxes throughout the Gear & Notes tab (including weapon **Equipped**
  toggles) weren't registering clicks
- Fixed: Hit Points and Stress pips now start full and count down as marked, per
  table rules (previously started empty and filled up)
- Fixed: Long Rest now also resets Hit Points (Stress and Armor marks were already
  being cleared)

### 0.1.0
- Initial standalone rebuild — ported from the Claude.ai artifact export into a
  dependency-free HTML file that runs in any browser, including as a local file with
  no server

## KNOWN BUGS

None currently tracked.

## Possible future work

- GM dashboard view: GM sees every party member's full character sheet, players see
  only their own (plus everyone's roster-card summary — name/HP/Stress/class/level).
  Creatures/bestiary would become a shared resource like Party inventory rather than
  GM-only. Scoped but not yet built.

- Void domain cards still need someone to type them in once. Blood and Dread have zero 
  cards in them until they're imported — use the new Bulk card import panel in the Compendium 
  (one paste job for whoever volunteers) rather than the old one-field-at-a-time wizard fallback.

- Void class stats are estimates, not confirmed. Evasion/HP for the 6 new classes are placeholders
  (flagged voidPending in code) until checked against the official PDFs — don't take them as gospel yet.
  Class items/weapons now preselect an obvious "pending (Void)" placeholder (0.9.0) instead of the
  generic picker, but still need the real class item swapped in from the Void PDF.

- Transformation cards (Vampire, Werewolf, Reanimated, Shapeshifter, Ghost, Demigod) — data
  model and UI shipped in 0.7.0 (opt-in Transformation tab, same pattern as Wildshape), but
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

  
