# DH Character Companion (Daggerheart Tracker) — Project Context

## What this is
A single-file HTML/CSS/JS character tracker for a Daggerheart tabletop RPG group
(3-5 players + GM). Built for a small group that plays at a physical table —
this is NOT a virtual tabletop like Roll20. No realtime sync needed; "refresh to
see current state" is the accepted UX for shared data.

This is a passion project. Prioritize clean, maintainable solutions over speed-hacks.

## Current architecture (v0.12.0, as of last full audit)

**Not React.** A homegrown ~250-line template engine (`DcEngine`):
- Handlebars-style `{{bindings}}`
- `sc-if` conditionals, mustache-lite loops
- `x-import` tag rendering an inline `image-slot` widget for photo uploads
  (self-contained in `core/dcEngine.js`, not an external dependency)
- One `Component` class extending a tiny `DCLogic` base
- `setState` triggers full re-paint, no diffing

**Build step: Vite.** As of the `/dh-tracker` restructure, the app is a proper
multi-file Vite project (`/dh-tracker/src/...`), not a single HTML file. This
is a deliberate reversal of the earlier "zero build step, zero dependencies"
stance — `npm install` + `npm run dev`/`build`/`preview` inside `/dh-tracker`.
Layout: `core/` (template engine, state, undo, migrations, storage, supabase),
`screens/` (one file per screen, owning both its mutation logic and its
template-string markup), `features/` (character wizard, damage calculator).
`renderVals()` itself stays one large method in `main.js` rather than split
per-screen — the sheet-tab section is too tangled (shared `theme`/`accent`/`c`
context across 10 tabs) to decompose cleanly without real risk; splitting
methods and markup out of the monolith was the actual pain point, and that's
done. Every `localStorage` call in the app funnels through `core/storage.js`
(five generic primitives: `loadJSON`/`saveJSON`/`loadRaw`/`saveRaw`/`removeRaw`)
— no other file touches `localStorage` directly.
The original single-file `Daggerheart_Tracker.html` is kept at the repo root
as a fallback, not actively maintained; treat `/dh-tracker` as the live app.

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

## Multi-user / persistent storage — Supabase, in progress
- **Backend:** Supabase (Postgres + auth + REST API). Project: "Daggerheart
  Character Tracker" (ref `rrflddwsjxeajyldmwrh`).
- **Hosting:** Vercel or Netlify, free tier (not yet deployed anywhere — still
  local dev).
- **No realtime sync** — explicitly ruled out as unnecessary for a physical-table
  group; refresh-based state is the right tradeoff.
- Supabase JS client loaded via CDN `<script>` tag (not an npm dependency) —
  deliberate, to keep the Supabase integration itself a "pure addition" not
  tied to bundler-specific version resolution.

## Build order
1. **Shipped.** Auth (magic-link email, `core/supabase.js`) + character sheet
   CRUD (`characters` table, RLS by `owner_id`). Signing out / never signing in
   still works fully offline — local-first is the fallback, not a special case.
2. **Shipped.** Shared inventory (`party_items` table). Required building out a
   real "shared campaign" concept from scratch (`games` + `game_members`
   tables) since `games[]`/`activeGame` was previously 100% client-local with
   no way for two devices to agree on the same campaign. Join model: shareable
   link (anyone with the link auto-joins on sign-in, no approval step).
   Permissions: anyone in the campaign can edit anything. Concurrency:
   last-write-wins (chosen over per-row version-checking as unnecessary
   complexity at this table size).
3. **Not started — scope discussed, not finalized.** GM dashboard view: GM
   sees every party member's full character sheet, players see only their own
   full sheet **but everyone sees everyone's roster-card summary** (name/HP/
   stress/class/level) — this last part is a deliberate addition beyond the
   original "players see only their own" framing. **Creatures/bestiary is
   explicitly NOT going GM-only** (a deliberate departure from earlier
   framing) — it becomes a shared resource like Party inventory, same
   "anyone can edit anything" model, its own Supabase table mirroring
   `party_items`.
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
- Verify JS changes with `node --check` per file, plus `npm run build` inside
  `/dh-tracker` for a full production-build sanity check. Verify UI changes by
  running `npm run dev` inside `/dh-tracker` (Vite dev server) and checking in
  a browser — don't rely on syntax checks alone for behavior.
