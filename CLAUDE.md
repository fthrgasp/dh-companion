# DH Character Companion (Daggerheart Tracker) — Project Context

## What this is
A single-file HTML/CSS/JS character tracker for a Daggerheart tabletop RPG group
(3-5 players + GM). Built for a small group that plays at a physical table —
this is NOT a virtual tabletop like Roll20. No realtime sync needed; "refresh to
see current state" is the accepted UX for shared data.

This is a passion project. Prioritize clean, maintainable solutions over speed-hacks.

## Current architecture (v0.9.0, as of last full audit)

**Not React.** A homegrown ~250-line template engine (`DcEngine`) baked into the
single HTML file:
- Handlebars-style `{{bindings}}`
- `sc-if` conditionals, mustache-lite loops
- `x-import` tag pulling in a hosted `image-slot` component for photo uploads
- One `Component` class extending a tiny `DCLogic` base
- `setState` triggers full re-paint, no diffing
- Zero build step, zero dependencies — ugly under the hood, bulletproof to ship

**State model:** one big `state` object, no Redux/Context.
- Nav: `screen` (roster/sheet/compendium/creatures/party/recaps), `activeId`, `tab`
- Characters: `chars[]`, built via creation wizard
- Session tooling: `sessionElapsed`, `sessionRunning` (persisted running clock)
- World content: `customClasses`, `customAncestries`, `customDomains`, `creatures[]`
- Campaign log: `party[]`, `recaps[]`
- Theming: `dark`, `gameAccent`, `bannerMode`
- Multi-campaign: `games[]`, `activeGame` — already implemented

**Persistence:** `localStorage`, namespaced per key (`dh-tracker-v1`,
`dh-tracker-party`, etc.) via a `gk()` helper that suffixes keys by `activeGame`
id. This already amounts to multi-campaign support in one browser — separate
save slots and theme per slot, switchable via a game-menu dropdown.

**Six screens:**
1. Roster — campaign home, character list, optional background banner
2. Sheet — play tab (HP/stress/hope pips, damage calc, conditions, domain
   cards, weapons, companion/wildshape for Ranger/Druid), edit tab, companion tab
3. Compendium — classes/ancestries/domains reference + custom content editor,
   includes bulk card importer (paste plain-text card blocks, dedupes by name,
   line-numbered error reporting on skipped entries)
4. Creatures — bestiary (tier/difficulty/attacks/thresholds)
5. Party — shared inventory/resources
6. Recaps — session log

**Other notable bits:**
- Undo system (`showUndo`/`performUndo`) for destructive actions
- Character creation wizard, multiclass support, trait-array rolling, and a
  dedicated Step 0 (Level 1 vs Higher Level) before anything else — this was
  moved up because it confused new players in the first "zero session"
- Damage calc: armor, thresholds (major/severe), auto-marks HP
- Version-tagged (`APP_VERSION` const) with schema migration functions
  (`normalizeCreature`, `normalizeCompanion`)
- Includes content from Daggerheart's playtest expansion "The Void": 6 classes
  (Assassin, Witch, Warlock, Brawler, Blood Hunter, Summoner), 2 new domains
  (Blood, Dread), 6 ancestries, 6 communities — covered under the DPCGL
  (Darrington Press Community Gaming License) for non-commercial use

## What's genuinely missing (the only real gap)
1. **Multi-user support**
2. **Persistent database storage**

Everything else in the app is refinement, not a rebuild. The state schema is
already shaped in a way that should port to a real backend with minimal
redesign — swapping `localStorage` calls for API calls is the bulk of the work,
not a data model overhaul.

## Agreed target architecture (not yet built)
- **Backend:** Supabase (Postgres + auth + REST API)
- **Hosting:** Vercel or Netlify, free tier
- **No realtime sync** — explicitly ruled out as unnecessary for a physical-table
  group; refresh-based state is the right tradeoff
- Raw AWS was considered and rejected as overkill for a zero-cost, low-traffic,
  small-group app

## Agreed build order
1. Auth + character sheet CRUD (solves the immediate cross-device problem)
2. Shared inventory with row-locking for concurrency + permission logic
3. GM dashboard view (GM sees all party sheets; players see only their own;
   GM-only NPC roster)
4. Homebrew-specific features

## Hard rules / non-negotiables
- **Card text must be verbatim** from official Daggerheart/Void source material,
  never paraphrased. This is why the bulk importer exists — it lets a player
  paste official text directly rather than someone retyping/summarizing it.
- Keep changelog and `APP_VERSION` updated with every meaningful change.
- This project is intentionally kept separate from the person's other
  "Campaign Ledger" project — don't cross-pollinate scope.

## Working style
- Direct, no-fluff. Skip the preamble.
- Flag genuine uncertainty rather than guessing/fabricating.
- Verify JS changes with `node --check` on extracted script blocks (was
  previously a single-file HTML, so may need extraction) or normal lint/build
  tooling once the repo is properly modularized.
