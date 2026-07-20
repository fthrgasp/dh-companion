import { APP_VERSION } from '../core/state.js';

export const rosterMixin = {
  // Strips characters that would be awkward/unsafe in a downloaded filename,
  // collapsing whitespace to nothing rather than swapping in underscores.
  sanitizeFilename(str) {
    return (str || '').replace(/[^a-zA-Z0-9_-]+/g, '');
  },

  downloadJson(filename, dataObj) {
    const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  exportCharacterJson() {
    const c = this.active();
    if (!c) return;
    const charName = this.sanitizeFilename(c.name) || 'character';
    const campaign = ((this.state.games || []).find(g => g.id === this.state.activeGame) || { name: 'campaign' }).name;
    const campaignName = this.sanitizeFilename(campaign) || 'campaign';
    const payload = Object.assign({}, JSON.parse(JSON.stringify(c)), { schemaVersion: APP_VERSION });
    this.downloadJson(charName + '-' + campaignName + '.json', payload);
  },

  // Required for a file to be treated as a character at all — deliberately
  // small; normalizeChar() backfills everything else. 'class'/'stats' in the
  // feature spec map to this schema's klass/traits fields.
  importRequiredKeys() {
    return ['name', 'klass', 'traits', 'hp', 'inventory'];
  },

  handleImportedFile(rawText) {
    let raw;
    try {
      raw = JSON.parse(rawText);
    } catch (e) {
      this.setState({ importError: 'That file isn’t valid JSON — nothing was imported.' });
      return;
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      this.setState({ importError: 'That file doesn’t look like a character export — nothing was imported.' });
      return;
    }
    const missing = this.importRequiredKeys().filter(k => !(k in raw));
    if (missing.length) {
      this.setState({ importError: 'That file is missing required character data (' + missing.join(', ') + ') — nothing was imported.' });
      return;
    }

    // Snapshot which top-level keys the import actually specified BEFORE
    // migration fills in defaults for anything missing — otherwise every
    // field would look "present" post-migration and the merge path below
    // couldn't tell a real value apart from a backfilled default.
    const rawKeys = Object.keys(raw).filter(k => k !== 'schemaVersion');
    const migrated = JSON.parse(JSON.stringify(raw));
    delete migrated.schemaVersion;
    this.normalizeChar(migrated);

    const chars = this.state.chars || [];
    const norm = n => (n || '').trim().toLowerCase();
    const dup = (migrated.id && chars.find(ch => ch.id === migrated.id))
      || chars.find(ch => norm(ch.name) === norm(migrated.name));

    if (!dup) {
      if (!migrated.id || chars.some(ch => ch.id === migrated.id)) migrated.id = 'c' + Date.now();
      this.upAll(list => list.push(migrated));
      return;
    }
    this.setState({ importConflict: { migrated, rawKeys, existingId: dup.id } });
  },

  importAsNewChar(migrated, rawKeys, chars) {
    const nc = JSON.parse(JSON.stringify(migrated));
    nc.id = 'c' + Date.now();
    const baseName = nc.name || 'Imported character';
    const norm = n => (n || '').trim().toLowerCase();
    let n = 2;
    nc.name = baseName;
    while (chars.some(ch => norm(ch.name) === norm(nc.name))) {
      nc.name = baseName + ' (' + n + ')';
      n++;
    }
    return nc;
  },

  mergeChar(existing, migrated, rawKeys) {
    const merged = JSON.parse(JSON.stringify(existing));
    rawKeys.forEach(k => {
      if (k === 'id') return; // never change the existing character's id on merge
      merged[k] = migrated[k];
    });
    return merged;
  },

  computeMergeDiff(existing, migrated, rawKeys) {
    const lines = [];
    const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const label = k => ({ klass: 'Class', hp: 'HP', armorScore: 'Armor Score' }[k]) || (k.charAt(0).toUpperCase() + k.slice(1));
    const pipDiff = (name, oldV, newV, keys) => {
      const parts = keys.filter(k => oldV[k] !== newV[k]).map(k => k + ' ' + oldV[k] + '→' + newV[k]);
      if (parts.length) lines.push(name + ': ' + parts.join(', '));
    };
    rawKeys.forEach(k => {
      if (k === 'id') return;
      const oldV = existing[k], newV = migrated[k];
      if (eq(oldV, newV)) return;
      if ((k === 'hp' || k === 'stress' || k === 'hope' || k === 'armor') && oldV && newV) {
        pipDiff(label(k), oldV, newV, ['max', 'marked']);
      } else if (k === 'thresholds' && oldV && newV) {
        pipDiff('Thresholds', oldV, newV, ['major', 'severe']);
      } else if (k === 'traits' && oldV && newV) {
        pipDiff('Traits', oldV, newV, Object.keys(newV));
      } else if (k === 'gold' && oldV && newV) {
        pipDiff('Gold', oldV, newV, Object.keys(newV));
      } else if (Array.isArray(oldV) && Array.isArray(newV)) {
        const delta = newV.length - oldV.length;
        lines.push(label(k) + ': ' + oldV.length + ' → ' + newV.length + ' item(s)' + (delta ? ' (' + (delta > 0 ? '+' : '') + delta + ')' : ''));
      } else if (typeof oldV !== 'object' && typeof newV !== 'object') {
        lines.push(label(k) + ': ' + oldV + ' → ' + newV);
      } else {
        lines.push(label(k) + ' changed');
      }
    });
    return lines;
  },

  // Sample seed data — kept verbatim from the pre-persistence version of the
  // app. Not called anywhere; left in place during the file split rather than
  // dropped, since deciding to delete unused code is out of scope for a pure
  // reorganization. Candidate for removal in a future cleanup pass.
  defaults() {
    let n = 1;
    const id = () => 'c' + (n++);
    return [
      {
        id: id(), name: 'Marlowe Thistledown', pronouns: 'she/her', ancestry: 'Katari', community: 'Wildborne',
        klass: 'Ranger', subclass: 'Beastbound', multiclass: null, level: 3, proficiency: 2,
        domains: ['Bone', 'Sage'], evasion: 12, armorScore: 3,
        traits: { Agility: 2, Strength: 0, Finesse: 1, Instinct: 1, Presence: 0, Knowledge: -1 },
        hp: { max: 6, marked: 1 }, stress: { max: 6, marked: 2 }, hope: { max: 6, marked: 3 }, armor: { max: 3, marked: 0 },
        thresholds: { major: 8, severe: 13 },
        dmgMods: [{ id: 'm1', label: 'Physical resistance', type: 'half', value: 0, active: false }],
        trackers: [{ id: 't1', label: 'Inspiration', value: 1 }],
        restItems: [
          { id: 'r1', name: 'Charm of Second Chances', desc: 'Once per long rest, reroll your lowest Duality die.', used: false },
          { id: 'r2', name: 'Minor health potion', desc: 'Clear 1d4 marked Hit Points.', used: true }
        ],
        cards: [
          { id: 'k1', name: 'Gifted Tracker', domain: 'Sage', level: 1, type: 'Ability', text: 'While tracking, spend a Hope to ask the GM a question about the creature you are pursuing.', loadout: true },
          { id: 'k2', name: 'Vicious Entangle', domain: 'Sage', level: 1, type: 'Spell', text: 'Spellcast vs a target within Far range. On a success, deal d8+1 magic damage and temporarily Restrain them.', loadout: true },
          { id: 'k3', name: 'Deft Maneuvers', domain: 'Bone', level: 1, type: 'Ability', text: 'Once per rest, mark a Stress to sprint anywhere within Far range without rolling.', loadout: true },
          { id: 'k4', name: 'Untouchable', domain: 'Bone', level: 2, type: 'Ability', text: 'Gain a bonus to your Evasion equal to half your Agility.', loadout: false }
        ],
        experiences: [{ name: 'Grew up in the deep woods', bonus: 2 }, { name: 'Beast whisperer', bonus: 2 }],
        gold: { Handfuls: 4, Bags: 1, Chests: 0 },
        inventory: 'Shortbow (Far, d6+2 phy)\nQuiver of arrows\nLeather armor\nRope, 50 ft\nTrail rations x4',
        notes: 'The caravan master owes us a favor.\nStrange claw marks by the river — too large for a bear.',
        adv: {}, levelLog: [{ text: 'Reached level 3 — thresholds increased by 1.' }, { text: 'Level 3: +1 Hit Point slot.' }, { text: 'Level 3: new domain card — Untouchable.' }],
        downtime: { moves: this.defaultDowntimeMoves(), project: { name: 'Mapping the deep woods', progress: 2, max: 6 } },
        shortRest: { moves: this.defaultShortRestMoves() },
        weapons: { primary: { name: 'Shortbow', range: 'Far', damage: 'd6+2 phy' }, secondaryEnabled: true, secondary: { name: 'Dagger', range: 'Melee', damage: 'd6+1 phy' } },
        equippedArmor: { name: 'Leather armor', score: 3 },
        activeCompanion: 0,
        companions: [{
          name: 'Ash', species: 'Wolf', evasion: 10, attack: 'Bite (Melee, Instinct)', damage: 'd6+2 phy',
          stress: { max: 3, marked: 1 },
          training: [
            { name: 'Intelligent', desc: 'Your companion gains an extra experience of its own.', taken: true },
            { name: 'Vicious', desc: 'Increase the companion damage die or range one step.', taken: true },
            { name: 'Resilient', desc: 'Your companion gains an additional Stress slot.', taken: false },
            { name: 'Bonded', desc: 'When you mark your last Hit Point, your companion rushes to you and rallies you.', taken: false },
            { name: 'Aware', desc: 'Your companion gains +2 to its Evasion.', taken: false }
          ]
        }, {
          name: 'Squeak', species: 'Field mouse (tiny familiar)', evasion: 14, attack: 'Nip (Melee, Finesse)', damage: 'd4 phy',
          stress: { max: 3, marked: 0 },
          training: [
            { name: 'Intelligent', desc: 'Your companion gains an extra experience of its own.', taken: false },
            { name: 'Vicious', desc: 'Increase the companion damage die or range one step.', taken: false },
            { name: 'Resilient', desc: 'Your companion gains an additional Stress slot.', taken: false },
            { name: 'Bonded', desc: 'When you mark your last Hit Point, your companion rushes to you and rallies you.', taken: false },
            { name: 'Aware', desc: 'Your companion gains +2 to its Evasion.', taken: true }
          ]
        }]
      },
      {
        id: id(), name: 'Bram Ironvale', pronouns: 'he/him', ancestry: 'Dwarf', community: 'Ridgeborne',
        klass: 'Guardian', subclass: 'Stalwart', multiclass: { klass: 'Warrior', subclass: 'Call of the Brave' }, level: 2, proficiency: 1,
        domains: ['Valor', 'Blade'], evasion: 9, armorScore: 4,
        traits: { Agility: 0, Strength: 2, Finesse: -1, Instinct: 0, Presence: 1, Knowledge: 1 },
        hp: { max: 7, marked: 3 }, stress: { max: 6, marked: 4 }, hope: { max: 6, marked: 2 }, armor: { max: 4, marked: 2 },
        thresholds: { major: 9, severe: 14 },
        dmgMods: [{ id: 'm1', label: 'Fortified armor', type: 'minus', value: 1, active: true }],
        trackers: [{ id: 't1', label: 'Unstoppable die', value: 0 }],
        restItems: [{ id: 'r1', name: 'Grindletooth venom', desc: 'Add a d6 to your next damage roll.', used: false }],
        cards: [
          { id: 'k1', name: 'Whirlwind', domain: 'Blade', level: 1, type: 'Ability', text: 'On a successful attack, spend a Hope to also strike other targets within Very Close range for half damage.', loadout: true },
          { id: 'k2', name: 'Get Back Up', domain: 'Valor', level: 1, type: 'Ability', text: 'When you take Severe damage, mark a Stress to reduce the severity by one threshold.', loadout: true },
          { id: 'k3', name: 'I Am Your Shield', domain: 'Valor', level: 1, type: 'Ability', text: 'When an ally within Very Close range would take damage, mark a Stress to take it instead.', loadout: true },
          { id: 'k4', name: 'Forceful Push', domain: 'Blade', level: 2, type: 'Ability', text: 'On a successful melee attack, knock the target back to Close range.', loadout: false }
        ],
        experiences: [{ name: 'Mountain garrison veteran', bonus: 2 }, { name: 'Immovable', bonus: 2 }],
        gold: { Handfuls: 2, Bags: 0, Chests: 0 },
        inventory: 'Battleaxe (Melee, d10+3 phy)\nFull plate\nShield\nWhetstone',
        notes: 'Owe the smith in Hearthollow for the plate repair.',
        adv: {}, levelLog: [{ text: 'Reached level 2 — thresholds increased by 1.' }],
        downtime: { moves: this.defaultDowntimeMoves(), project: { name: 'Forging a family heirloom', progress: 0, max: 6 } },
        shortRest: { moves: this.defaultShortRestMoves() },
        weapons: { primary: { name: 'Battleaxe', range: 'Melee', damage: 'd10+3 phy' }, secondaryEnabled: false, secondary: { name: '', range: 'Melee', damage: '' } },
        equippedArmor: { name: 'Full plate', score: 4 },
        activeCompanion: 0, companions: []
      },
      {
        id: id(), name: 'Wren Oakmere', pronouns: 'she/they', ancestry: 'Fungril', community: 'Wanderborne',
        klass: 'Druid', subclass: 'Warden of the Elements', multiclass: null, level: 3, proficiency: 2,
        domains: ['Arcana', 'Sage'], evasion: 10, armorScore: 2,
        traits: { Agility: 1, Strength: 0, Finesse: 0, Instinct: 2, Presence: -1, Knowledge: 1 },
        hp: { max: 6, marked: 1 }, stress: { max: 6, marked: 2 }, hope: { max: 6, marked: 4 }, armor: { max: 2, marked: 0 },
        thresholds: { major: 8, severe: 13 },
        dmgMods: [{ id: 'm1', label: 'Elemental resistance', type: 'half', value: 0, active: false }],
        trackers: [{ id: 't1', label: 'Elemental surges', value: 1 }],
        restItems: [{ id: 'r1', name: 'Sunpetal poultice', desc: 'Once per long rest, clear 1d4 Hit Points on yourself or an ally you touch.', used: false }],
        cards: [
          { id: 'k1', name: 'Wild Growth', domain: 'Sage', level: 1, type: 'Spell', text: 'Spend a Hope to grow thick brambles in a Close area, making it difficult terrain for your foes.', loadout: true },
          { id: 'k2', name: 'Kinship', domain: 'Sage', level: 1, type: 'Ability', text: 'Once per rest, call on a nearby animal to scout, fetch, or distract on your behalf.', loadout: true },
          { id: 'k3', name: 'Spellblade Ward', domain: 'Arcana', level: 1, type: 'Spell', text: 'Spend a Hope to surround yourself with a shifting elemental ward, gaining a bonus to Evasion until your next rest.', loadout: true },
          { id: 'k4', name: 'Beastform', domain: 'Sage', level: 1, type: 'Ability', text: 'Mark a Stress to transform into a beast you’ve studied, taking on its statistics until you revert.', loadout: true }
        ],
        experiences: [{ name: 'Raised among the fungril groves', bonus: 2 }, { name: 'Speaks with the old growth', bonus: 2 }],
        gold: { Handfuls: 3, Bags: 1, Chests: 0 },
        inventory: 'Wooden staff (Far, d6 mag)\nWoven bark armor\nPressed herbs and seed pouches\nCarved animal totems',
        notes: 'The elder grove hasn’t answered in three seasons — something is wrong upstream.',
        adv: {}, levelLog: [{ text: 'Reached level 3 — thresholds increased by 1.' }, { text: 'Level 3: new domain card — Beastform.' }],
        downtime: { moves: this.defaultDowntimeMoves(), project: { name: 'Restoring the elder grove', progress: 1, max: 6 } },
        shortRest: { moves: this.defaultShortRestMoves() },
        weapons: { primary: { name: 'Wooden staff', range: 'Far', damage: 'd6 mag' }, secondaryEnabled: false, secondary: { name: '', range: 'Melee', damage: '' } },
        equippedArmor: { name: 'Woven bark armor', score: 2 },
        wildshape: {
          active: null,
          forms: [
            { id: 'w1', name: 'Wolf', tier: 1, evasion: 13, attack: 'Bite (Melee, Instinct)', damage: 'd6+2 phy', feature: 'Advantage on rolls to track a scent or run down prey.', stressCost: 0 },
            { id: 'w2', name: 'Bear', tier: 1, evasion: 9, attack: 'Claws (Melee, Strength)', damage: 'd8+3 phy', feature: 'Gain a bonus to damage thresholds while shifted.', stressCost: 1 },
            { id: 'w3', name: 'Hawk', tier: 1, evasion: 15, attack: 'Talons (Melee, Finesse)', damage: 'd6+1 phy', feature: 'Gain a flying speed and advantage on Instinct rolls to spot things from above.', stressCost: 0 }
          ]
        },
        activeCompanion: 0,
        companions: [{
          name: 'Phoenix', difficulty: 14, movement: "40'",
          hp: { label: 'Moderate', max: 5, marked: 0 },
          stress: { max: 4, marked: 0 },
          attacks: [
            { name: 'Ember Strike', range: 'Close', formula: '2d6+4 fire magic', effect: '' },
            { name: 'Dive Bomb', range: 'Far', formula: '2d8+3 fire magic', effect: 'On Fear, all creatures within Very Close range of the target take 2d4 splash fire damage.' }
          ],
          features: [
            { type: 'Passive', name: 'Rebirth', desc: 'When the Phoenix reaches 0 HP it erupts in flames. All creatures within Very Close range make a reaction roll against Difficulty 14 or take 2d6+2 fire damage. The Phoenix returns at the start of its next turn with half HP. Rebirth can only trigger once per session. If Phoenix reaches 0 HP a second time, it retreats to Companion Case.' },
            { type: 'Passive', name: 'Radiant Warmth', desc: 'Allies within Close range of the Phoenix clear 1 Stress at the start of each round.' },
            { type: 'Action', name: 'Blaze Trail', desc: 'The Phoenix flies to any point within Far range, leaving a trail of fire. Any creature that crosses the trail takes 2d4+2 fire damage. Trail lasts until end of round.' },
            { type: 'Reaction', name: 'Fireshield', desc: 'When an ally within Close range takes damage, the Phoenix intercepts, reducing damage by 1d6+3 and marking 1 Stress.' }
          ],
          notes: ''
        }]
      },
      {
        id: id(), name: 'Sylvette Quill', pronouns: 'they/them', ancestry: 'Elf', community: 'Loreborne',
        klass: 'Wizard', subclass: 'School of Knowledge', multiclass: null, level: 3, proficiency: 2,
        domains: ['Codex', 'Splendor'], evasion: 11, armorScore: 2,
        traits: { Agility: 0, Strength: -1, Finesse: 1, Instinct: 0, Presence: 1, Knowledge: 2 },
        hp: { max: 5, marked: 0 }, stress: { max: 6, marked: 1 }, hope: { max: 6, marked: 5 }, armor: { max: 2, marked: 0 },
        thresholds: { major: 7, severe: 12 },
        dmgMods: [{ id: 'm1', label: 'Magic resistance', type: 'half', value: 0, active: false }],
        trackers: [{ id: 't1', label: 'Prepared rituals', value: 2 }],
        restItems: [{ id: 'r1', name: 'Scroll of recall', desc: 'Once per long rest, swap any card from your vault into your loadout for free.', used: false }],
        cards: [
          { id: 'k1', name: 'Book of Illiat', domain: 'Codex', level: 1, type: 'Grimoire', text: 'Slumber, Arcane Barrage, Telepathy — minor workings from Illiat’s grimoire.', loadout: true },
          { id: 'k2', name: 'Mending Touch', domain: 'Splendor', level: 1, type: 'Spell', text: 'Spend 2 Hope to clear a marked Hit Point or 2 Stress on a creature you touch.', loadout: true },
          { id: 'k3', name: 'Book of Ava', domain: 'Codex', level: 1, type: 'Grimoire', text: 'Levitation, Wall of Fog, Counterspell — workings from Ava’s grimoire.', loadout: false }
        ],
        experiences: [{ name: 'Archivist of the Grand Athenaeum', bonus: 2 }, { name: 'Unshakeable curiosity', bonus: 2 }],
        gold: { Handfuls: 6, Bags: 2, Chests: 0 },
        inventory: 'Staff (Far, d6+1 mag)\nRobes\nInk, quills, three blank journals',
        notes: 'The sigil on the ruin door matches plate XII in the Athenaeum codex.',
        adv: {}, levelLog: [{ text: 'Reached level 3 — thresholds increased by 1.' }, { text: 'Level 3: +1 Stress slot.' }],
        downtime: { moves: this.defaultDowntimeMoves(), project: { name: 'Translating the ruin sigils', progress: 4, max: 6 } },
        shortRest: { moves: this.defaultShortRestMoves() },
        weapons: { primary: { name: 'Staff', range: 'Far', damage: 'd6+1 mag' }, secondaryEnabled: false, secondary: { name: '', range: 'Melee', damage: '' } },
        equippedArmor: { name: 'Robes', score: 2 },
        activeCompanion: 0, companions: []
      }
    ];
  }
};

export const rosterTemplate = `
<!-- ============ ROSTER ============ -->
<sc-if value="{{isRoster}}" hint-placeholder-val="{{ true }}">
<div data-screen-label="Party Roster" style="max-width:1180px;margin:0 auto;padding:48px 32px;position:relative;z-index:0">
  <sc-if value="{{showRosterBg}}" hint-placeholder-val="{{ false }}">
    <div style="position:fixed;inset:0;z-index:-1;overflow:hidden">
      <x-import component-from-global-scope="image-slot" from="c6b115b3-1cc5-46ce-8deb-17fd610f11d8#/image-slot.js" id="{{rosterBgId}}" shape="rect" placeholder="Background image" style="width:100%;height:100%;opacity:0.9" hint-size="100%,100%"></x-import>
      <div style="position:absolute;inset:0;background:#fff;opacity:0.4"></div>
    </div>
  </sc-if>
  <sc-if value="{{showRosterBanner}}" hint-placeholder-val="{{ false }}">
    <div style="width:100%;height:200px;border-radius:14px;overflow:hidden;margin-bottom:22px">
      <x-import component-from-global-scope="image-slot" from="c6b115b3-1cc5-46ce-8deb-17fd610f11d8#/image-slot.js" id="{{rosterBannerId}}" shape="rect" placeholder="Banner image" style="width:100%;height:200px" hint-size="100%,200px"></x-import>
    </div>
  </sc-if>
  <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;border-bottom:2px solid var(--text);padding-bottom:14px;margin-bottom:8px">
    <div style="display:flex;align-items:baseline;gap:14px;flex-shrink:0">
      <h1 style="font-family:'Spectral',serif;font-weight:600;font-size:34px;margin:0;letter-spacing:-0.01em;white-space:nowrap;flex-shrink:0">Party Roster</h1>
      <span style="font-size:13px;color:var(--muted);letter-spacing:0.08em;text-transform:uppercase;white-space:nowrap">Daggerheart</span>
      <span title="Build version — check the README changelog to see if a newer one is available" style="font-size:10.5px;color:var(--muted);background:var(--panel);border:1px solid var(--border2);border-radius:999px;padding:2px 8px;white-space:nowrap">{{appVersion}}</span>
    </div>
    <div style="position:relative;flex-shrink:0">
      <sc-if value="{{hasSession}}" hint-placeholder-val="{{ false }}">
        <button sc-camel-on-click="{{signOut}}" title="Sign out" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer" style-hover="border-color:var(--text)">Sign out</button>
      </sc-if>
      <button sc-camel-on-click="{{toggleGameMenu}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px" style-hover="border-color:var(--text)">⚙ Options / {{activeGameName}} <span style="font-size:10px;color:var(--muted)">▾</span></button>
      <sc-if value="{{gameMenuOpen}}" hint-placeholder-val="{{ false }}">
        <div style="position:absolute;top:calc(100% + 6px);right:0;left:auto;z-index:50;min-width:260px;background:var(--panel);border:1px solid var(--border2);border-radius:10px;box-shadow:0 8px 24px rgba(38,34,27,0.18);padding:8px;display:flex;flex-direction:column;gap:2px">
          <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);padding:4px 8px">Games</div>
          <sc-for list="{{gameList}}" as="gm" hint-placeholder-count="2">
            <sc-if value="{{gm.editing}}" hint-placeholder-val="{{ false }}">
              <div style="display:flex;align-items:center;gap:4px;padding:2px 0">
                <input value="{{gm.editVal}}" sc-camel-on-change="{{gm.editChange}}" sc-camel-auto-focus="{{ true }}" style="flex:1;border:1px solid var(--border2);border-radius:7px;padding:7px 9px;font-size:13.5px;background:var(--input-bg)">
                <button sc-camel-on-click="{{gm.editSave}}" style="border:none;background:var(--accent,#8C5A2B);color:#fff;border-radius:7px;padding:7px 10px;font-size:12.5px;cursor:pointer">Save</button>
              </div>
            </sc-if>
            <sc-if value="{{gm.notEditing}}" hint-placeholder-val="{{ true }}">
              <div style="display:flex;align-items:center;gap:2px">
                <button sc-camel-on-click="{{gm.select}}" style="flex:1;border:none;background:{{gm.bg}};color:{{gm.fg}};text-align:left;border-radius:7px;padding:9px 10px;font-size:13.5px;cursor:pointer">{{gm.name}}</button>
                <button sc-camel-on-click="{{gm.startEdit}}" style="border:none;background:none;color:var(--muted);cursor:pointer;font-size:12.5px;padding:6px" style-hover="color:var(--accent,#8C5A2B)" title="Rename">✎</button>
                <sc-if value="{{gm.deletable}}" hint-placeholder-val="{{ false }}">
                  <button sc-camel-on-click="{{gm.remove}}" style="border:none;background:none;color:var(--muted);cursor:pointer;font-size:13px;padding:6px" style-hover="color:#A33B3B">✕</button>
                </sc-if>
              </div>
            </sc-if>
          </sc-for>
          <div style="height:1px;background:var(--border3);margin:6px 4px"></div>
          <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);padding:4px 8px">Theme</div>
          <div style="display:flex;align-items:center;gap:8px;padding:2px 8px 6px">
            <sc-for list="{{themeSwatches}}" as="sw" hint-placeholder-count="4">
              <div sc-camel-on-click="{{sw.select}}" style="width:22px;height:22px;border-radius:999px;background:{{sw.hex}};cursor:pointer;border:2px solid {{sw.ring}};box-shadow:0 0 0 1px var(--border2)"></div>
            </sc-for>
            <div style="flex:1"></div>
            <button sc-camel-on-click="{{toggleDark}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:7px;padding:6px 10px;font-size:12px;cursor:pointer">{{darkLabel}}</button>
          </div>
          <div style="height:1px;background:var(--border3);margin:6px 4px"></div>
          <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);padding:4px 8px">Roster background</div>
          <div style="display:flex;gap:6px;padding:2px 8px 6px;flex-wrap:wrap">
            <sc-for list="{{bannerModeOptions}}" as="bm" hint-placeholder-count="3">
              <button sc-camel-on-click="{{bm.select}}" style="border:1px solid {{bm.bc}};background:{{bm.bg}};color:{{bm.fg}};border-radius:7px;padding:6px 10px;font-size:12px;cursor:pointer">{{bm.label}}</button>
            </sc-for>
          </div>
          <sc-if value="{{hasSession}}" hint-placeholder-val="{{ false }}">
            <div style="height:1px;background:var(--border3);margin:6px 4px"></div>
            <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);padding:4px 8px">Shared inventory</div>
            <div style="padding:2px 8px 6px;display:flex;flex-direction:column;gap:4px">
              <button sc-camel-on-click="{{shareCampaign}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:7px;padding:7px 10px;font-size:12.5px;cursor:pointer" style-hover="border-color:var(--text)">{{shareCampaignLabel}}</button>
              <sc-if value="{{shareLinkCopied}}" hint-placeholder-val="{{ false }}">
                <span style="font-size:11.5px;color:#4E7A4E">✓ Invite link copied</span>
              </sc-if>
            </div>
          </sc-if>
          <div style="height:1px;background:var(--border3);margin:6px 4px"></div>
          <div style="display:flex;gap:6px;padding:2px 4px">
            <input value="{{newGameName}}" sc-camel-on-change="{{setNewGameName}}" placeholder="New campaign name" style="flex:1;border:1px solid var(--border2);border-radius:8px;padding:7px 10px;font-size:13px;background:var(--input-bg)">
            <button sc-camel-on-click="{{addGame}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:7px 12px;font-size:13px;cursor:pointer" style-hover="border-color:var(--text)">Add</button>
          </div>
        </div>
      </sc-if>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <div style="display:flex;align-items:center;gap:8px;border:1px solid var(--border2);background:var(--panel);border-radius:8px;padding:6px 6px 6px 12px">
        <span style="font-family:'Spectral',serif;font-size:15px;font-weight:600;min-width:52px">{{sessionTimeTxt}}</span>
        <button sc-camel-on-click="{{sessionToggle}}" style="width:28px;height:28px;border:none;background:var(--highlight-bg);color:var(--text);border-radius:6px;cursor:pointer;font-size:12px">{{sessionToggleLabel}}</button>
        <button sc-camel-on-click="{{sessionReset}}" style="width:28px;height:28px;border:none;background:none;color:var(--muted);cursor:pointer;font-size:13px" style-hover="color:#A33B3B">↻</button>
      </div>
      <button sc-camel-on-click="{{goParty}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer" style-hover="border-color:var(--text)">Shared Inventory</button>
      <button sc-camel-on-click="{{goRecaps}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer" style-hover="border-color:var(--text)">Session Recaps</button>
      <button sc-camel-on-click="{{goCompendium}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer" style-hover="border-color:var(--text)">Companion Compendium</button>
      <button sc-camel-on-click="{{goCreatures}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer" style-hover="border-color:var(--text)">Creatures</button>
    </div>
  </div>
  <p style="font-size:13px;color:var(--muted);margin:0 0 24px">Tap a character to open their sheet.</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px">
    <sc-for list="{{rosterCards}}" as="rc" hint-placeholder-count="3">
      <div sc-camel-on-click="{{rc.open}}" style="position:relative;background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:20px 22px;cursor:pointer;box-shadow:0 1px 3px rgba(38,34,27,0.06)" style-hover="border-color:#c8bfa9;box-shadow:0 3px 10px rgba(38,34,27,0.10)">
        <button sc-camel-on-click="{{rc.askDelete}}" title="Remove character" style="position:absolute;top:12px;right:12px;width:24px;height:24px;border:none;background:none;color:#b3ab9d;cursor:pointer;font-size:14px;line-height:1;z-index:1" style-hover="color:#A33B3B">✕</button>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
          <div>
            <div style="font-family:'Spectral',serif;font-size:22px;font-weight:600">{{rc.name}}</div>
            <div style="font-size:12.5px;color:var(--muted);margin-top:2px">{{rc.sub}}</div>
          </div>
          <div style="flex:none;width:34px;height:34px;border-radius:8px;background:var(--accent,#8C5A2B);color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Spectral',serif;font-weight:600;font-size:16px">{{rc.level}}</div>
        </div>
        <div style="display:flex;gap:16px;margin-top:16px;font-size:11px;color:var(--muted);letter-spacing:0.06em;text-transform:uppercase">
          <div style="flex:1"><div style="margin-bottom:4px">HP {{rc.hpTxt}}</div><div style="height:6px;border-radius:3px;background:var(--track-bg);overflow:hidden"><div style="height:100%;background:#A33B3B;width:{{rc.hpPct}}"></div></div></div>
          <div style="flex:1"><div style="margin-bottom:4px">Stress {{rc.stTxt}}</div><div style="height:6px;border-radius:3px;background:var(--track-bg);overflow:hidden"><div style="height:100%;background:#5B4A8A;width:{{rc.stPct}}"></div></div></div>
        </div>
        <sc-if value="{{rc.hasComp}}" hint-placeholder-val="{{ false }}">
          <div style="margin-top:12px;display:inline-flex;align-items:center;gap:7px;font-size:11.5px;color:#4E7A4E;background:var(--companion-bg);border:1px solid var(--companion-border);border-radius:999px;padding:3px 10px 3px 3px">
            <div sc-camel-on-click="{{rc.stopClick}}" style="flex:none;width:22px;height:22px">
              <x-import component-from-global-scope="image-slot" from="c6b115b3-1cc5-46ce-8deb-17fd610f11d8#/image-slot.js" id="{{rc.compPortraitId}}" shape="circle" placeholder="" style="width:22px;height:22px" hint-size="22px,22px"></x-import>
            </div>
            <span>Companion · {{rc.compName}}</span>
          </div>
        </sc-if>
        <sc-if value="{{rc.confirmingDelete}}" hint-placeholder-val="{{ false }}">
          <div sc-camel-on-click="{{rc.stopClick}}" style="position:absolute;inset:0;background:var(--panel);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:16px;text-align:center;cursor:default">
            <div style="font-size:13px;color:var(--muted)">Remove {{rc.name}} and their companions?</div>
            <div style="display:flex;gap:8px">
              <button sc-camel-on-click="{{rc.cancelDelete}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer">Cancel</button>
              <button sc-camel-on-click="{{rc.confirmDelete}}" style="border:none;background:#A33B3B;color:#fff;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer">Remove</button>
            </div>
          </div>
        </sc-if>
      </div>
    </sc-for>
    <div sc-camel-on-click="{{addChar}}" style="border:2px dashed var(--border2);border-radius:12px;min-height:140px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;cursor:pointer;color:var(--muted)" style-hover="border-color:var(--accent,#8C5A2B);color:var(--accent,#8C5A2B)">
      <div style="font-size:28px;line-height:1">+</div>
      <div style="font-size:12.5px;letter-spacing:0.08em;text-transform:uppercase">New character</div>
    </div>
    <div sc-camel-on-click="{{openWizard}}" style="border:2px dashed var(--border2);border-radius:12px;min-height:140px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;cursor:pointer;color:var(--muted)" style-hover="border-color:var(--accent,#8C5A2B);color:var(--accent,#8C5A2B)">
      <div style="font-size:22px;line-height:1">✨</div>
      <div style="font-size:12.5px;letter-spacing:0.08em;text-transform:uppercase">Guided creation</div>
    </div>
    <label style="border:2px dashed var(--border2);border-radius:12px;min-height:140px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;cursor:pointer;color:var(--muted);margin:0" style-hover="border-color:var(--accent,#8C5A2B);color:var(--accent,#8C5A2B)">
      <div style="font-size:22px;line-height:1">⇧</div>
      <div style="font-size:12.5px;letter-spacing:0.08em;text-transform:uppercase">Import character</div>
      <input type="file" accept="application/json,.json" sc-camel-on-change="{{importFileChange}}" style="display:none">
    </label>
  </div>
</div>
</sc-if>`;

export const importErrorToastTemplate = `
<sc-if value="{{importErrorOpen}}" hint-placeholder-val="{{ false }}">
  <div style="position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:#A33B3B;color:#fff;border-radius:10px;padding:12px 14px 12px 18px;display:flex;align-items:center;gap:14px;box-shadow:0 12px 30px rgba(0,0,0,0.25);z-index:200;font-size:13.5px;max-width:90vw">
    <span>{{importErrorText}}</span>
    <button sc-camel-on-click="{{dismissImportError}}" style="border:none;background:none;color:#fff;opacity:0.8;cursor:pointer;font-size:14px;padding:2px">✕</button>
  </div>
</sc-if>`;

export const importConflictModalTemplate = `
<sc-if value="{{importConflictOpen}}" hint-placeholder-val="{{ false }}">
  <div style="position:fixed;inset:0;background:rgba(20,18,14,0.45);display:flex;align-items:center;justify-content:center;z-index:250;padding:20px">
    <div style="background:var(--panel);border-radius:16px;width:100%;max-width:480px;max-height:86vh;overflow:auto;padding:26px 28px;box-shadow:0 20px 50px rgba(0,0,0,0.25)">
      <div style="font-family:'Spectral',serif;font-size:19px;font-weight:600;margin-bottom:8px">A character named "{{importConflictName}}" already exists</div>
      <p style="font-size:13.5px;color:var(--muted);margin:0 0 16px;line-height:1.5">Cancel to back out, import as a separate new character, or merge the imported fields into the existing one.</p>
      <sc-if value="{{importMergeDiffHasLines}}" hint-placeholder-val="{{ false }}">
        <div style="border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:16px;display:flex;flex-direction:column;gap:4px">
          <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">If merged, these fields would change</div>
          <sc-for list="{{importMergeDiffLines}}" as="dl" hint-placeholder-count="3">
            <div style="font-size:13px">{{dl.text}}</div>
          </sc-for>
        </div>
      </sc-if>
      <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
        <button sc-camel-on-click="{{importCancelConflict}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:9px 16px;font-size:13.5px;cursor:pointer">Cancel</button>
        <button sc-camel-on-click="{{importAsNew}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:9px 16px;font-size:13.5px;cursor:pointer">Import as new</button>
        <button sc-camel-on-click="{{importMerge}}" style="border:none;background:var(--accent,#8C5A2B);color:#fff;border-radius:8px;padding:9px 18px;font-size:13.5px;font-weight:600;cursor:pointer">Merge</button>
      </div>
    </div>
  </div>
</sc-if>`;
