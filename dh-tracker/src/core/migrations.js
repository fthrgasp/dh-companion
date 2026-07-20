export const migrationsMixin = {
  defaultShortRestMoves() {
    return [
      { key: 'wounds', name: 'Tend to Wounds', desc: 'Clear 1d4 Hit Points, or 1d4+tier if another PC helps.', taken: false },
      { key: 'stress', name: 'Clear Stress', desc: 'Clear 1d4 Stress, or 1d4+tier if another PC helps.', taken: false },
      { key: 'armor', name: 'Repair Armor', desc: 'Clear 1d4 marked armor slots.', taken: false },
      { key: 'prepare', name: 'Prepare', desc: 'Move a domain card from your vault into your loadout.', taken: false }
    ];
  },

  defaultCompanion() {
    return {
      name: 'New Companion', level: 1, difficulty: 12, movement: '',
      hp: { label: 'Moderate', max: 5, marked: 0 },
      stress: { max: 3, marked: 0 },
      attacks: [{ name: 'Attack', range: 'Melee', formula: '', effect: '' }],
      features: [],
      notes: ''
    };
  },

  // Lazily upgrades a companion saved under the old schema (species/evasion/
  // single attack+damage/training list) to the current stat-block shape, and
  // fills in any field a hand-built companion is missing.
  normalizeCompanion(comp) {
    if (!comp.portraitKey) comp.portraitKey = 'comp-' + Math.random().toString(36).slice(2, 9);
    if (comp.level == null) comp.level = 1;
    if (comp.difficulty == null) comp.difficulty = 12;
    if (comp.movement == null) comp.movement = '';
    if (comp.notes == null) comp.notes = typeof comp.features === 'string' ? comp.features : '';
    if (!comp.hp) comp.hp = { label: 'Moderate', max: 5, marked: 0 };
    if (comp.hp.label == null) comp.hp.label = 'Moderate';
    if (!comp.stress) comp.stress = { max: 3, marked: 0 };
    if (!Array.isArray(comp.attacks)) {
      comp.attacks = comp.attack ? [{ name: comp.attack, range: 'Melee', formula: comp.damage || '', effect: '' }] : [];
    } else if (comp.attacks.length === 1 && comp.attacks[0].name === 'Attack' && comp.attack && comp.attack !== 'Attack') {
      // repair a companion migrated by an earlier buggy version that dropped the attack name
      comp.attacks[0].name = comp.attack;
    }
    if (!Array.isArray(comp.features)) {
      comp.features = (Array.isArray(comp.training) ? comp.training : []).filter(t => t.taken).map(t => ({ type: 'Passive', name: t.name, desc: t.desc }));
    }
  },

  defaultWildshape() {
    return {
      active: null,
      forms: [
        { id: 'w' + Date.now(), name: 'New Beastform', tier: 1, evasion: 10, attack: '', damage: '', feature: '', stressCost: 0 }
      ]
    };
  },

  defaultTransformation() {
    const stub = (name, id) => ({
      id, name, tier: 1, evasion: 10, attack: '', damage: '',
      feature: 'Void — pending: replace with the official Transformation card text.',
      stressCost: 1, voidPending: true
    });
    return {
      enabled: false,
      active: null,
      forms: [
        stub('Vampire', 't-vampire'),
        stub('Werewolf', 't-werewolf'),
        stub('Reanimated', 't-reanimated'),
        stub('Shapeshifter', 't-shapeshifter'),
        stub('Ghost', 't-ghost'),
        stub('Demigod', 't-demigod')
      ]
    };
  },

  defaultWeapons() {
    return {
      primary: { name: '', range: 'Melee', damage: '' },
      secondaryEnabled: false,
      secondary: { name: '', range: 'Melee', damage: '' }
    };
  },

  defaultConditions() {
    return [
      { key: 'restrained', name: 'Restrained', desc: 'Can’t move away or be moved; may lose access to some actions.', active: false, builtin: true },
      { key: 'vulnerable', name: 'Vulnerable', desc: 'Attack rolls against you have advantage.', active: false, builtin: true },
      { key: 'hidden', name: 'Hidden', desc: 'Your location is unknown; attacks against you have disadvantage.', active: false, builtin: true }
    ];
  },

  defaultDowntimeMoves() {
    return [
      { key: 'wounds', name: 'Tend to Wounds', desc: 'Clear 1d4 Hit Points, or 1d4+tier if another PC tends to you.', taken: false },
      { key: 'stress', name: 'Clear Stress', desc: 'Clear 1d4 Stress, or 1d4+tier if another PC helps you unwind.', taken: false },
      { key: 'armor', name: 'Repair Armor', desc: 'Clear all marked armor slots.', taken: false },
      { key: 'prepare', name: 'Prepare', desc: 'Move a domain card from your vault into your loadout.', taken: false },
      { key: 'project', name: 'Work a Long-Term Project', desc: 'Advance a long-term project by marking progress.', taken: false }
    ];
  },

  blankChar() {
    return {
      id: 'c' + Date.now(), name: 'New Adventurer', pronouns: '', ancestry: '', community: '',
      klass: '', subclass: '', multiclass: null, level: 1, proficiency: 1, domains: [], evasion: 10, armorScore: 3,
      traits: { Agility: 0, Strength: 0, Finesse: 0, Instinct: 0, Presence: 0, Knowledge: 0 },
      hp: { max: 6, marked: 0 }, stress: { max: 6, marked: 0 }, hope: { max: 6, marked: 2 }, armor: { max: 3, marked: 0 },
      thresholds: { major: 7, severe: 12 },
      dmgMods: [], trackers: [], restItems: [], cards: [],
      experiences: [], gold: { Handfuls: 1, Bags: 0, Chests: 0 },
      inventory: '', notes: '', adv: {}, levelLog: [], activeCompanion: 0, companions: [],
      downtime: { moves: this.defaultDowntimeMoves(), project: { name: '', progress: 0, max: 6 } },
      conditions: this.defaultConditions(),
      shortRest: { moves: this.defaultShortRestMoves() },
      weapons: this.defaultWeapons(),
      weaponsPrimary: [], weaponsSecondary: [],
      equippedArmor: { name: '', score: 3 }
    };
  },

  // Fills in any fields missing from an older/partial character object with
  // current defaults, mutating in place. This is the app's schema migration
  // path — previously inlined in renderVals() (runs lazily on every render),
  // also reused by JSON import so an imported file gets the same treatment
  // as an old localStorage save that's a few versions behind.
  normalizeChar(c) {
    if (!c.downtime) c.downtime = { moves: this.defaultDowntimeMoves(), project: { name: '', progress: 0, max: 6 } };
    if (!c.conditions) c.conditions = this.defaultConditions();
    if (!c.shortRest) c.shortRest = { moves: this.defaultShortRestMoves() };
    if (!c.weapons) c.weapons = this.defaultWeapons();
    if (!c.weaponsPrimary) {
      c.weaponsPrimary = (c.weapons.primary && c.weapons.primary.name)
        ? [{ name: c.weapons.primary.name, range: c.weapons.primary.range || 'Melee', damage: c.weapons.primary.damage || '', equipped: true, features: [] }]
        : [];
    }
    if (!c.weaponsSecondary) {
      c.weaponsSecondary = (c.weapons.secondaryEnabled && c.weapons.secondary && c.weapons.secondary.name)
        ? [{ name: c.weapons.secondary.name, range: c.weapons.secondary.range || 'Melee', damage: c.weapons.secondary.damage || '', equipped: true, features: [] }]
        : [];
    }
    if (!c.equippedArmor) c.equippedArmor = { name: '', score: c.armorScore || 3 };
    if (!c.companions) { c.companions = c.companion ? [c.companion] : []; c.activeCompanion = 0; }
    if (c.activeCompanion == null) c.activeCompanion = 0;
    if (c.activeCompanion >= c.companions.length) c.activeCompanion = Math.max(0, c.companions.length - 1);
    if (!c.wildshape) c.wildshape = this.defaultWildshape();
    if (!c.transformation) c.transformation = this.defaultTransformation();
    if (!c.dmgMods) c.dmgMods = [];
    if (!c.trackers) c.trackers = [];
    if (!c.restItems) c.restItems = [];
    if (!c.cards) c.cards = [];
    if (!c.experiences) c.experiences = [];
    if (!c.gold) c.gold = { Handfuls: 0, Bags: 0, Chests: 0 };
    if (!c.adv) c.adv = {};
    if (!c.levelLog) c.levelLog = [];
    if (typeof c.inventory !== 'string') c.inventory = '';
    if (typeof c.notes !== 'string') c.notes = '';
    return c;
  },

  // Upgrades a creature saved under the old single attack/damage + free-text
  // features schema to the current attacks[]/features[] lists.
  normalizeCreature(cr) {
    if (!Array.isArray(cr.attacks)) {
      cr.attacks = cr.attack ? [{ name: cr.attack, range: 'Melee', formula: cr.damage || '', effect: '' }] : [];
    }
    if (!Array.isArray(cr.features)) {
      cr.features = (typeof cr.features === 'string' && cr.features.trim()) ? [{ name: 'Feature', desc: cr.features }] : [];
    }
  }
};
