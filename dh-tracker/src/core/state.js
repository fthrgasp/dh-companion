import { loadJSON, saveJSON, loadRaw, saveRaw } from './storage.js';

export const APP_VERSION = '0.12.0';

export const initialState = {
  screen: 'roster', activeId: null, tab: 'play',
  dmgInput: '', useArmor: false,
  newModLabel: '', newModType: 'minus', newModValue: '1',
  newTracker: '', newItemName: '', newItemDesc: '',
  newCardName: '', newCardDomain: 'Arcana', newCardText: '',
  chars: [], dark: false, party: [], newPartyName: '', newPartyQty: '1', newPartyNote: '',
  recaps: [], newRecapTitle: '', newRecapText: '', newRecapDate: '',
  levelWiz: null, customDomains: [], newDomainName: '', importedDomainCards: {}, cardImportText: '', cardImportResult: null,
  customAncestries: [], newAncestryName: '', newAncestryFeature: '',
  newConditionName: '', confirmDelete: false, rosterDeleteConfirmId: null, compDeleteConfirmKey: null, undo: null, wizard: null, bannerMode: 'none',
  importError: '', importConflict: null, exportMenuOpen: false,
  customClasses: [], newClassName: '', newClassDesc: '',
  sessionElapsed: 0, sessionRunning: false,
  updateAvailable: false, updateVersion: '',
  games: [{ id: 'default', name: 'My Campaign' }], activeGame: 'default', newGameName: '', gameMenuOpen: false,
  editingGameId: null, renameGameVal: '',
  creatures: [], newCreatureName: '',
  session: null, authChecked: false, skipAuth: false, authEmail: '', authMagicLinkSent: false, authError: '',
  localImportPrompt: null,
  pendingJoinId: null, joinError: '', shareLinkCopied: false, sharingCampaign: false
};

export const stateMixin = {
  gk(base) {
    return (this.state.activeGame && this.state.activeGame !== 'default') ? (base + '-' + this.state.activeGame) : base;
  },

  // Loads every per-game slice of data for the given game id (game ids other
  // than 'default' use suffixed keys; 'default' keeps the original unsuffixed
  // keys so existing saved sessions are picked up with no migration needed).
  loadGameData(gameId) {
    const suffix = (gameId && gameId !== 'default') ? ('-' + gameId) : '';
    const isDefault = !gameId || gameId === 'default';
    const get = (base) => loadJSON(base + suffix);
    let chars;
    if (isDefault) {
      const saved = get('dh-tracker-v1');
      chars = saved || [];
      const seenIds = new Set();
      chars.forEach(ch => {
        if (seenIds.has(ch.id)) {
          let newId = ch.id + '-2';
          while (seenIds.has(newId)) newId += 'x';
          ch.id = newId;
        }
        seenIds.add(ch.id);
      });
      saveJSON('dh-tracker-v1', chars);
    } else {
      chars = get('dh-tracker-v1') || [];
    }
    let sessionElapsed = parseInt(loadRaw('dh-tracker-session-elapsed' + suffix), 10) || 0;
    return {
      chars,
      party: get('dh-tracker-party') || (isDefault ? this.defaultParty() : []),
      recaps: get('dh-tracker-recaps') || (isDefault ? this.defaultRecaps() : []),
      customDomains: get('dh-tracker-domains') || [],
      customAncestries: get('dh-tracker-ancestries') || [],
      customClasses: get('dh-tracker-classes') || [],
      creatures: get('dh-tracker-creatures') || [],
      importedDomainCards: get('dh-tracker-imported-cards') || {},
      sessionElapsed
    };
  },

  switchGame(id) {
    if (id === this.state.activeGame) { this.setState({ gameMenuOpen: false }); return; }
    saveRaw('dh-tracker-active-game', id);
    const data = this.loadGameData(id);
    const theme = this.loadThemeFor(id);
    this.setState({
      activeGame: id, chars: data.chars, party: data.party, recaps: data.recaps,
      customDomains: data.customDomains, customAncestries: data.customAncestries, customClasses: data.customClasses,
      creatures: data.creatures, importedDomainCards: data.importedDomainCards, sessionElapsed: data.sessionElapsed, sessionRunning: false,
      dark: theme.dark, gameAccent: theme.gameAccent, bannerMode: theme.bannerMode,
      screen: 'roster', activeId: null, gameMenuOpen: false, newGameName: ''
    });
    if (this.state.session) {
      this.refreshCharsFromRemote(id);
      const cloudId = this.cloudIdFor(id);
      if (cloudId) this.refreshPartyFromRemote(cloudId);
    }
  },

  addGame() {
    const name = (this.state.newGameName || '').trim() || 'New Campaign';
    const id = 'g' + Date.now();
    const games = this.state.games.concat([{ id, name }]);
    this.saveGames(games);
    this.setState({ games });
    this.switchGame(id);
  },

  renameGame(id, name) {
    const games = this.state.games.map(g => g.id === id ? Object.assign({}, g, { name }) : g);
    this.saveGames(games);
    this.setState({ games });
  },

  deleteGame(id) {
    if (id === 'default' || this.state.games.length <= 1) return;
    const games = this.state.games.filter(g => g.id !== id);
    this.saveGames(games);
    if (this.state.activeGame === id) {
      this.setState({ games });
      this.switchGame('default');
    } else {
      this.setState({ games });
    }
  },

  toggleDark() {
    const dark = !this.state.dark;
    saveRaw(this.gk('dh-tracker-dark'), dark ? '1' : '0');
    this.setState({ dark });
  },

  loadThemeFor(gameId) {
    const suffix = (gameId && gameId !== 'default') ? ('-' + gameId) : '';
    const rawDark = loadRaw('dh-tracker-dark' + suffix);
    const dark = rawDark === null ? true : rawDark === '1';
    const gameAccent = loadRaw('dh-tracker-accent' + suffix) || null;
    const bannerMode = loadRaw('dh-tracker-bannermode' + suffix) || 'none';
    return { dark, gameAccent, bannerMode };
  },

  setBannerMode(mode) {
    saveRaw(this.gk('dh-tracker-bannermode'), mode);
    this.setState({ bannerMode: mode });
  },

  setGameAccent(hex) {
    saveRaw(this.gk('dh-tracker-accent'), hex);
    this.setState({ gameAccent: hex });
  },

  up(fn) {
    this.setState(s => {
      const chars = JSON.parse(JSON.stringify(s.chars));
      const c = chars.find(x => x.id === s.activeId);
      if (c) fn(c, chars);
      this.save(chars);
      this.syncCharsRemote(chars, s.chars);
      return { chars };
    });
  },

  upAll(fn) {
    this.setState(s => {
      const chars = JSON.parse(JSON.stringify(s.chars));
      fn(chars);
      this.save(chars);
      this.syncCharsRemote(chars, s.chars);
      return { chars };
    });
  },

  active() { return (this.state.chars || []).find(x => x.id === this.state.activeId) || null; },

  mkPips(max, marked, onColor, set) {
    const arr = [];
    for (let i = 0; i < max; i++) {
      arr.push({
        bg: i < marked ? onColor : 'transparent',
        click: () => set((i + 1 === marked) ? i : i + 1)
      });
    }
    return arr;
  },

  // HP/Stress table rule: pips start full (all lit) and count down — the
  // leftmost pips go dark first as damage/stress is marked, instead of
  // filling up from empty. Click targeting stays the same as mkPips.
  mkPipsCountdown(max, marked, onColor, set) {
    const arr = [];
    for (let i = 0; i < max; i++) {
      arr.push({
        bg: i < marked ? 'transparent' : onColor,
        click: () => set((i + 1 === marked) ? i : i + 1)
      });
    }
    return arr;
  },

  mkPipsReadonlyCountdown(max, marked, onColor) {
    const arr = [];
    for (let i = 0; i < max; i++) arr.push({ bg: i < marked ? 'transparent' : onColor });
    return arr;
  },

  mkPipsReadonly(max, marked, onColor) {
    const arr = [];
    for (let i = 0; i < max; i++) arr.push({ bg: i < marked ? onColor : 'transparent' });
    return arr;
  },

  // Generic bind for an item inside an arbitrary state array (not the active
  // character) — upFn is the list's upXxx(fn) updater, list/i locate the item,
  // path is a dotted field path within that item.
  bindItem(upFn, list, i, path, isNum) {
    let val = list[i];
    for (const k of path.split('.')) val = val ? val[k] : '';
    return {
      val: val === undefined || val === null ? '' : val,
      on: (e) => {
        const raw = e.target.value;
        const v = isNum ? (parseInt(raw, 10) || 0) : raw;
        upFn(arr => {
          const keys = path.split('.');
          let o = arr[i];
          for (let j = 0; j < keys.length - 1; j++) o = o[keys[j]];
          o[keys[keys.length - 1]] = v;
        });
      }
    };
  },

  fmtTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const sec = totalSeconds % 60;
    const pad = n => String(n).padStart(2, '0');
    return h > 0 ? (h + ':' + pad(m) + ':' + pad(sec)) : (pad(m) + ':' + pad(sec));
  }
};
