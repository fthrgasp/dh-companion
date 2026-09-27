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

**Current version:** shown live in the app itself, top-left of the Party Roster screen.
Compare that number to the top entry in [CHANGELOG.md](CHANGELOG.md) to see if the copy
hosted on GitHub Pages is up to date. The app also checks for updates itself (see
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

The deployed app lives in `/dh-tracker` — a Vite-based, multi-file project (no
framework beyond Vite itself; a small custom template engine handles rendering).
GitHub Actions builds it on every push to `main` and publishes the result to
GitHub Pages. Character data is saved to the browser's `localStorage` by default
(or synced via Supabase if signed in — see below), scoped to whatever URL the
page is served from.

**Optional account sync:** signing in (magic-link email, no password) syncs your
characters and a campaign's shared inventory to a small Postgres backend (Supabase),
so they follow you across devices instead of being stuck in one browser. This is
entirely opt-in — skip it (or sign out) and the app behaves exactly as the fully
local, no-account tool described above. Nothing about a signed-in session is
required to use any character sheet feature.

`Daggerheart_Tracker.html` at the repo root is an earlier, single-file build of
this same app. It's no longer what's deployed and isn't kept in sync with active
development — it's left in the repo as a historical/offline fallback, not a second
copy of the live app.

## Running it

- **Locally (for development):** `cd dh-tracker && npm install && npm run dev`
  starts a Vite dev server. `npm run build` produces a production build in
  `dh-tracker/dist/`.
- **Hosted (recommended for phone/tablet use):** this repo is set up for
  [GitHub Pages](https://pages.github.com/). Every push to `main` rebuilds
  `/dh-tracker` and redeploys automatically. Add the Pages URL to your phone or
  tablet's home screen for an app-like icon and full-screen feel.

## Keeping deployed copies current

Home-screen icons on iOS/iPadOS (and long-lived browser tabs in general) can hold
onto a stale, already-loaded copy of the app well past when a fresh visit would pick
up changes — there's no reload button on a home-screen icon to force it manually.

To fix that, the app polls a small `version.json` file (same folder as the deployed
app) with the browser cache forced off, both on load and whenever it comes back to
the foreground. If the deployed version doesn't match what's currently running, a
banner offers a one-tap reload — character data is in `localStorage`, not in
whatever got cached, so this never touches anyone's saves.

**When you bump `APP_VERSION` in `dh-tracker/src/core/state.js`, bump the version
number in `dh-tracker/public/version.json` to match.** They're two separate files
on purpose — checking a few bytes of JSON is a lot cheaper than re-fetching the
whole app just to compare a version string. If you forget to update
`version.json`, nothing breaks; the banner just won't show up until it's fixed.

## Changelog

Full history lives in [CHANGELOG.md](CHANGELOG.md) — kept there only, so it never
drifts out of sync with a second copy in this file.

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

  
