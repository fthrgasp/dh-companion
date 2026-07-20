import './styles/main.css';
import { DcEngine, DCLogic } from './core/dcEngine.js';
import { APP_VERSION, initialState, stateMixin } from './core/state.js';
import { undoMixin, undoToastTemplate } from './core/undo.js';
import { migrationsMixin } from './core/migrations.js';
import { storageMixin, loadJSON, loadRaw, saveRaw } from './core/storage.js';
import { supabaseClient, supabaseMixin, authGateTemplate, joinErrorToastTemplate } from './core/supabase.js';
import { rosterMixin, rosterTemplate, importErrorToastTemplate, importConflictModalTemplate } from './screens/roster.js';
import { sheetMixin, sheetTemplate } from './screens/sheet.js';
import { partyMixin, partyTemplate } from './screens/party.js';
import { recapsMixin, recapsTemplate } from './screens/recaps.js';
import { compendiumMixin, companionCompendiumTemplate } from './screens/compendium.js';
import { creaturesMixin, creaturesTemplate } from './screens/creatures.js';
import { characterWizardMixin, wizardTemplate } from './features/characterWizard.js';
import { dmgCalc } from './features/damageCalculator.js';

const appTemplate = `
<div style="min-height:100vh;background:{{wrapperBg}};color:var(--text);--accent:{{accent}};--prad:{{pipRad}};--prot:{{pipRot}};--bg:{{bg}};--panel:{{panelBg}};--border:{{borderC}};--border2:{{border2C}};--text:{{textC}};--muted:{{mutedC}};--input-bg:{{inputBg}};--border3:{{border3C}};--track-bg:{{trackBg}};--companion-bg:{{companionBgC}};--companion-border:{{companionBorderC}};--major-bg:{{majorBgC}};--severe-bg:{{severeBgC}};--highlight-bg:{{highlightBgC}}">

<sc-if value="{{updateAvailable}}" hint-placeholder-val="{{ false }}">
  <div data-print-hide="1" style="position:sticky;top:0;z-index:100;background:var(--accent,#8C5A2B);color:#fff;padding:9px 16px;display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;font-size:13px">
    <span>A newer version ({{updateVersion}}) is available. Your saved characters are safe either way.</span>
    <button sc-camel-on-click="{{reloadForUpdate}}" style="border:1px solid rgba(255,255,255,0.6);background:rgba(255,255,255,0.15);color:#fff;border-radius:8px;padding:5px 14px;font-size:12.5px;cursor:pointer">Reload now</button>
    <button sc-camel-on-click="{{dismissUpdate}}" style="border:none;background:none;color:#fff;opacity:0.8;cursor:pointer;font-size:12.5px;text-decoration:underline">Not now</button>
  </div>
</sc-if>
` + authGateTemplate + rosterTemplate + partyTemplate + recapsTemplate + companionCompendiumTemplate + creaturesTemplate + sheetTemplate + undoToastTemplate + importErrorToastTemplate + joinErrorToastTemplate + importConflictModalTemplate + wizardTemplate + `
</div>
`;

class Component extends DCLogic {
  state = initialState;

  renderVals() {
    const s = this.state;
    const c = this.active();
    const showAuthGate = s.authChecked && !s.session && (!s.skipAuth || !!s.pendingJoinId);
    const isSheet = s.screen === 'sheet' && !!c && !showAuthGate;
    const accent = s.gameAccent || this.props.accent || '#8C5A2B';
    const pipShape = this.props.pipShape ?? 'circle';

    const dark = !!s.dark;
    try { document.body.style.background = dark ? '#1c1a16' : '#f2efe9'; } catch (e) {}
    const theme = dark
      ? { bg: '#1c1a16', panel: '#26241f', border: '#3a362d', border2: '#4a4438', text: '#ece7dc', muted: '#a89f8d', inputBg: '#2f2c25', border3: '#332f27', trackBg: '#3a362d', highlightBg: '#3d3624', majorBg: '#3d3624', severeBg: '#3d2b28', companionBg: '#243024', companionBorder: '#33452f' }
      : { bg: '#f2efe9', panel: '#ffffff', border: '#e2dcd0', border2: '#d5ccba', text: '#26221b', muted: '#8a8172', inputBg: '#faf7f1', border3: '#f1ece2', trackBg: '#eee7da', highlightBg: '#f4ead9', majorBg: '#f4ead9', severeBg: '#f2ddd6', companionBg: '#eef3ea', companionBorder: '#d7e2d0' };

    const vals = {
      accent,
      appVersion: (typeof APP_VERSION !== 'undefined' ? APP_VERSION : ''),
      updateAvailable: !!s.updateAvailable,
      updateVersion: s.updateVersion,
      reloadForUpdate: () => { location.href = location.pathname + '?_=' + Date.now(); },
      dismissUpdate: () => this.setState({ updateAvailable: false }),
      pipRad: pipShape === 'diamond' ? '3px' : '999px',
      pipRot: pipShape === 'diamond' ? 'rotate(45deg)' : 'none',
      bg: theme.bg, panelBg: theme.panel, borderC: theme.border, border2C: theme.border2,
      textC: theme.text, mutedC: theme.muted, inputBg: theme.inputBg, border3C: theme.border3,
      trackBg: theme.trackBg, companionBgC: theme.companionBg, companionBorderC: theme.companionBorder,
      majorBgC: theme.majorBg, severeBgC: theme.severeBg, highlightBgC: theme.highlightBg,
      dark,
      toggleDark: () => this.toggleDark(),
      darkLabel: dark ? '☀ Light' : '☾ Dark',
      exportMenuOpen: !!s.exportMenuOpen,
      toggleExportMenu: () => this.setState({ exportMenuOpen: !s.exportMenuOpen }),
      exportPdf: () => { this.setState({ exportMenuOpen: false }); window.print(); },
      exportJson: () => { this.setState({ exportMenuOpen: false }); this.exportCharacterJson(); },
      sessionTimeTxt: this.fmtTime(s.sessionElapsed || 0),
      sessionRunning: !!s.sessionRunning,
      sessionToggle: () => this.setState({ sessionRunning: !s.sessionRunning }),
      sessionReset: () => { saveRaw(this.gk('dh-tracker-session-elapsed'), '0'); this.setState({ sessionElapsed: 0, sessionRunning: false }); },
      sessionToggleLabel: s.sessionRunning ? '⏸' : '▶',
      showAuthGate,
      authEmail: s.authEmail || '',
      setAuthEmail: (e) => this.setAuthEmail(e.target.value),
      authMagicLinkSent: !!s.authMagicLinkSent,
      authFormOpen: !s.authMagicLinkSent,
      authErrorOpen: !!s.authError,
      authErrorText: s.authError,
      sendMagicLink: () => this.sendMagicLink(),
      skipAuthClick: () => this.setSkipAuth(true),
      hasSession: !!s.session,
      signOut: () => this.signOut(),
      localImportOpen: !!s.localImportPrompt,
      localImportCount: s.localImportPrompt ? s.localImportPrompt.count : 0,
      confirmLocalImport: () => this.confirmLocalImport(),
      dismissLocalImport: () => this.dismissLocalImport(),
      shareCampaign: () => this.shareCampaign(),
      shareCampaignLabel: s.sharingCampaign ? 'Sharing…' : (this.activeCloudId() ? 'Copy invite link' : 'Share campaign'),
      shareLinkCopied: !!s.shareLinkCopied,
      joinErrorOpen: !!s.joinError,
      joinErrorText: s.joinError,
      dismissJoinError: () => this.setState({ joinError: '' }),
      isRoster: !showAuthGate && (s.screen === 'roster' || !c) && s.screen !== 'party' && s.screen !== 'recaps' && s.screen !== 'compendium' && s.screen !== 'creatures',
      isCompendium: !showAuthGate && s.screen === 'compendium',
      goCompendium: () => this.setState({ screen: 'compendium' }),
      goCompendiumMenu: () => this.setState({ screen: 'compendium', pagesOpen: false }),
      isCreatures: !showAuthGate && s.screen === 'creatures',
      goCreatures: () => this.setState({ screen: 'creatures' }),
      goCreaturesMenu: () => this.setState({ screen: 'creatures', pagesOpen: false }),
      addCreature: () => this.upCreatures(list => list.push(this.defaultCreature())),
      creatureList: (s.creatures || []).map((cr, i) => {
        this.normalizeCreature(cr);
        return {
          name: this.bindItem(fn => this.upCreatures(fn), s.creatures, i, 'name'),
          type: this.bindItem(fn => this.upCreatures(fn), s.creatures, i, 'type'),
          tier: this.bindItem(fn => this.upCreatures(fn), s.creatures, i, 'tier', true),
          difficulty: this.bindItem(fn => this.upCreatures(fn), s.creatures, i, 'difficulty', true),
          evasion: this.bindItem(fn => this.upCreatures(fn), s.creatures, i, 'evasion', true),
          hpMax: this.bindItem(fn => this.upCreatures(fn), s.creatures, i, 'hp.max', true),
          stressMax: this.bindItem(fn => this.upCreatures(fn), s.creatures, i, 'stress.max', true),
          thrMajor: this.bindItem(fn => this.upCreatures(fn), s.creatures, i, 'thresholds.major', true),
          thrSevere: this.bindItem(fn => this.upCreatures(fn), s.creatures, i, 'thresholds.severe', true),
          description: this.bindItem(fn => this.upCreatures(fn), s.creatures, i, 'description'),
          attacksList: cr.attacks.map((atk, j) => ({
            name: this.bindItem(fn => this.upCreatures(fn), s.creatures, i, 'attacks.' + j + '.name'),
            range: this.bindItem(fn => this.upCreatures(fn), s.creatures, i, 'attacks.' + j + '.range'),
            formula: this.bindItem(fn => this.upCreatures(fn), s.creatures, i, 'attacks.' + j + '.formula'),
            effect: this.bindItem(fn => this.upCreatures(fn), s.creatures, i, 'attacks.' + j + '.effect'),
            remove: () => this.upCreatures(list => list[i].attacks.splice(j, 1))
          })),
          addAttack: () => this.upCreatures(list => list[i].attacks.push({ name: '', range: 'Melee', formula: '', effect: '' })),
          featuresList: cr.features.map((ft, j) => ({
            name: this.bindItem(fn => this.upCreatures(fn), s.creatures, i, 'features.' + j + '.name'),
            desc: this.bindItem(fn => this.upCreatures(fn), s.creatures, i, 'features.' + j + '.desc'),
            remove: () => this.upCreatures(list => list[i].features.splice(j, 1))
          })),
          addFeature: () => this.upCreatures(list => list[i].features.push({ name: '', desc: '' })),
          remove: () => this.upCreatures(list => list.splice(i, 1))
        };
      }),
      gameMenuOpen: !!s.gameMenuOpen,
      toggleGameMenu: () => this.setState({ gameMenuOpen: !s.gameMenuOpen }),
      setNewGameName: (e) => this.setState({ newGameName: e.target.value }),
      addGame: () => this.addGame(),
      activeGameName: ((s.games || []).find(g => g.id === s.activeGame) || { name: 'My Campaign' }).name,
      newGameName: s.newGameName || '',
      themeSwatches: ['#8C5A2B', '#5B4A8A', '#2E6E5E', '#8A3B3B'].map(hex => ({
        hex,
        ring: hex === accent ? theme.text : 'transparent',
        select: () => this.setGameAccent(hex)
      })),
      bannerModeOptions: [['none', 'None'], ['banner', 'Banner'], ['full', 'Full background']].map(([key, label]) => ({
        key, label,
        bg: s.bannerMode === key ? accent : theme.panel,
        fg: s.bannerMode === key ? '#fff' : theme.text,
        bc: s.bannerMode === key ? accent : theme.border2,
        select: () => this.setBannerMode(key)
      })),
      rosterBannerId: 'roster-banner-' + (s.activeGame || 'default'),
      rosterBgId: 'roster-bg-' + (s.activeGame || 'default'),
      showRosterBanner: s.bannerMode === 'banner',
      showRosterBg: s.bannerMode === 'full',
      wrapperBg: (s.bannerMode === 'full' && s.screen === 'roster') ? 'transparent' : theme.bg,
      gameList: (s.games || []).map(g => ({
        name: g.name,
        bg: g.id === s.activeGame ? accent : 'transparent',
        fg: g.id === s.activeGame ? '#fff' : theme.text,
        deletable: g.id !== 'default' && (s.games || []).length > 1,
        editing: s.editingGameId === g.id,
        notEditing: s.editingGameId !== g.id,
        editVal: s.editingGameId === g.id ? (s.renameGameVal ?? g.name) : g.name,
        editChange: (e) => this.setState({ renameGameVal: e.target.value }),
        startEdit: (e) => { e.stopPropagation(); this.setState({ editingGameId: g.id, renameGameVal: g.name }); },
        editSave: () => {
          const name = (this.state.renameGameVal || '').trim() || g.name;
          this.renameGame(g.id, name);
          this.setState({ editingGameId: null, renameGameVal: '' });
        },
        select: () => this.switchGame(g.id),
        remove: (e) => { e.stopPropagation(); this.deleteGame(g.id); }
      })),
      compendiumList: (s.chars || []).flatMap(ch => (ch.companions || []).map((comp, i) => {
        this.normalizeCompanion(comp);
        return {
          ownerName: ch.name,
          name: comp.name || 'Companion ' + (i + 1),
          movement: comp.movement || '—',
          difficulty: comp.difficulty,
          attack: (comp.attacks || []).map(a => a.name + (a.formula ? ' — ' + a.formula : '')).join(', ') || '—',
          stTxt: comp.stress.marked + ' / ' + comp.stress.max,
          stPips: this.mkPipsReadonlyCountdown(comp.stress.max, comp.stress.marked, '#5B4A8A'),
          featuresTxt: (comp.features || []).map(f => f.name).join(', ') || '—',
          openOwner: () => this.setState({ screen: 'sheet', activeId: ch.id, tab: 'comp', dmgInput: '', useArmor: false }),
          confirmingDelete: s.compDeleteConfirmKey === (ch.id + ':' + i),
          stopClick: (e) => e.stopPropagation(),
          askDelete: (e) => { e.stopPropagation(); this.setState({ compDeleteConfirmKey: ch.id + ':' + i }); },
          cancelDelete: (e) => { e.stopPropagation(); this.setState({ compDeleteConfirmKey: null }); },
          confirmDelete: (e) => {
            e.stopPropagation();
            let removedComp = null;
            this.upAll(chars => {
              const owner = chars.find(x => x.id === ch.id);
              if (owner && owner.companions) {
                removedComp = JSON.parse(JSON.stringify(owner.companions[i]));
                owner.companions.splice(i, 1);
                if (owner.activeCompanion >= owner.companions.length) owner.activeCompanion = 0;
              }
            });
            this.showUndo('comp', (removedComp && removedComp.name ? removedComp.name : 'Companion') + ' removed', { ownerId: ch.id, index: i, comp: removedComp });
            this.setState({ compDeleteConfirmKey: null });
          }
        };
      })),
      isSheet,
      isParty: !showAuthGate && s.screen === 'party',
      goParty: () => this.setState({ screen: 'party' }),
      goPartyMenu: () => this.setState({ screen: 'party', pagesOpen: false }),
      partyList: (s.party || []).map(p => ({
        name: p.name, note: p.note, qty: p.qty,
        holder: p.holder || 'Unassigned',
        inc: () => this.upParty(pl => { const x = pl.find(y => y.id === p.id); if (x) x.qty += 1; }),
        dec: () => this.upParty(pl => { const x = pl.find(y => y.id === p.id); if (x) x.qty = Math.max(0, x.qty - 1); }),
        cycleHolder: () => this.upParty(pl => {
          const x = pl.find(y => y.id === p.id);
          if (!x) return;
          const names = ['', ...(s.chars || []).map(ch => ch.name)];
          const i = names.indexOf(x.holder || '');
          x.holder = names[(i + 1) % names.length];
        }),
        remove: () => this.upParty(pl => { const i = pl.findIndex(y => y.id === p.id); if (i >= 0) pl.splice(i, 1); })
      })),
      newPartyName: s.newPartyName,
      setNewPartyName: e => this.setState({ newPartyName: e.target.value }),
      newPartyQty: s.newPartyQty,
      setNewPartyQty: e => this.setState({ newPartyQty: e.target.value }),
      newPartyNote: s.newPartyNote,
      setNewPartyNote: e => this.setState({ newPartyNote: e.target.value }),
      addPartyItem: () => {
        if (!s.newPartyName.trim()) return;
        const item = { id: 'p' + Date.now(), name: s.newPartyName.trim(), qty: parseInt(s.newPartyQty, 10) || 1, note: s.newPartyNote.trim(), holder: '' };
        this.upParty(pl => pl.push(item));
        this.setState({ newPartyName: '', newPartyQty: '1', newPartyNote: '' });
      },
      isRecaps: !showAuthGate && s.screen === 'recaps',
      goRecaps: () => this.setState({ screen: 'recaps' }),
      goRecapsMenu: () => this.setState({ screen: 'recaps', pagesOpen: false }),
      recapList: (s.recaps || []).map(r => ({
        date: r.date, title: r.title, text: r.text,
        remove: () => this.upRecaps(rl => { const i = rl.findIndex(y => y.id === r.id); if (i >= 0) rl.splice(i, 1); })
      })),
      newRecapDate: s.newRecapDate,
      setNewRecapDate: e => this.setState({ newRecapDate: e.target.value }),
      newRecapTitle: s.newRecapTitle,
      setNewRecapTitle: e => this.setState({ newRecapTitle: e.target.value }),
      newRecapText: s.newRecapText,
      setNewRecapText: e => this.setState({ newRecapText: e.target.value }),
      addRecap: () => {
        if (!s.newRecapTitle.trim()) return;
        const entry = { id: 'sr' + Date.now(), date: s.newRecapDate.trim() || ('Session ' + ((s.recaps || []).length + 1)), title: s.newRecapTitle.trim(), text: s.newRecapText.trim() };
        this.upRecaps(rl => rl.unshift(entry));
        this.setState({ newRecapDate: '', newRecapTitle: '', newRecapText: '' });
      },
      goRoster: () => this.setState({ screen: 'roster' }),
      undoOpen: !!s.undo,
      undoLabel: s.undo ? s.undo.label : '',
      undoClick: () => this.performUndo(),
      undoDismiss: () => { if (this.undoTimer) clearTimeout(this.undoTimer); this.setState({ undo: null }); },
      addChar: () => this.upAll(chars => {
        const nc = this.blankChar();
        chars.push(nc);
        setTimeout(() => this.setState({ screen: 'sheet', activeId: nc.id, tab: 'edit' }), 0);
      }),
      importFileChange: (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => this.handleImportedFile(reader.result);
        reader.onerror = () => this.setState({ importError: 'Couldn’t read that file.' });
        reader.readAsText(file);
      },
      importErrorOpen: !!s.importError,
      importErrorText: s.importError,
      dismissImportError: () => this.setState({ importError: '' }),
      rosterCards: (s.chars || []).map(ch => {
        const firstComp = (ch.companions && ch.companions.length) ? ch.companions[0] : null;
        if (firstComp && !firstComp.portraitKey) firstComp.portraitKey = 'comp-' + Math.random().toString(36).slice(2, 9);
        return {
          name: ch.name,
          sub: 'Level ' + ch.level + ' ' + [ch.ancestry, ch.klass].filter(Boolean).join(' ') + (ch.subclass ? ' · ' + ch.subclass : ''),
          level: ch.level,
          hpTxt: (ch.hp.max - ch.hp.marked) + '/' + ch.hp.max,
          hpPct: Math.round(100 * (ch.hp.max - ch.hp.marked) / ch.hp.max) + '%',
          stTxt: ch.stress.marked + '/' + ch.stress.max,
          stPct: Math.round(100 * ch.stress.marked / ch.stress.max) + '%',
          hasComp: !!firstComp,
          compName: (ch.companions && ch.companions.length) ? (ch.companions.length > 1 ? ch.companions.length + ' companions' : ch.companions[0].name) : '',
          compPortraitId: firstComp ? ('portrait-' + ch.id + '-' + firstComp.portraitKey) : '',
          stopClick: (e) => e.stopPropagation(),
          open: () => this.setState({ screen: 'sheet', activeId: ch.id, tab: 'play', dmgInput: '', useArmor: false }),
          confirmingDelete: s.rosterDeleteConfirmId === ch.id,
          askDelete: (e) => { e.stopPropagation(); this.setState({ rosterDeleteConfirmId: ch.id }); },
          cancelDelete: (e) => { e.stopPropagation(); this.setState({ rosterDeleteConfirmId: null }); },
          confirmDelete: (e) => {
            e.stopPropagation();
            let removed = null, removedIdx = -1;
            this.upAll(chars => {
              const idx = chars.findIndex(x => x.id === ch.id);
              if (idx > -1) { removed = JSON.parse(JSON.stringify(chars[idx])); removedIdx = idx; chars.splice(idx, 1); }
            });
            this.showUndo('char', ch.name + ' removed', { char: removed, index: removedIdx });
            this.setState({ rosterDeleteConfirmId: null });
          }
        };
      })
    };

    vals.importConflictOpen = !!s.importConflict;
    if (s.importConflict) {
      const { migrated, rawKeys, existingId } = s.importConflict;
      const chars = s.chars || [];
      const existing = chars.find(ch => ch.id === existingId);
      vals.importConflictName = migrated.name;
      vals.importCancelConflict = () => this.setState({ importConflict: null });
      vals.importAsNew = () => {
        this.upAll(list => { list.push(this.importAsNewChar(migrated, rawKeys, list)); });
        this.setState({ importConflict: null });
      };
      vals.importMerge = () => {
        this.upAll(list => {
          const idx = list.findIndex(ch => ch.id === existingId);
          if (idx > -1) list[idx] = this.mergeChar(list[idx], migrated, rawKeys);
        });
        this.setState({ importConflict: null });
      };
      const diffLines = existing ? this.computeMergeDiff(existing, migrated, rawKeys) : [];
      vals.importMergeDiffLines = diffLines.map(text => ({ text }));
      vals.importMergeDiffHasLines = diffLines.length > 0;
    }

    vals.openWizard = () => this.setState({ wizard: this.newWizard() });
    vals.wizardOpen = !!s.wizard;
    if (s.wizard) {
      const w = s.wizard;
      const cd = this.classData();
      vals.wizClassOptions = Object.keys(cd);
      vals.wizSubclassOptions = (w.klass && cd[w.klass]) ? cd[w.klass].subclasses : [];
      vals.wizHasSubclasses = vals.wizSubclassOptions.length > 0;
      vals.wizAncestryOptions = this.ancestryList();
      vals.wizCommunityOptions = this.communityList();
      vals.wizName = w.name;
      vals.wizSetName = e => this.upWizard(x => { x.name = e.target.value; });
      vals.wizPronouns = w.pronouns;
      vals.wizSetPronouns = e => this.upWizard(x => { x.pronouns = e.target.value; });
      vals.wizKlass = w.klass;
      vals.wizSetKlass = e => this.upWizard(x => {
        x.klass = e.target.value; x.subclass = '';
        const info = cd[x.klass];
        const wp = (info && info.weapons && info.weapons[0]) || this.weaponPresets()[0];
        const ap = (info && info.armors && info.armors[0]) || this.armorPresets()[0];
        x.weaponPreset = wp.id; x.weaponName = wp.name; x.weaponRange = wp.range; x.weaponDamage = wp.damage;
        x.armorPreset = ap.id; x.armorName = ap.name; x.armorScore = ap.score;
      });
      vals.wizSubclass = w.subclass;
      vals.wizSetSubclass = e => this.upWizard(x => { x.subclass = e.target.value; });
      vals.wizLevel = w.level;
      vals.wizSetLevel = e => this.upWizard(x => { x.level = Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)); });
      vals.wizLevelHigherOpen = !!w.levelHigherOpen;
      vals.wizPickLevel1 = () => this.upWizard(x => { x.level = 1; x.levelHigherOpen = false; });
      vals.wizPickLevelHigher = () => this.upWizard(x => { x.levelHigherOpen = true; if (x.level < 2) x.level = 2; });
      vals.wizLevel1BorderColor = (!w.levelHigherOpen && w.level === 1) ? accent : theme.border;
      vals.wizLevel1Bg = (!w.levelHigherOpen && w.level === 1) ? theme.highlightBg : theme.panel;
      vals.wizLevelHigherBorderColor = w.levelHigherOpen ? accent : theme.border;
      vals.wizLevelHigherBg = w.levelHigherOpen ? theme.highlightBg : theme.panel;
      vals.wizMulticlassEnabled = w.multiclassEnabled;
      vals.wizToggleMulticlass = () => this.upWizard(x => { x.multiclassEnabled = !x.multiclassEnabled; if (!x.multiclassEnabled) { x.multiKlass = ''; x.multiSubclass = ''; } });
      vals.wizMultiClassOptions = Object.keys(cd).filter(k => k !== w.klass);
      vals.wizMultiKlass = w.multiKlass;
      vals.wizSetMultiKlass = e => this.upWizard(x => { x.multiKlass = e.target.value; x.multiSubclass = ''; });
      vals.wizMultiSubclass = w.multiSubclass;
      vals.wizSetMultiSubclass = e => this.upWizard(x => { x.multiSubclass = e.target.value; });
      vals.wizMultiSubclassOptions = (w.multiKlass && cd[w.multiKlass]) ? cd[w.multiKlass].subclasses : [];
      vals.wizMultiHasSubclasses = vals.wizMultiSubclassOptions.length > 0;
      vals.wizAncestry = w.ancestry;
      vals.wizSetAncestry = e => this.upWizard(x => { x.ancestry = e.target.value; });
      vals.wizCommunity = w.community;
      vals.wizSetCommunity = e => this.upWizard(x => { x.community = e.target.value; });
      const traitOrder = ['Agility', 'Strength', 'Finesse', 'Instinct', 'Presence', 'Knowledge'];
      vals.wizTraits = traitOrder.map(name => ({
        name, val: w.traits[name],
        on: e => { const v = parseInt(e.target.value, 10); this.upWizard(x => { x.traits = Object.assign({}, x.traits, { [name]: isNaN(v) ? 0 : v }); }); }
      }));
      vals.wizCanReroll = !w.traitsRerolled;
      vals.wizReroll = () => this.upWizard(x => { x.traits = this.rollTraitArray(); x.traitsRerolled = true; });
      const domainNames = (w.klass && cd[w.klass]) ? cd[w.klass].domains : ['Domain 1', 'Domain 2'];
      const cardLib = this.effectiveDomainCardLibrary();
      vals.wizCards = w.domainCards.map((card, i) => {
        const domain = domainNames[i];
        const options = cardLib[domain] || [];
        return {
          domainLabel: domain || ('Domain ' + (i + 1)),
          options: options.map(o => ({
            name: o.name, active: card.name === o.name,
            borderColor: card.name === o.name ? accent : theme.border2,
            select: () => this.upWizard(x => { x.domainCards[i].name = o.name; x.domainCards[i].text = o.text; })
          })),
          hasOptions: options.length > 0,
          name: card.name, text: card.text,
          onName: e => this.upWizard(x => { x.domainCards[i].name = e.target.value; }),
          onText: e => this.upWizard(x => { x.domainCards[i].text = e.target.value; })
        };
      });
      const classWeapons = (w.klass && cd[w.klass] && cd[w.klass].weapons) ? cd[w.klass].weapons : this.weaponPresets();
      vals.wizWeaponPresets = classWeapons.map(p => ({
        id: p.id, name: p.name, active: w.weaponPreset === p.id,
        borderColor: w.weaponPreset === p.id ? accent : theme.border2,
        select: () => this.upWizard(x => { x.weaponPreset = p.id; x.weaponName = p.name; x.weaponRange = p.range; x.weaponDamage = p.damage; })
      }));
      vals.wizWeaponName = w.weaponName;
      vals.wizSetWeaponName = e => this.upWizard(x => { x.weaponName = e.target.value; });
      vals.wizWeaponRange = w.weaponRange;
      vals.wizSetWeaponRange = e => this.upWizard(x => { x.weaponRange = e.target.value; });
      vals.wizWeaponDamage = w.weaponDamage;
      vals.wizSetWeaponDamage = e => this.upWizard(x => { x.weaponDamage = e.target.value; });
      const classArmors = (w.klass && cd[w.klass] && cd[w.klass].armors) ? cd[w.klass].armors : this.armorPresets();
      vals.wizArmorPresets = classArmors.map(p => ({
        id: p.id, name: p.name, active: w.armorPreset === p.id,
        borderColor: w.armorPreset === p.id ? accent : theme.border2,
        select: () => this.upWizard(x => { x.armorPreset = p.id; x.armorName = p.name; x.armorScore = p.score; })
      }));
      vals.wizArmorName = w.armorName;
      vals.wizSetArmorName = e => this.upWizard(x => { x.armorName = e.target.value; });
      vals.wizArmorScore = w.armorScore;
      vals.wizSetArmorScore = e => this.upWizard(x => { x.armorScore = parseInt(e.target.value, 10) || 0; });
      vals.wizId = w.id;
      vals.wizCompanionEnabled = w.companionEnabled;
      vals.wizToggleCompanion = () => this.upWizard(x => { x.companionEnabled = !x.companionEnabled; });
      vals.wizCompPortraitId = 'portrait-' + w.id + '-' + w.compPortraitKey;
      vals.wizCompName = w.compName;
      vals.wizSetCompName = e => this.upWizard(x => { x.compName = e.target.value; });
      vals.wizCompMovement = w.compMovement;
      vals.wizSetCompMovement = e => this.upWizard(x => { x.compMovement = e.target.value; });
      vals.wizCompAttackName = w.compAttackName;
      vals.wizSetCompAttackName = e => this.upWizard(x => { x.compAttackName = e.target.value; });
      vals.wizCompAttackRange = w.compAttackRange;
      vals.wizSetCompAttackRange = e => this.upWizard(x => { x.compAttackRange = e.target.value; });
      vals.wizCompAttackFormula = w.compAttackFormula;
      vals.wizSetCompAttackFormula = e => this.upWizard(x => { x.compAttackFormula = e.target.value; });
      vals.wizCompBackstory = w.compBackstory;
      vals.wizSetCompBackstory = e => this.upWizard(x => { x.compBackstory = e.target.value; });
      vals.wizInventoryText = w.inventoryText;
      vals.wizSetInventoryText = e => this.upWizard(x => { x.inventoryText = e.target.value; });
      vals.wizPortraitId = 'portrait-' + w.id;
      vals.wizExp1 = w.exp1;
      vals.wizSetExp1 = e => this.upWizard(x => { x.exp1 = e.target.value; });
      vals.wizExp2 = w.exp2;
      vals.wizSetExp2 = e => this.upWizard(x => { x.exp2 = e.target.value; });
      vals.wizBackground = w.background;
      vals.wizSetBackground = e => this.upWizard(x => { x.background = e.target.value; });
      vals.wizConnections = w.connections;
      vals.wizSetConnections = e => this.upWizard(x => { x.connections = e.target.value; });
      vals.wizReviewName = w.name || 'Unnamed';
      vals.wizReviewLevelLine = 'Level ' + (w.level || 1);
      vals.wizReviewLine2 = [w.ancestry, w.community].filter(Boolean).join(' · ') || '—';
      vals.wizReviewLine3 = [w.klass, w.subclass].filter(Boolean).join(' — ') || '—';
      vals.wizReviewLine3b = (w.multiclassEnabled && w.multiKlass) ? ('Multiclass: ' + [w.multiKlass, w.multiSubclass].filter(Boolean).join(' — ')) : '';
      vals.wizHasMultiReview = !!vals.wizReviewLine3b;
      vals.wizReviewTraits = traitOrder.map(t => t + ' ' + (w.traits[t] >= 0 ? '+' : '') + w.traits[t]).join(', ');
      vals.wizReviewCompLine = w.companionEnabled && w.compName.trim() ? ('Companion: ' + w.compName.trim()) : '';
      vals.wizHasCompReview = !!vals.wizReviewCompLine;
      const stepNames = ['Starting Level', 'Class', 'Multiclass', 'Ancestry', 'Traits', 'Domain cards', 'Equipment & Inventory', 'Companion', 'Experiences', 'Background', 'Portrait', 'Review'];
      vals.wizStepLabel = stepNames[w.step] + ' (' + (w.step + 1) + ' / ' + stepNames.length + ')';
      vals.wizIsStep = stepNames.map((_, i) => i === w.step);
      vals.wizCanNext = w.step === 1 ? !!w.klass
        : (w.step === 2 ? (!w.multiclassEnabled || !!w.multiKlass)
        : (w.step === 3 ? (!!w.ancestry && !!w.community) : true));
      vals.wizIsFirst = w.step === 0;
      vals.wizIsNotFirst = w.step !== 0;
      vals.wizIsLast = w.step === stepNames.length - 1;
      vals.wizIsNotLast = w.step !== stepNames.length - 1;
      vals.wizRerollDisabled = w.traitsRerolled;
      vals.wizNextDisabled = !vals.wizCanNext;
      vals.wizNext = () => this.upWizard(x => { if (x.step < stepNames.length - 1) x.step += 1; });
      vals.wizBack = () => this.upWizard(x => { if (x.step > 0) x.step -= 1; });
      vals.wizNewCancel = () => this.setState({ wizard: null });
      vals.wizFinish = () => this.finishWizard();
    }

    if (!isSheet) return vals;

    // ---- pages menu ----
    vals.pagesOpen = !!s.pagesOpen;
    vals.togglePages = () => this.setState({ pagesOpen: !s.pagesOpen });
    vals.pageRoster = () => this.setState({ screen: 'roster', pagesOpen: false });
    vals.pageList = (s.chars || []).map(ch => ({
      name: ch.name,
      sub: 'Lv ' + ch.level + ' ' + ch.klass,
      fg: ch.id === s.activeId ? accent : theme.text,
      bg: ch.id === s.activeId ? theme.highlightBg : 'transparent',
      open: () => this.setState({ screen: 'sheet', activeId: ch.id, tab: 'play', pagesOpen: false, dmgInput: '', useArmor: false })
    }));

    // ---- sheet-level values ----
    vals.c = c;
    vals.headerSub = [c.pronouns, [c.ancestry, c.community].filter(Boolean).join(' · '), c.klass + (c.subclass ? ' (' + c.subclass + ')' : ''), c.domains.join(' & ')].filter(Boolean).join('  ·  ');
    vals.isMulticlass = !!c.multiclass;
    vals.multiclassLabel = c.multiclass ? c.multiclass.klass + (c.multiclass.subclass ? ' (' + c.multiclass.subclass + ')' : '') : '';
    vals.toggleMulticlass = () => this.up(ch => { ch.multiclass = ch.multiclass ? null : { klass: '', subclass: '' }; });

    this.normalizeChar(c);

    const isDruid = c.klass === 'Druid' || (c.multiclass && c.multiclass.klass === 'Druid');
    const isCompanionClass = c.klass === 'Ranger' || c.klass === 'Druid' || (c.multiclass && (c.multiclass.klass === 'Ranger' || c.multiclass.klass === 'Druid'));
    const hasCompanion = (c.companions || []).length > 0;
    const compDimmed = !isCompanionClass && !hasCompanion;
    const tabDefs = [
      ['play', 'Play'], ['cards', 'Cards'], ['gear', 'Gear & Notes'],
      ['comp', 'Companion'],
      ...(isDruid ? [['wildshape', 'Wildshape']] : []),
      ...(c.transformation.enabled ? [['transformation', 'Transformation']] : []),
      ['backstory', 'Backstory'],
      ['downtime', 'Downtime'], ['level', 'Level Up'], ['edit', 'Edit']
    ];
    vals.tabs = tabDefs.map(([key, label]) => {
      const muted = (key === 'edit' || key === 'level') || (key === 'comp' && compDimmed);
      const active = s.tab === key;
      let tip = '';
      if (key === 'comp') tip = hasCompanion ? 'This character has a companion' : (isCompanionClass ? 'No companion added yet' : 'No companion — mainly used by Ranger/Druid');
      else if (key === 'edit') tip = 'Edit character details';
      else if (key === 'level') tip = 'Level up this character';
      return {
        label: (key === 'comp' && hasCompanion) ? (label + ' \u2726') : label,
        bg: active ? accent : theme.panel,
        fg: active ? '#fff' : (muted ? theme.muted : theme.text),
        bc: active ? accent : (muted ? theme.border3 : theme.border2),
        opacity: (muted && !active) ? '0.7' : '1',
        tip,
        click: () => this.setState({ tab: key })
      };
    });
    vals.tabPlay = s.tab === 'play';
    vals.tabCards = s.tab === 'cards';
    vals.tabGear = s.tab === 'gear';
    vals.tabComp = s.tab === 'comp';
    vals.tabWildshape = s.tab === 'wildshape';
    vals.tabTransformation = s.tab === 'transformation';
    vals.tabBackstory = s.tab === 'backstory';
    vals.backstoryVal = c.backstory || '';
    vals.hasBackstory = !!(c.backstory && c.backstory.trim());
    vals.noBackstory = !vals.hasBackstory;
    vals.compBackstoryLine = (hasCompanion && c.companions[c.activeCompanion] && c.companions[c.activeCompanion].backstory) ? c.companions[c.activeCompanion].backstory : '';
    vals.hasCompBackstory = !!vals.compBackstoryLine;
    vals.tabDowntime = s.tab === 'downtime';
    vals.tabLevel = s.tab === 'level';
    vals.tabEdit = s.tab === 'edit';

    // ---- conditions ----
    vals.conditionList = c.conditions.map((cd, i) => ({
      name: cd.name, desc: cd.desc,
      bg: cd.active ? theme.highlightBg : theme.panel,
      bc: cd.active ? '#A33B3B' : theme.border2,
      fg: cd.active ? '#A33B3B' : theme.muted,
      removable: !cd.builtin,
      toggle: () => this.up(ch => { ch.conditions[i].active = !ch.conditions[i].active; }),
      remove: () => this.up(ch => { ch.conditions.splice(i, 1); })
    }));
    vals.newConditionName = s.newConditionName;
    vals.setNewConditionName = e => this.setState({ newConditionName: e.target.value });
    vals.addCondition = () => {
      const name = s.newConditionName.trim();
      if (!name) return;
      this.up(ch => ch.conditions.push({ key: 'c' + Date.now(), name, desc: '', active: true, builtin: false }));
      this.setState({ newConditionName: '' });
    };

    // ---- play tab ----
    vals.traitList = Object.entries(c.traits).map(([name, v]) => ({ name, val: v >= 0 ? '+' + v : '' + v }));
    vals.expListView = c.experiences.map(x => ({ name: x.name, bonus: '+' + x.bonus }));
    vals.hpTxt = c.hp.marked + ' / ' + c.hp.max + ' marked';
    vals.stTxt = c.stress.marked + ' / ' + c.stress.max + ' marked';
    vals.arTxt = c.armor.marked + ' / ' + c.armor.max + ' used';
    vals.hopeTxt = c.hope.marked + ' / ' + c.hope.max;
    vals.hpPips = this.mkPipsCountdown(c.hp.max, c.hp.marked, '#A33B3B', v => this.up(ch => ch.hp.marked = v));
    vals.stPips = this.mkPipsCountdown(c.stress.max, c.stress.marked, '#5B4A8A', v => this.up(ch => ch.stress.marked = v));
    vals.arPips = this.mkPips(c.armor.max, c.armor.marked, '#5A6470', v => this.up(ch => ch.armor.marked = v));
    vals.hopePips = this.mkPips(c.hope.max, c.hope.marked, '#C9A227', v => this.up(ch => ch.hope.marked = v));

    vals.dmgInput = s.dmgInput;
    vals.setDmgInput = e => this.setState({ dmgInput: e.target.value });
    vals.useArmor = s.useArmor;
    vals.toggleArmor = () => this.setState({ useArmor: !s.useArmor });
    const calc = dmgCalc(s, c);
    vals.dmgResult = calc.txt;
    vals.applyDamage = () => {
      if (!calc.valid) return;
      const useArmor = s.useArmor;
      this.up(ch => {
        ch.hp.marked = Math.min(ch.hp.max, ch.hp.marked + calc.hp);
        if (useArmor && ch.armor.marked < ch.armor.max && calc.hp >= 0) ch.armor.marked += 1;
      });
      this.setState({ dmgInput: '', useArmor: false });
    };
    vals.modList = c.dmgMods.map(m => ({
      label: m.label,
      eff: m.type === 'half' ? '½ damage' : (m.type === 'minus' ? '−' + m.value : '+' + m.value),
      bg: m.active ? theme.highlightBg : theme.panel,
      bc: m.active ? accent : theme.border,
      fg: m.active ? 'var(--text)' : 'var(--muted)',
      toggle: () => this.up(ch => { const x = ch.dmgMods.find(y => y.id === m.id); if (x) x.active = !x.active; }),
      remove: () => this.up(ch => { ch.dmgMods = ch.dmgMods.filter(y => y.id !== m.id); })
    }));
    vals.newModLabel = s.newModLabel;
    vals.setNewModLabel = e => this.setState({ newModLabel: e.target.value });
    vals.newModType = s.newModType;
    vals.setNewModType = e => this.setState({ newModType: e.target.value });
    vals.newModValue = s.newModValue;
    vals.setNewModValue = e => this.setState({ newModValue: e.target.value });
    vals.addMod = () => {
      if (!s.newModLabel.trim()) return;
      const mod = { id: 'm' + Date.now(), label: s.newModLabel.trim(), type: s.newModType, value: parseInt(s.newModValue, 10) || 0, active: true };
      this.up(ch => ch.dmgMods.push(mod));
      this.setState({ newModLabel: '' });
    };

    vals.longRest = () => this.up(ch => {
      ch.hp.marked = 0;
      ch.stress.marked = 0;
      ch.armor.marked = 0;
      ch.restItems.forEach(r => r.used = false);
      (ch.companions || []).forEach(comp => comp.stress.marked = 0);
    });

    vals.trackerList = c.trackers.map(t => ({
      label: t.label, value: t.value,
      inc: () => this.up(ch => { const x = ch.trackers.find(y => y.id === t.id); if (x) x.value += 1; }),
      dec: () => this.up(ch => { const x = ch.trackers.find(y => y.id === t.id); if (x) x.value = Math.max(0, x.value - 1); }),
      remove: () => this.up(ch => { ch.trackers = ch.trackers.filter(y => y.id !== t.id); })
    }));
    vals.newTracker = s.newTracker;
    vals.setNewTracker = e => this.setState({ newTracker: e.target.value });
    vals.addTracker = () => {
      if (!s.newTracker.trim()) return;
      const t = { id: 't' + Date.now(), label: s.newTracker.trim(), value: 0 };
      this.up(ch => ch.trackers.push(t));
      this.setState({ newTracker: '' });
    };

    vals.restItemList = c.restItems.map(r => ({
      name: r.name, desc: r.desc,
      bg: r.used ? '#8C5A2B' : 'transparent',
      check: r.used ? '✓' : '',
      deco: r.used ? 'line-through' : 'none',
      fg: r.used ? 'var(--muted)' : 'var(--text)',
      toggle: () => this.up(ch => { const x = ch.restItems.find(y => y.id === r.id); if (x) x.used = !x.used; }),
      remove: () => this.up(ch => { ch.restItems = ch.restItems.filter(y => y.id !== r.id); })
    }));
    vals.newItemName = s.newItemName;
    vals.setNewItemName = e => this.setState({ newItemName: e.target.value });
    vals.newItemDesc = s.newItemDesc;
    vals.setNewItemDesc = e => this.setState({ newItemDesc: e.target.value });
    vals.addRestItem = () => {
      if (!s.newItemName.trim()) return;
      const r = { id: 'r' + Date.now(), name: s.newItemName.trim(), desc: s.newItemDesc.trim(), used: false };
      this.up(ch => ch.restItems.push(r));
      this.setState({ newItemName: '', newItemDesc: '' });
    };

    // ---- cards tab ----
    const mkCard = cd => ({
      name: cd.name,
      meta: cd.domain + ' · Lv ' + cd.level + ' · ' + cd.type,
      text: cd.text,
      chip: this.domainColor(cd.domain),
      move: () => this.up(ch => { const x = ch.cards.find(y => y.id === cd.id); if (x) x.loadout = !x.loadout; })
    });
    vals.loadoutCards = c.cards.filter(x => x.loadout).map(mkCard);
    vals.vaultCards = c.cards.filter(x => !x.loadout).map(mkCard);
    vals.newCardName = s.newCardName;
    vals.setNewCardName = e => this.setState({ newCardName: e.target.value });
    vals.newCardDomain = s.newCardDomain;
    vals.setNewCardDomain = e => this.setState({ newCardDomain: e.target.value });
    const builtinDomainNames = Object.keys(this.domainCardLibrary());
    vals.domainOptions = builtinDomainNames.concat((s.customDomains || []).map(d => d.name));
    vals.customDomainList = (s.customDomains || []).map((d, i) => ({
      name: d.name, chip: d.color,
      remove: () => this.upDomains(dl => dl.splice(i, 1))
    }));
    vals.newDomainName = s.newDomainName;
    vals.setNewDomainName = e => this.setState({ newDomainName: e.target.value });
    vals.addDomain = () => {
      const name = s.newDomainName.trim();
      if (!name || builtinDomainNames.includes(name) || (s.customDomains || []).some(d => d.name === name)) return;
      const palette = this.domainPalette();
      const color = palette[(s.customDomains || []).length % palette.length];
      this.upDomains(dl => dl.push({ name, color }));
      this.setState({ newDomainName: '' });
    };

    vals.cardImportText = s.cardImportText || '';
    vals.setCardImportText = e => this.setState({ cardImportText: e.target.value });
    vals.importCards = () => {
      const { cards, errors } = this.parseCardImportText(s.cardImportText);
      if (cards.length) {
        this.upImportedCards(imp => {
          cards.forEach(card => {
            if (!imp[card.domain]) imp[card.domain] = [];
            const i = imp[card.domain].findIndex(x => x.name.toLowerCase() === card.name.toLowerCase());
            const entry = { name: card.name, type: card.type, level: card.level, text: card.text };
            if (i >= 0) imp[card.domain][i] = entry; else imp[card.domain].push(entry);
          });
        });
      }
      const domainsTouched = Array.from(new Set(cards.map(c => c.domain)));
      this.setState({ cardImportResult: { count: cards.length, domains: domainsTouched, errors }, cardImportText: cards.length ? '' : s.cardImportText });
    };
    const importResult = s.cardImportResult;
    vals.hasImportResult = !!importResult;
    vals.importResultSummary = importResult
      ? (importResult.count + ' card' + (importResult.count === 1 ? '' : 's') + ' imported'
        + (importResult.domains.length ? ' — ' + importResult.domains.join(', ') : ''))
      : '';
    vals.importHadCards = !!(importResult && importResult.count);
    vals.importErrors = importResult ? importResult.errors : [];
    vals.hasImportErrors = !!(importResult && importResult.errors.length);
    const importedByDomain = s.importedDomainCards || {};
    vals.importedCardList = [];
    Object.keys(importedByDomain).forEach(d => {
      (importedByDomain[d] || []).forEach((card, i) => {
        vals.importedCardList.push({
          domain: d, name: card.name, chip: this.domainColor(d),
          remove: () => this.upImportedCards(imp => {
            imp[d].splice(i, 1);
            if (!imp[d].length) delete imp[d];
          })
        });
      });
    });
    vals.hasImportedCards = vals.importedCardList.length > 0;
    vals.importedCardCount = vals.importedCardList.length;
    vals.clearAllImported = () => { if (window.confirm('Remove all ' + vals.importedCardCount + ' imported cards? This can\'t be undone.')) this.upImportedCards(imp => Object.keys(imp).forEach(k => delete imp[k])); };

    const builtinAncestries = this.ancestryList();
    vals.ancestryOptions = builtinAncestries.concat((s.customAncestries || []).map(a => a.name));
    vals.customAncestryList = (s.customAncestries || []).map((a, i) => ({
      name: a.name, feature: a.feature,
      remove: () => this.upAncestries(al => al.splice(i, 1))
    }));
    vals.newAncestryName = s.newAncestryName;
    vals.setNewAncestryName = e => this.setState({ newAncestryName: e.target.value });
    vals.newAncestryFeature = s.newAncestryFeature;
    vals.setNewAncestryFeature = e => this.setState({ newAncestryFeature: e.target.value });
    vals.addAncestry = () => {
      const name = s.newAncestryName.trim();
      if (!name || builtinAncestries.includes(name) || (s.customAncestries || []).some(a => a.name === name)) return;
      this.upAncestries(al => al.push({ name, feature: s.newAncestryFeature.trim() }));
      this.setState({ newAncestryName: '', newAncestryFeature: '' });
    };

    const builtinClasses = Object.keys(this.classData());
    vals.classOptions = builtinClasses.concat((s.customClasses || []).map(cl => cl.name));
    vals.customClassList = (s.customClasses || []).map((cl, i) => ({
      name: cl.name, desc: cl.desc,
      remove: () => this.upClasses(cll => cll.splice(i, 1))
    }));
    vals.newClassName = s.newClassName;
    vals.setNewClassName = e => this.setState({ newClassName: e.target.value });
    vals.newClassDesc = s.newClassDesc;
    vals.setNewClassDesc = e => this.setState({ newClassDesc: e.target.value });
    vals.addClass = () => {
      const name = s.newClassName.trim();
      if (!name || builtinClasses.includes(name) || (s.customClasses || []).some(cl => cl.name === name)) return;
      this.upClasses(cll => cll.push({ name, desc: s.newClassDesc.trim() }));
      this.setState({ newClassName: '', newClassDesc: '' });
    };
    vals.clearClass = () => this.up(ch => { ch.klass = ''; ch.subclass = ''; });
    vals.newCardText = s.newCardText;
    vals.setNewCardText = e => this.setState({ newCardText: e.target.value });
    vals.addCard = () => {
      if (!s.newCardName.trim()) return;
      const cd = { id: 'k' + Date.now(), name: s.newCardName.trim(), domain: s.newCardDomain, level: c.level, type: 'Ability', text: s.newCardText.trim(), loadout: true };
      this.up(ch => ch.cards.push(cd));
      this.setState({ newCardName: '', newCardText: '' });
    };

    // ---- gear tab ----
    vals.goldList = Object.entries(c.gold).map(([label, v]) => ({
      label, value: v,
      inc: () => this.up(ch => ch.gold[label] += 1),
      dec: () => this.up(ch => ch.gold[label] = Math.max(0, ch.gold[label] - 1))
    }));
    vals.invVal = c.inventory;
    vals.setInv = e => this.up(ch => ch.inventory = e.target.value);
    vals.notesVal = c.notes;
    vals.setNotes = e => this.up(ch => ch.notes = e.target.value);
    vals.devNotesVal = c.devNotes || '';
    vals.setDevNotes = e => this.up(ch => ch.devNotes = e.target.value);

    // ---- weapons & armor (Gear tab + Play tab summary) ----
    vals.primaryWeapons = this.buildWeaponList('weaponsPrimary');
    vals.secondaryWeapons = this.buildWeaponList('weaponsSecondary');
    vals.addPrimaryWeapon = () => this.up(ch => ch.weaponsPrimary.push({ name: '', range: 'Melee', damage: '', equipped: ch.weaponsPrimary.length === 0, features: [] }));
    vals.addSecondaryWeapon = () => this.up(ch => ch.weaponsSecondary.push({ name: '', range: 'Melee', damage: '', equipped: false, features: [] }));
    vals.armorName = { val: c.equippedArmor.name, on: e => this.up(ch => ch.equippedArmor.name = e.target.value) };
    vals.armorScoreVal = { val: c.equippedArmor.score, on: e => this.up(ch => { const v = parseInt(e.target.value, 10) || 0; ch.equippedArmor.score = v; ch.armorScore = v; }) };
    const equippedWeapons = (c.weaponsPrimary || []).concat(c.weaponsSecondary || []).filter(w => w.equipped && w.name);
    vals.hasEquippedWeapons = equippedWeapons.length > 0;
    vals.noEquippedWeapons = equippedWeapons.length === 0;
    vals.playEquippedWeapons = equippedWeapons.map(w => ({
      name: w.name, range: w.range, damage: w.damage,
      hasFeatures: !!(w.features && w.features.length),
      featuresTxt: (w.features || []).map(f => f.name + (f.desc ? ': ' + f.desc : '')).join(' · ')
    }));
    vals.playArmorSummary = (c.equippedArmor.name || 'No armor') + ' · score ' + c.equippedArmor.score;

    // ---- short rest moves (Play tab) ----
    vals.shortRestMoves = c.shortRest.moves.map((m, i) => ({
      name: m.name, desc: m.desc,
      bg: m.taken ? theme.highlightBg : theme.panel,
      bc: m.taken ? accent : theme.border,
      ck: m.taken ? accent : 'transparent',
      mark: m.taken ? '✓' : '',
      toggle: () => this.up(ch => { ch.shortRest.moves[i].taken = !ch.shortRest.moves[i].taken; })
    }));
    vals.shortRest = () => this.up(ch => {
      ch.shortRest.moves.forEach(m => m.taken = false);
    });

    // ---- companion tab ----
    vals.noComp = c.companions.length === 0;
    vals.hasComp = c.companions.length > 0;
    vals.companionChips = c.companions.map((comp, i) => ({
      name: comp.name || 'Companion ' + (i + 1),
      bg: i === c.activeCompanion ? accent : theme.panel,
      fg: i === c.activeCompanion ? '#fff' : theme.text,
      bc: i === c.activeCompanion ? accent : theme.border2,
      select: () => this.up(ch => ch.activeCompanion = i)
    }));
    vals.addComp = () => this.up(ch => {
      ch.companions.push(this.defaultCompanion());
      ch.activeCompanion = ch.companions.length - 1;
    });
    vals.creatureImportOpen = !!s.creatureImportOpen;
    vals.toggleCreatureImport = () => this.setState({ creatureImportOpen: !s.creatureImportOpen });
    vals.hasCreatures = (s.creatures || []).length > 0;
    vals.noCreatures = (s.creatures || []).length === 0;
    vals.creaturePickList = (s.creatures || []).map(cr => ({
      name: cr.name,
      pick: () => {
        this.up(ch => {
          ch.companions.push(this.creatureToCompanion(cr));
          ch.activeCompanion = ch.companions.length - 1;
        });
        this.setState({ creatureImportOpen: false });
      }
    }));
    vals.removeComp = () => this.up(ch => {
      ch.companions.splice(ch.activeCompanion, 1);
      ch.activeCompanion = Math.max(0, ch.activeCompanion - 1);
    });
    const activeComp = c.companions[c.activeCompanion];
    if (activeComp) {
      this.normalizeCompanion(activeComp);
      const cp = 'companions.' + c.activeCompanion + '.';
      vals.compPortraitId = 'portrait-' + c.id + '-' + activeComp.portraitKey;
      vals.comp = {
        name: this.bind(cp + 'name'),
        difficulty: this.bind(cp + 'difficulty', true),
        movement: this.bind(cp + 'movement'),
        hpLabel: this.bind(cp + 'hp.label'),
        hpMax: this.bind(cp + 'hp.max', true),
        stressMax: this.bind(cp + 'stress.max', true),
        notes: this.bind(cp + 'notes'),
        backstory: this.bind(cp + 'backstory')
      };
      vals.compLevel = activeComp.level;
      vals.compLevelUpHint = (activeComp.level % 2 === 0) ? ', +1 Stress' : '';
      vals.levelUpComp = () => this.up(ch => {
        const comp2 = ch.companions[ch.activeCompanion];
        comp2.level = (comp2.level || 1) + 1;
        comp2.difficulty += 1;
        comp2.hp.max += 1;
        if (comp2.level % 2 === 0) comp2.stress.max += 1;
      });
      vals.compHpMarked = activeComp.hp.marked;
      vals.compHpPips = this.mkPipsCountdown(activeComp.hp.max, activeComp.hp.marked, '#A33B3B', v => this.up(ch => ch.companions[ch.activeCompanion].hp.marked = v));
      vals.compStTxt = activeComp.stress.marked + ' / ' + activeComp.stress.max;
      vals.compStMarked = activeComp.stress.marked;
      vals.compStPips = this.mkPipsCountdown(activeComp.stress.max, activeComp.stress.marked, '#5B4A8A', v => this.up(ch => ch.companions[ch.activeCompanion].stress.marked = v));
      const compIdx = c.activeCompanion;
      vals.compAttacks = activeComp.attacks.map((atk, i) => ({
        name: this.bind(cp + 'attacks.' + i + '.name'),
        range: this.bind(cp + 'attacks.' + i + '.range'),
        formula: this.bind(cp + 'attacks.' + i + '.formula'),
        effect: this.bind(cp + 'attacks.' + i + '.effect'),
        remove: () => this.up(ch => ch.companions[compIdx].attacks.splice(i, 1))
      }));
      vals.addCompAttack = () => this.up(ch => ch.companions[compIdx].attacks.push({ name: '', range: 'Melee', formula: '', effect: '' }));
      vals.compFeatures = activeComp.features.map((ft, i) => ({
        type: this.bind(cp + 'features.' + i + '.type'),
        name: this.bind(cp + 'features.' + i + '.name'),
        desc: this.bind(cp + 'features.' + i + '.desc'),
        remove: () => this.up(ch => ch.companions[compIdx].features.splice(i, 1))
      }));
      vals.addCompFeature = () => this.up(ch => ch.companions[compIdx].features.push({ type: 'Passive', name: '', desc: '' }));
    }

    // ---- wildshape tab (Druid) ----
    vals.wildshapeActiveBanner = !!c.wildshape.active;
    const activeForm = c.wildshape.forms.find(f => f.id === c.wildshape.active);
    vals.wildshapeActiveName = activeForm ? activeForm.name : '';
    vals.revertWildshape = () => this.up(ch => { ch.wildshape.active = null; });
    vals.wildshapeForms = c.wildshape.forms.map((f, i) => {
      const wp = 'wildshape.forms.' + i + '.';
      const isActive = c.wildshape.active === f.id;
      return {
        isActive,
        bc: isActive ? accent : theme.border,
        btnLabel: isActive ? 'Shifted' : 'Transform',
        btnBg: isActive ? theme.border2 : accent,
        btnOpacity: isActive ? 0.6 : 1,
        name: this.bind(wp + 'name'),
        tier: this.bind(wp + 'tier', true),
        evasion: this.bind(wp + 'evasion', true),
        stressCost: this.bind(wp + 'stressCost', true),
        attack: this.bind(wp + 'attack'),
        damage: this.bind(wp + 'damage'),
        feature: this.bind(wp + 'feature'),
        transform: () => this.up(ch => {
          const form = ch.wildshape.forms[i];
          ch.wildshape.active = form.id;
          if (form.stressCost) ch.stress.marked = Math.min(ch.stress.max, ch.stress.marked + form.stressCost);
        }),
        remove: () => this.up(ch => {
          if (ch.wildshape.active === f.id) ch.wildshape.active = null;
          ch.wildshape.forms.splice(i, 1);
        })
      };
    });
    vals.addWildshapeForm = () => this.up(ch => {
      ch.wildshape.forms.push({ id: 'w' + Date.now(), name: 'New Beastform', tier: 1, evasion: 10, attack: '', damage: '', feature: '', stressCost: 0 });
    });

    // ---- transformation tab (Void — Vampire/Werewolf/Reanimated/Shapeshifter/Ghost/Demigod) ----
    vals.transformationEnabled = !!c.transformation.enabled;
    vals.toggleTransformation = () => this.up(ch => { ch.transformation.enabled = !ch.transformation.enabled; });
    vals.transformationActiveBanner = !!c.transformation.active;
    const activeTransform = c.transformation.forms.find(f => f.id === c.transformation.active);
    vals.transformationActiveName = activeTransform ? activeTransform.name : '';
    vals.revertTransformation = () => this.up(ch => { ch.transformation.active = null; });
    vals.transformationForms = c.transformation.forms.map((f, i) => {
      const tp = 'transformation.forms.' + i + '.';
      const isActive = c.transformation.active === f.id;
      return {
        isActive,
        bc: isActive ? accent : theme.border,
        btnLabel: isActive ? 'Transformed' : 'Transform',
        btnBg: isActive ? theme.border2 : accent,
        btnOpacity: isActive ? 0.6 : 1,
        pendingBadge: f.voidPending ? 'Void — pending official text' : '',
        name: this.bind(tp + 'name'),
        tier: this.bind(tp + 'tier', true),
        evasion: this.bind(tp + 'evasion', true),
        stressCost: this.bind(tp + 'stressCost', true),
        attack: this.bind(tp + 'attack'),
        damage: this.bind(tp + 'damage'),
        feature: this.bind(tp + 'feature'),
        transform: () => this.up(ch => {
          const form = ch.transformation.forms[i];
          ch.transformation.active = form.id;
          if (form.stressCost) ch.stress.marked = Math.min(ch.stress.max, ch.stress.marked + form.stressCost);
        }),
        remove: () => this.up(ch => {
          if (ch.transformation.active === f.id) ch.transformation.active = null;
          ch.transformation.forms.splice(i, 1);
        })
      };
    });
    vals.addTransformationForm = () => this.up(ch => {
      ch.transformation.forms.push({ id: 't' + Date.now(), name: 'New Transformation', tier: 1, evasion: 10, attack: '', damage: '', feature: '', stressCost: 0 });
    });

    // ---- downtime tab ----
    vals.downtimeMoves = c.downtime.moves.map((m, i) => ({
      name: m.name, desc: m.desc,
      bg: m.taken ? theme.highlightBg : theme.panel,
      bc: m.taken ? accent : theme.border,
      ck: m.taken ? accent : 'transparent',
      mark: m.taken ? '✓' : '',
      toggle: () => this.up(ch => {
        const mv = ch.downtime.moves[i];
        mv.taken = !mv.taken;
        if (mv.key === 'armor' && mv.taken) ch.armor.marked = 0;
      })
    }));
    vals.projectName = c.downtime.project.name;
    vals.setProjectName = e => this.up(ch => ch.downtime.project.name = e.target.value);
    vals.projectTxt = c.downtime.project.progress + ' / ' + c.downtime.project.max + ' segments';
    vals.projectPips = this.mkPips(c.downtime.project.max, c.downtime.project.progress, accent, v => this.up(ch => ch.downtime.project.progress = v));
    vals.projectComplete = c.downtime.project.progress >= c.downtime.project.max;
    vals.clearDowntime = () => this.up(ch => { ch.downtime.moves.forEach(m => m.taken = false); });

    // ---- level tab ----
    vals.tierTxt = this.tier(c.level);
    const advDefs = [
      { key: 'traits', label: '+1 to two traits', desc: 'Adjust the traits on the Edit tab.', apply: null },
      { key: 'hp', label: '+1 Hit Point slot', desc: 'Adds a permanent HP slot.', apply: ch => ch.hp.max += 1 },
      { key: 'stress', label: '+1 Stress slot', desc: 'Adds a permanent Stress slot.', apply: ch => ch.stress.max += 1 },
      { key: 'exp', label: '+1 to an Experience', desc: 'Bump a bonus on the Edit tab.', apply: null },
      { key: 'card', label: 'New domain card', desc: 'Add it on the Cards tab.', apply: null },
      { key: 'evasion', label: '+1 Evasion', desc: 'Adds to your Evasion score.', apply: ch => ch.evasion += 1 },
      { key: 'prof', label: '+1 Proficiency', desc: 'Adds to your Proficiency.', apply: ch => ch.proficiency += 1 },
      { key: 'subclass', label: 'Subclass upgrade / multiclass', desc: 'Logged for reference.', apply: null }
    ];
    vals.advList = advDefs.map(d => ({
      label: d.label, desc: d.desc,
      taken: c.adv[d.key] || 0,
      take: () => this.up(ch => {
        ch.adv[d.key] = (ch.adv[d.key] || 0) + 1;
        if (d.apply) d.apply(ch);
        ch.levelLog.unshift({ text: 'Level ' + ch.level + ': ' + d.label + '.' });
      })
    }));
    vals.levelLog = c.levelLog.map(l => ({ text: l.text }));

    // ---- level-up wizard ----
    const wiz = s.levelWiz;
    vals.levelWizOpen = !!wiz;
    vals.levelUp = () => this.setState({ levelWiz: { step: 0, pickA: null, pickB: null } });
    vals.wizCancel = () => this.setState({ levelWiz: null });
    if (wiz) {
      vals.wizStep = wiz.step;
      vals.wizStep0 = wiz.step === 0;
      vals.wizStep1 = wiz.step === 1;
      vals.wizStep2 = wiz.step === 2;
      vals.wizStep3 = wiz.step === 3;
      vals.wizCurLevel = c.level;
      vals.wizNewLevel = c.level + 1;
      vals.wizNewTier = this.tier(c.level + 1);
      vals.wizNewMajor = c.thresholds.major + 1;
      vals.wizNewSevere = c.thresholds.severe + 1;
      vals.wizStart = () => this.setState({ levelWiz: { ...wiz, step: 1 } });
      const isTierBreak = [2, 5, 8].includes(c.level + 1);
      const mkOpt = (key) => advDefs.map((d, i) => {
        const sel = (key === 'pickA' ? wiz.pickA === i : wiz.pickB === i);
        return {
          label: d.label, desc: d.desc,
          selBg: sel ? theme.highlightBg : theme.panel,
          selBc: sel ? accent : theme.border,
          pick: () => {
            if (d.key === 'prof' && isTierBreak) {
              this.setState({ levelWiz: { ...wiz, profConfirmPending: key } });
            } else {
              this.setState({ levelWiz: { ...wiz, [key]: i } });
            }
          }
        };
      });
      vals.wizOptionsA = mkOpt('pickA');
      vals.wizOptionsB = mkOpt('pickB');
      vals.profDoubleConfirmOpen = !!wiz.profConfirmPending;
      vals.profDoubleConfirmYes = () => {
        const key = wiz.profConfirmPending;
        const profIdx = advDefs.findIndex(d => d.key === 'prof');
        this.setState({ levelWiz: { ...wiz, [key]: profIdx, profConfirmPending: null } });
      };
      vals.profDoubleConfirmNo = () => this.setState({ levelWiz: { ...wiz, profConfirmPending: null } });
      vals.wizNext1Disabled = wiz.pickA === null;
      vals.wizNext1Opacity = wiz.pickA === null ? '0.5' : '1';
      vals.wizNext2Disabled = wiz.pickB === null;
      vals.wizNext2Opacity = wiz.pickB === null ? '0.5' : '1';
      vals.wizBackTo0 = () => this.setState({ levelWiz: { ...wiz, step: 0 } });
      vals.wizBackTo1 = () => this.setState({ levelWiz: { ...wiz, step: 1 } });
      vals.wizToStep2 = () => this.setState({ levelWiz: { ...wiz, step: 2 } });
      vals.wizToStep3 = () => this.setState({ levelWiz: { ...wiz, step: 3 } });
      vals.wizPickALabel = wiz.pickA !== null ? advDefs[wiz.pickA].label : '';
      vals.wizPickBLabel = wiz.pickB !== null ? advDefs[wiz.pickB].label : '';
      vals.wizConfirm = () => {
        const pickA = wiz.pickA, pickB = wiz.pickB;
        this.up(ch => {
          ch.level += 1;
          ch.thresholds.major += 1;
          ch.thresholds.severe += 1;
          ch.levelLog.unshift({ text: 'Reached level ' + ch.level + ' — thresholds increased by 1.' });
          if ([2, 5, 8].includes(ch.level)) {
            ch.proficiency += 1;
            ch.levelLog.unshift({ text: 'Level ' + ch.level + ': Proficiency automatically increased to ' + ch.proficiency + ' (new tier).' });
          }
          [pickA, pickB].forEach(i => {
            if (i === null) return;
            const d = advDefs[i];
            ch.adv[d.key] = (ch.adv[d.key] || 0) + 1;
            if (d.apply) d.apply(ch);
            ch.levelLog.unshift({ text: 'Level ' + ch.level + ': ' + d.label + '.' });
          });
        });
        this.setState({ levelWiz: null });
      };
    }

    // ---- edit tab ----
    vals.ed = {
      name: this.bind('name'), pronouns: this.bind('pronouns'), backstory: this.bind('backstory'),
      klass: this.bind('klass'), subclass: this.bind('subclass'),
      klass2: this.bind('multiclass.klass'), subclass2: this.bind('multiclass.subclass'),
      ancestry: this.bind('ancestry'), community: this.bind('community'),
      level: this.bind('level', true), evasion: this.bind('evasion', true),
      armorScore: this.bind('armorScore', true), proficiency: this.bind('proficiency', true),
      thrMajor: this.bind('thresholds.major', true), thrSevere: this.bind('thresholds.severe', true),
      hpMax: this.bind('hp.max', true), stressMax: this.bind('stress.max', true),
      armorMax: this.bind('armor.max', true)
    };
    vals.traitEdits = Object.keys(c.traits).map(name => {
      const b = this.bind('traits.' + name, true);
      return { name, val: b.val, on: b.on };
    });
    const normExpName = n => (n || '').trim().toLowerCase();
    vals.expEdits = c.experiences.map((x, i) => {
      const dupWarning = s.expDupIndex === i;
      return {
        name: x.name, bonus: x.bonus,
        dupWarning,
        borderColor: dupWarning ? '#A33B3B' : 'var(--border2)',
        onName: e => {
          const raw = e.target.value;
          const norm = normExpName(raw);
          const isDup = norm !== '' && c.experiences.some((other, j) => j !== i && normExpName(other.name) === norm);
          if (isDup) { this.setState({ expDupIndex: i }); return; }
          if (s.expDupIndex === i) this.setState({ expDupIndex: null });
          this.up(ch => ch.experiences[i].name = raw);
        },
        onBonus: e => this.up(ch => ch.experiences[i].bonus = parseInt(e.target.value, 10) || 0),
        remove: () => {
          if (s.expDupIndex === i) this.setState({ expDupIndex: null });
          this.up(ch => ch.experiences.splice(i, 1));
        }
      };
    });
    vals.addExp = () => this.up(ch => ch.experiences.push({ name: '', bonus: 2 }));
    vals.confirmDeleteOpen = !!s.confirmDelete;
    vals.askDeleteChar = () => this.setState({ confirmDelete: true });
    vals.cancelDeleteChar = () => this.setState({ confirmDelete: false });
    vals.deleteChar = () => {
      const activeId = s.activeId;
      this.upAll(chars => {
        const i = chars.findIndex(x => x.id === activeId);
        if (i >= 0) chars.splice(i, 1);
      });
      this.setState({ screen: 'roster', activeId: null, confirmDelete: false });
    };

    return vals;
  }

  componentDidMount() {
    let games = loadJSON('dh-tracker-games');
    if (!games || !games.length) games = [{ id: 'default', name: 'My Campaign' }];
    let activeGame = loadRaw('dh-tracker-active-game') || 'default';
    if (!games.some(g => g.id === activeGame)) activeGame = 'default';
    const data = this.loadGameData(activeGame);
    const theme = this.loadThemeFor(activeGame);
    let skipAuth = loadRaw('dh-tracker-skip-auth') === '1';
    let pendingJoinId = null;
    try {
      const params = new URLSearchParams(location.search);
      pendingJoinId = params.get('join');
      if (pendingJoinId) {
        params.delete('join');
        const qs = params.toString();
        history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
      }
    } catch (e) {}
    this.setState({
      games, activeGame, dark: theme.dark, gameAccent: theme.gameAccent, bannerMode: theme.bannerMode,
      chars: data.chars, party: data.party, recaps: data.recaps,
      customDomains: data.customDomains, customAncestries: data.customAncestries, customClasses: data.customClasses,
      creatures: data.creatures, importedDomainCards: data.importedDomainCards, sessionElapsed: data.sessionElapsed,
      skipAuth, pendingJoinId
    });
    this._timerInterval = setInterval(() => {
      if (this.state.sessionRunning) {
        const next = this.state.sessionElapsed + 1;
        saveRaw(this.gk('dh-tracker-session-elapsed'), String(next));
        this.setState({ sessionElapsed: next });
      }
    }, 1000);
    if (supabaseClient) {
      supabaseClient.auth.getSession().then(({ data }) => {
        this.applySession(data && data.session ? data.session : null);
      });
      supabaseClient.auth.onAuthStateChange((event, session) => {
        this.applySession(session);
      });
    } else {
      this.setState({ authChecked: true });
    }
  }

  componentWillUnmount() {
    if (this._timerInterval) clearInterval(this._timerInterval);
  }
}


Object.assign(Component.prototype,
  stateMixin, undoMixin, migrationsMixin, storageMixin, supabaseMixin,
  rosterMixin, sheetMixin, partyMixin, recapsMixin, compendiumMixin, creaturesMixin,
  characterWizardMixin
);

// Checks version.json (same folder as this file) with the browser cache
// bypassed entirely, so an iPad/iPhone home-screen icon — which is prone to
// holding onto a stale copy far longer than a normal browser tab would —
// still notices a new deploy. Never touches localStorage/character data;
// this only decides whether to show the "update available" banner.
function checkForUpdate() {
  var inst = window.__dcEngine && window.__dcEngine.instance;
  if (!inst) return;
  fetch('version.json?_=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (data && data.version && data.version !== APP_VERSION) {
        inst.setState({ updateAvailable: true, updateVersion: data.version });
      }
    })
    .catch(function () { /* offline or version.json missing — fail silently */ });
}

window.addEventListener('DOMContentLoaded', function () {
  var root = document.getElementById('app-root');
  var engine = new DcEngine(appTemplate, Component, { accent: '#2E6E5E', pipShape: 'circle' }, root);
  window.__dcEngine = engine;
  engine.render();
  if (typeof engine.instance.componentDidMount === 'function') {
    engine.instance.componentDidMount();
  }
  checkForUpdate();
});

// Re-check whenever the app comes back to the foreground — covers both a
// backgrounded browser tab and a home-screen web-clip being reopened, which
// is the case that doesn't naturally trigger a fresh network request.
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible') checkForUpdate();
});
window.addEventListener('pageshow', function () { checkForUpdate(); });
