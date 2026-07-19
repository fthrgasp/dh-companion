# Card Import Template

Paste this whole file into the **Bulk card import** box on the Compendium screen, then fill in the blanks. Delete any blocks you don't use.

## The block (copy/paste this per card)

```
CARD: 
TYPE: Ability
LEVEL: 1
TEXT: 
```

- **CARD** — the card's name.
- **TYPE** — Ability, Spell, or Grimoire. Optional, defaults to Ability if you leave it.
- **LEVEL** — 1–10. Optional, defaults to 1 if you leave it.
- **TEXT** — the card's full text, exactly as written. Can run multiple lines — just keep typing, it'll all get captured until the next `CARD:` or `DOMAIN:` line.

Every block needs a `DOMAIN:` line above it somewhere (doesn't need to repeat on every card — one `DOMAIN:` line switches the domain for every card after it, until the next `DOMAIN:` line).

## Ready-to-fill starter (all 11 domains, blank cards under each)

```
DOMAIN: Arcana
CARD: 
TEXT: 

CARD: 
TEXT: 

DOMAIN: Blade
CARD: 
TEXT: 

CARD: 
TEXT: 

DOMAIN: Blood
CARD: 
TEXT: 

CARD: 
TEXT: 

DOMAIN: Bone
CARD: 
TEXT: 

CARD: 
TEXT: 

DOMAIN: Codex
CARD: 
TEXT: 

CARD: 
TEXT: 

DOMAIN: Dread
CARD: 
TEXT: 

CARD: 
TEXT: 

DOMAIN: Grace
CARD: 
TEXT: 

CARD: 
TEXT: 

DOMAIN: Midnight
CARD: 
TEXT: 

CARD: 
TEXT: 

DOMAIN: Sage
CARD: 
TEXT: 

CARD: 
TEXT: 

DOMAIN: Splendor
CARD: 
TEXT: 

CARD: 
TEXT: 

DOMAIN: Valor
CARD: 
TEXT: 

CARD: 
TEXT: 
```

Need more than 2 slots under a domain? Just copy/paste another:

```
CARD: 
TEXT: 
```

right after the last one in that section — as many times as you need. The importer doesn't care how many cards are under a domain.

## Quick tips
- Blank `CARD:` or `TEXT:` lines get skipped on import, but they *will* show up in the "skipped lines" list after you hit Import — that's expected, not an error to worry about. It's just confirming it didn't invent a card from nothing.
- Re-importing a card with the same name later updates it instead of duplicating it — so if you paste this partially today and come back to add more next week, nothing gets doubled up.
