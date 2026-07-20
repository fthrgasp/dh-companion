import { saveJSON } from '../core/storage.js';

export const compendiumMixin = {
  saveClasses(list) { saveJSON(this.gk('dh-tracker-classes'), list); },

  upClasses(fn) {
    this.setState(s => {
      const list = JSON.parse(JSON.stringify(s.customClasses || []));
      fn(list);
      this.saveClasses(list);
      return { customClasses: list };
    });
  },

  saveAncestries(list) { saveJSON(this.gk('dh-tracker-ancestries'), list); },

  upAncestries(fn) {
    this.setState(s => {
      const list = JSON.parse(JSON.stringify(s.customAncestries || []));
      fn(list);
      this.saveAncestries(list);
      return { customAncestries: list };
    });
  },

  saveDomains(domains) { saveJSON(this.gk('dh-tracker-domains'), domains); },

  upDomains(fn) {
    this.setState(s => {
      const domains = JSON.parse(JSON.stringify(s.customDomains || []));
      fn(domains);
      this.saveDomains(domains);
      return { customDomains: domains };
    });
  },

  domainPalette() {
    return ['#6B4FA0', '#B05580', '#3B6EA3', '#4E7A4E', '#B08A2E', '#3A3550', '#7A7468', '#A33B3B', '#B0622E'];
  },

  saveImportedCards(imported) { saveJSON(this.gk('dh-tracker-imported-cards'), imported); },

  upImportedCards(fn) {
    this.setState(s => {
      const imported = JSON.parse(JSON.stringify(s.importedDomainCards || {}));
      fn(imported);
      this.saveImportedCards(imported);
      return { importedDomainCards: imported };
    });
  },

  domainColor(d) {
    const builtin = { Arcana: '#6B4FA0', Blade: '#A33B3B', Bone: '#7A7468', Codex: '#3B6EA3', Grace: '#B05580', Midnight: '#3A3550', Sage: '#4E7A4E', Splendor: '#B08A2E', Valor: '#B0622E', Blood: '#7A1F2B', Dread: '#241B2F' };
    if (builtin[d]) return builtin[d];
    const custom = (this.state.customDomains || []).find(x => x.name === d);
    return custom ? custom.color : '#7A7468';
  },

  // Merges the built-in domain card library with anything pasted in through
  // the bulk card importer, so both the wizard and the compendium reference
  // list see one combined set without caring where a card came from.
  effectiveDomainCardLibrary() {
    const lib = this.domainCardLibrary();
    const imported = this.state.importedDomainCards || {};
    const merged = {};
    Object.keys(lib).forEach(d => { merged[d] = lib[d].slice(); });
    Object.keys(imported).forEach(d => { merged[d] = (merged[d] || []).concat(imported[d]); });
    return merged;
  },

  // Parses the bulk card-import text format:
  //   DOMAIN: Blood
  //   CARD: Ravenous Bite
  //   TYPE: Ability
  //   LEVEL: 1
  //   TEXT: On a successful attack, mark a Stress to deal an extra 1d6 damage.
  // TYPE and LEVEL are optional (default to Ability / 1). TEXT can span
  // multiple lines — everything after it belongs to that card until the next
  // DOMAIN/CARD/TYPE/LEVEL/TEXT line. Returns { cards, errors } where errors
  // are human-readable, line-numbered strings for anything that got skipped.
  parseCardImportText(raw) {
    const lines = (raw || '').split(/\r?\n/);
    const cards = [];
    const errors = [];
    let domain = '';
    let current = null;
    let textLines = null;
    const flushText = () => {
      if (current && textLines !== null) current.text = textLines.join('\n').trim();
      textLines = null;
    };
    const flushCard = () => {
      flushText();
      if (current) {
        if (!current.domain) errors.push('Line ' + current.line + ': "' + (current.name || '(unnamed)') + '" appears before any DOMAIN: line — skipped.');
        else if (!current.name) errors.push('Line ' + current.line + ': CARD: with no name — skipped.');
        else if (!current.text) errors.push('Line ' + current.line + ': "' + current.name + '" has no TEXT — skipped.');
        else cards.push(current);
      }
      current = null;
    };
    lines.forEach((line, idx) => {
      const lineNo = idx + 1;
      const domainMatch = line.match(/^\s*DOMAIN\s*:\s*(.*)$/i);
      const cardMatch = line.match(/^\s*CARD\s*:\s*(.*)$/i);
      const typeMatch = line.match(/^\s*TYPE\s*:\s*(.*)$/i);
      const levelMatch = line.match(/^\s*LEVEL\s*:\s*(.*)$/i);
      const textMatch = line.match(/^\s*TEXT\s*:\s*(.*)$/i);
      if (domainMatch) {
        flushCard();
        domain = domainMatch[1].trim();
      } else if (cardMatch) {
        flushCard();
        current = { domain, name: cardMatch[1].trim(), type: 'Ability', level: 1, text: '', line: lineNo };
      } else if (typeMatch && current) {
        flushText();
        current.type = typeMatch[1].trim() || 'Ability';
      } else if (levelMatch && current) {
        flushText();
        const lvl = parseInt(levelMatch[1], 10);
        current.level = isNaN(lvl) ? 1 : Math.max(1, Math.min(10, lvl));
      } else if (textMatch && current) {
        textLines = [textMatch[1]];
      } else if (textLines !== null) {
        textLines.push(line);
      }
    });
    flushCard();
    return { cards, errors };
  },

  classData() {
    return {
      Bard: { domains: ['Grace', 'Codex'], subclasses: ['Troubadour', 'Wordsmith'], evasion: 10, hp: 5,
        weapons: [{ id: 'lute-rapier', name: 'Rapier', range: 'Melee', damage: 'd8+1 phy' }, { id: 'hand-crossbow', name: 'Hand crossbow', range: 'Close', damage: 'd6+1 phy' }],
        armors: [{ id: 'silk', name: 'Silk doublet', score: 2 }, { id: 'leather', name: 'Leather armor', score: 3 }] },
      Druid: { domains: ['Sage', 'Arcana'], subclasses: ['Warden of the Elements', 'Warden of Renewal'], evasion: 10, hp: 6,
        weapons: [{ id: 'wooden-staff', name: 'Wooden staff', range: 'Far', damage: 'd6 mag' }, { id: 'sickle', name: 'Sickle', range: 'Melee', damage: 'd6+2 phy' }],
        armors: [{ id: 'bark', name: 'Woven bark armor', score: 2 }, { id: 'hide', name: 'Beast-hide armor', score: 3 }] },
      Guardian: { domains: ['Valor', 'Blade'], subclasses: ['Stalwart', 'Vengeance'], evasion: 9, hp: 7,
        weapons: [{ id: 'battleaxe', name: 'Battleaxe', range: 'Melee', damage: 'd10+3 phy' }, { id: 'warhammer', name: 'Warhammer', range: 'Melee', damage: 'd8+3 phy' }],
        armors: [{ id: 'chainmail', name: 'Chainmail', score: 4 }, { id: 'plate', name: 'Full plate', score: 5 }] },
      Ranger: { domains: ['Bone', 'Sage'], subclasses: ['Beastbound', 'Wayfinder'], evasion: 12, hp: 6,
        weapons: [{ id: 'shortbow', name: 'Shortbow', range: 'Far', damage: 'd6+2 phy' }, { id: 'twin-daggers', name: 'Twin daggers', range: 'Melee', damage: 'd8+1 phy' }],
        armors: [{ id: 'leather', name: 'Leather armor', score: 3 }, { id: 'gambeson', name: 'Gambeson', score: 2 }] },
      Rogue: { domains: ['Grace', 'Midnight'], subclasses: ['Nightwalker', 'Syndicate'], evasion: 12, hp: 6,
        weapons: [{ id: 'dagger', name: 'Dagger', range: 'Melee', damage: 'd8+1 phy' }, { id: 'throwing-knives', name: 'Throwing knives', range: 'Close', damage: 'd6+1 phy' }],
        armors: [{ id: 'leather', name: 'Leather armor', score: 3 }, { id: 'quilted', name: 'Quilted cloak', score: 2 }] },
      Seraph: { domains: ['Splendor', 'Valor'], subclasses: ['Divine Wielder', 'Winged Sentinel'], evasion: 9, hp: 7,
        weapons: [{ id: 'warhammer', name: 'Warhammer', range: 'Melee', damage: 'd8+3 phy' }, { id: 'mace', name: 'Mace', range: 'Melee', damage: 'd8+2 phy' }],
        armors: [{ id: 'chainmail', name: 'Chainmail', score: 4 }, { id: 'plate', name: 'Full plate', score: 5 }] },
      Sorcerer: { domains: ['Arcana', 'Midnight'], subclasses: ['Elemental Origin', 'Primal Origin'], evasion: 10, hp: 6,
        weapons: [{ id: 'arcane-gauntlet', name: 'Arcane gauntlet', range: 'Melee', damage: 'd6+2 mag' }, { id: 'wand', name: 'Wand', range: 'Far', damage: 'd6+1 mag' }],
        armors: [{ id: 'robes', name: 'Robes', score: 2 }, { id: 'leather', name: 'Leather armor', score: 3 }] },
      Warrior: { domains: ['Blade', 'Bone'], subclasses: ['Call of the Brave', 'Call of the Slayer'], evasion: 11, hp: 7,
        weapons: [{ id: 'longsword', name: 'Longsword', range: 'Melee', damage: 'd8+3 phy' }, { id: 'greatsword', name: 'Greatsword', range: 'Melee', damage: 'd10+3 phy' }],
        armors: [{ id: 'chainmail', name: 'Chainmail', score: 4 }, { id: 'leather', name: 'Leather armor', score: 3 }] },
      Wizard: { domains: ['Codex', 'Splendor'], subclasses: ['School of Knowledge', 'School of War'], evasion: 11, hp: 5,
        weapons: [{ id: 'staff', name: 'Staff', range: 'Far', damage: 'd6+1 mag' }, { id: 'grimoire', name: 'Bound grimoire', range: 'Close', damage: 'd6+1 mag' }],
        armors: [{ id: 'robes', name: 'Robes', score: 2 }, { id: 'leather', name: 'Leather armor', score: 3 }] },

      // --- The Void (playtest classes, current as of the 2026-07-09 update) ---
      // Domains and subclass names below are confirmed against daggerheart.com/thevoid.
      // evasion/hp are flagged VOID-EST where not independently confirmed — cross-check
      // against your Void PDF and correct here before play. weapons/armors below are
      // placeholder stand-ins (obviously-fake names, no real damage/score guessed) so
      // the wizard has a class item to preselect instead of falling to the generic
      // picker — replace with the real class item from the Void PDF before play.
      Assassin: { domains: ['Blade', 'Midnight'], subclasses: ['Executioners Guild', 'Poisoners Guild'], evasion: 12, hp: 6, voidPending: true,
        weapons: [{ id: 'assassin-pending', name: 'Class item — pending (Void)', range: 'Melee', damage: '' }],
        armors: [{ id: 'assassin-armor-pending', name: 'Armor — pending (Void)', score: 3 }] },
      Witch: { domains: ['Dread', 'Sage'], subclasses: ['Hedge', 'Moon'], evasion: 10, hp: 6, voidPending: true,
        weapons: [{ id: 'witch-pending', name: 'Class item — pending (Void)', range: 'Melee', damage: '' }],
        armors: [{ id: 'witch-armor-pending', name: 'Armor — pending (Void)', score: 3 }] },
      Warlock: { domains: ['Dread', 'Grace'], subclasses: ['Pact of the Endless', 'Pact of the Wrathful'], evasion: 10, hp: 6, voidPending: true,
        weapons: [{ id: 'warlock-pending', name: 'Class item — pending (Void)', range: 'Melee', damage: '' }],
        armors: [{ id: 'warlock-armor-pending', name: 'Armor — pending (Void)', score: 3 }] },
      Brawler: { domains: ['Bone', 'Valor'], subclasses: ['Juggernaut', 'Martial Artist'], evasion: 10, hp: 7, voidPending: true,
        weapons: [{ id: 'brawler-pending', name: 'Class item — pending (Void)', range: 'Melee', damage: '' }],
        armors: [{ id: 'brawler-armor-pending', name: 'Armor — pending (Void)', score: 3 }] },
      'Blood Hunter': { domains: ['Blood', 'Bone'], subclasses: ['Order of the Lycan', 'Order of the Mutant', 'Order of the Specter'], evasion: 10, hp: 6, voidPending: true,
        weapons: [{ id: 'bloodhunter-pending', name: 'Class item — pending (Void)', range: 'Melee', damage: '' }],
        armors: [{ id: 'bloodhunter-armor-pending', name: 'Armor — pending (Void)', score: 3 }] },
      Summoner: { domains: ['Blood', 'Splendor'], subclasses: ['Necromancy', 'Theurgy'], evasion: 10, hp: 6, voidPending: true,
        weapons: [{ id: 'summoner-pending', name: 'Class item — pending (Void)', range: 'Melee', damage: '' }],
        armors: [{ id: 'summoner-armor-pending', name: 'Armor — pending (Void)', score: 3 }] }
    };
  },

  domainCardLibrary() {
    return {
      Arcana: [
        { name: 'Arcane Barrage', type: 'Spell', text: 'Spellcast vs a target within Far range. On a success, deal d8+2 magic damage.' },
        { name: 'Wild Surge', type: 'Spell', text: 'Mark a Stress to add a d6 to your next spellcast damage roll, then roll a d4 — on a 1, take d4 magic damage.' }
      ],
      Blade: [
        { name: 'Get Back Up', type: 'Ability', text: 'When you take Severe damage, mark a Stress to reduce the severity by one threshold.' },
        { name: 'Whirlwind', type: 'Ability', text: 'On a successful attack, spend a Hope to also strike another target within Very Close range for half damage.' }
      ],
      Bone: [
        { name: 'Gifted Tracker', type: 'Ability', text: 'While tracking, spend a Hope to ask the GM a question about the creature you are pursuing.' },
        { name: 'Vicious Entangle', type: 'Spell', text: 'Spellcast vs a target within Far range. On a success, deal d8+1 magic damage and temporarily Restrain them.' }
      ],
      Codex: [
        { name: 'Book of Illiat', type: 'Grimoire', text: 'Slumber, Arcane Barrage, Telepathy — minor workings copied into this grimoire.' },
        { name: 'Runic Ward', type: 'Spell', text: 'Spend a Hope to grant an ally a +2 bonus to their next Evasion roll.' }
      ],
      Grace: [
        { name: "Gifted Performer", type: 'Ability', text: 'Once per rest, use a performance to inspire an ally with a d4 bonus on their next roll.' },
        { name: 'Rousing Speech', type: 'Ability', text: 'Spend 3 Hope to give all nearby allies a Rally die to spend on any roll this scene.' }
      ],
      Midnight: [
        { name: "Shadow Step", type: 'Ability', text: 'Mark a Stress to teleport to a shadow within Far range you can see.' },
        { name: 'Uncanny Disguise', type: 'Ability', text: 'Spend a Hope to take on the appearance of anyone you have studied for at least a minute.' }
      ],
      Sage: [
        { name: 'Wild Growth', type: 'Spell', text: 'Spend a Hope to grow thick brambles in a Close area, making it difficult terrain for foes.' },
        { name: 'Kinship', type: 'Ability', text: 'Once per rest, call on a nearby animal to scout, fetch, or distract on your behalf.' }
      ],
      Splendor: [
        { name: 'Mending Touch', type: 'Spell', text: 'Spend 2 Hope to clear a marked Hit Point or 2 Stress on a creature you touch.' },
        { name: 'Radiant Aegis', type: 'Spell', text: 'Mark a Stress to grant an ally within Close range a temporary +3 to their next Armor Score.' }
      ],
      Valor: [
        { name: "Stand Together", type: 'Ability', text: 'When an ally within Melee range would take damage, mark a Stress to redirect it to yourself.' },
        { name: "I Am Your Shield", type: 'Ability', text: 'Spend a Hope to grant an ally the Vulnerable condition to attackers other than you until your next turn.' }
      ],
      // The Void (playtest) domains. No pre-loaded cards on purpose — the
      // official card text has to come from your own copy of the Void PDFs.
      // With an empty array here, the character wizard's domain-card step
      // automatically falls back to blank name/text fields (see wizCards in
      // renderVals) instead of a pick-list, so this is exactly where you
      // paste each card's real text in as you build it out.
      Blood: [],
      Dread: []
    };
  },

  ancestryList() {
    return ['Clank', 'Drakona', 'Dwarf', 'Elf', 'Faerie', 'Faun', 'Firbolg', 'Fungril', 'Galapa', 'Giant', 'Goblin', 'Halfling', 'Human', 'Infernis', 'Katari', 'Orc', 'Ribbet', 'Simiah',
      // The Void
      'Aetheris', 'Earthkin', 'Emberkin', 'Skykin', 'Tidekin', 'Gnome'];
  },

  communityList() {
    return ['Highborne', 'Loreborne', 'Orderborne', 'Ridgeborne', 'Seaborne', 'Slyborne', 'Underborne', 'Wanderborne', 'Wildborne',
      // The Void
      'Duneborne', 'Freeborne', 'Frostborne', 'Hearthborne', 'Reborne', 'Warborne'];
  },

  weaponPresets() {
    return [
      { id: 'melee', name: 'Longsword', range: 'Melee', damage: 'd8+3 phy' },
      { id: 'ranged', name: 'Shortbow', range: 'Far', damage: 'd6+2 phy' },
      { id: 'magic', name: 'Arcane Staff', range: 'Far', damage: 'd6+2 mag' }
    ];
  },

  armorPresets() {
    return [
      { id: 'light', name: 'Leather armor', score: 3 },
      { id: 'medium', name: 'Chainmail', score: 4 },
      { id: 'heavy', name: 'Full plate', score: 5 }
    ];
  }
};

export const companionCompendiumTemplate = `
<!-- ============ COMPANION COMPENDIUM ============ -->
<sc-if value="{{isCompendium}}" hint-placeholder-val="{{ false }}">
<div data-screen-label="Companion Compendium" style="max-width:920px;margin:0 auto;padding:48px 32px">
  <div style="display:flex;align-items:center;gap:14px;border-bottom:2px solid var(--text);padding-bottom:14px;margin-bottom:20px">
    <button sc-camel-on-click="{{goRoster}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer" style-hover="border-color:var(--text)">← Roster</button>
    <h1 style="font-family:'Spectral',serif;font-weight:600;font-size:30px;margin:0;letter-spacing:-0.01em;flex:1">Companion Compendium</h1>
  </div>
  <p style="font-size:13px;color:var(--muted);margin:0 0 18px">Every companion across the party, at a glance. Tap a card to jump to its owner.</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
    <sc-for list="{{compendiumList}}" as="cm" hint-placeholder-count="2">
      <div sc-camel-on-click="{{cm.openOwner}}" style="position:relative;background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px;cursor:pointer" style-hover="border-color:var(--accent,#8C5A2B)">
        <button sc-camel-on-click="{{cm.askDelete}}" title="Remove companion" style="position:absolute;top:12px;right:12px;width:24px;height:24px;border:none;background:none;color:#b3ab9d;cursor:pointer;font-size:14px;line-height:1;z-index:1" style-hover="color:#A33B3B">✕</button>
        <sc-if value="{{cm.confirmingDelete}}" hint-placeholder-val="{{ false }}">
          <div sc-camel-on-click="{{cm.stopClick}}" style="position:absolute;inset:0;background:var(--panel);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:16px;text-align:center;cursor:default;z-index:2">
            <div style="font-size:13px;color:var(--muted)">Remove {{cm.name}}?</div>
            <div style="display:flex;gap:8px">
              <button sc-camel-on-click="{{cm.cancelDelete}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer">Cancel</button>
              <button sc-camel-on-click="{{cm.confirmDelete}}" style="border:none;background:#A33B3B;color:#fff;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer">Remove</button>
            </div>
          </div>
        </sc-if>
        <div style="font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted)">{{cm.ownerName}}'s companion</div>
        <div style="font-family:'Spectral',serif;font-size:19px;font-weight:600;margin-top:2px">{{cm.name}}</div>
        <div style="font-size:12.5px;color:var(--muted);margin-bottom:10px">{{cm.movement}}</div>
        <div style="display:flex;gap:10px;margin-bottom:10px">
          <div style="flex:1;border:1px solid var(--border);border-radius:8px;padding:6px;text-align:center"><div style="font-size:9.5px;color:var(--muted);text-transform:uppercase">Difficulty</div><div style="font-family:'Spectral',serif;font-size:17px;font-weight:600">{{cm.difficulty}}</div></div>
          <div style="flex:2;border:1px solid var(--border);border-radius:8px;padding:6px 8px"><div style="font-size:9.5px;color:var(--muted);text-transform:uppercase">Attack</div><div style="font-size:12.5px;font-weight:600">{{cm.attack}}</div></div>
        </div>
        <div style="font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#5B4A8A;margin-bottom:5px">Stress {{cm.stTxt}}</div>
        <div style="display:flex;gap:5px;margin-bottom:10px"><sc-for list="{{cm.stPips}}" as="p" hint-placeholder-count="3"><div style="width:18px;height:18px;border:2px solid #5B4A8A;background:{{p.bg}};border-radius:999px"></div></sc-for></div>
        <div style="font-size:12px;color:var(--muted)"><strong style="color:var(--text)">Features:</strong> {{cm.featuresTxt}}</div>
      </div>
    </sc-for>
  </div>
</div>
</sc-if>`;
