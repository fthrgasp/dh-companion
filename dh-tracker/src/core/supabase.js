import { saveRaw } from './storage.js';

export const SUPABASE_URL = 'https://rrflddwsjxeajyldmwrh.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_z87KS6Di54wmXEUxl-MunA_64uF5K5P';

// Publishable (anon) key — safe to expose client-side; row-level security on
// the `characters` table is the actual access boundary, not this key.
export const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export const supabaseMixin = {
  // Called on initial session check and every auth state change (sign-in,
  // sign-out, token refresh). On a fresh sign-in, kicks off a remote fetch of
  // the active game's characters — and, if that comes back empty, offers to
  // import whatever is currently sitting in localStorage instead of silently
  // discarding it.
  applySession(session) {
    const hadSession = !!this.state.session;
    this.setState({ session, authChecked: true, authMagicLinkSent: false, authError: '' });
    if (session && !hadSession) {
      this.refreshCharsFromRemote(this.state.activeGame, { checkImport: true });
      if (this.state.pendingJoinId) {
        this.joinGame(this.state.pendingJoinId);
      } else {
        const cloudId = this.activeCloudId();
        if (cloudId) this.refreshPartyFromRemote(cloudId);
      }
    }
  },

  refreshCharsFromRemote(gameId, opts) {
    opts = opts || {};
    this.loadCharsRemote(gameId).then(remoteChars => {
      if (opts.checkImport && remoteChars.length === 0) {
        const localChars = this.loadGameData(gameId).chars || [];
        if (localChars.length) {
          this.setState({ localImportPrompt: { gameId, count: localChars.length, chars: localChars } });
          return;
        }
      }
      this.setState({ chars: remoteChars });
    });
  },

  confirmLocalImport() {
    const prompt = this.state.localImportPrompt;
    if (!prompt) return;
    (prompt.chars || []).forEach(c => this.saveCharRemote(c, prompt.gameId));
    this.setState({ chars: prompt.chars, localImportPrompt: null });
  },

  dismissLocalImport() {
    this.setState({ chars: [], localImportPrompt: null });
  },

  setAuthEmail(email) { this.setState({ authEmail: email, authError: '' }); },

  sendMagicLink() {
    if (!supabaseClient) { this.setState({ authError: 'Supabase failed to load — check your connection.' }); return; }
    const email = (this.state.authEmail || '').trim();
    if (!email) return;
    supabaseClient.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } }).then(({ error }) => {
      if (error) this.setState({ authError: error.message });
      else this.setState({ authMagicLinkSent: true, authError: '' });
    });
  },

  signOut() {
    if (supabaseClient) supabaseClient.auth.signOut();
    this.setState({ session: null });
  },

  // --- Shared campaigns / shared inventory (Supabase). A local game entry in
  // games[] gains an optional cloudId once it's been shared; games without one
  // stay exactly as local-only as they've always been.
  cloudIdFor(gameId) {
    const g = (this.state.games || []).find(x => x.id === gameId);
    return g && g.cloudId;
  },

  activeCloudId() { return this.cloudIdFor(this.state.activeGame); },

  loadPartyRemote(cloudId) {
    if (!supabaseClient) return Promise.resolve([]);
    return supabaseClient.from('party_items').select('id,data').eq('game_id', cloudId)
      .then(({ data, error }) => {
        if (error) { console.error('loadPartyRemote', error); return []; }
        return (data || []).map(row => Object.assign({}, row.data, { id: row.id }));
      })
      .catch(e => { console.error('loadPartyRemote', e); return []; });
  },

  savePartyItemRemote(item, cloudId) {
    if (!supabaseClient) return Promise.resolve();
    return supabaseClient.from('party_items').upsert({ id: item.id, game_id: cloudId, data: item })
      .then(({ error }) => { if (error) console.error('savePartyItemRemote', error); })
      .catch(e => console.error('savePartyItemRemote', e));
  },

  deletePartyItemRemote(id) {
    if (!supabaseClient) return Promise.resolve();
    return supabaseClient.from('party_items').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('deletePartyItemRemote', error); })
      .catch(e => console.error('deletePartyItemRemote', e));
  },

  syncPartyRemote(party, prevParty) {
    const cloudId = this.activeCloudId();
    if (!this.state.session || !cloudId) return;
    const nextIds = new Set((party || []).map(p => p.id));
    (party || []).forEach(p => this.savePartyItemRemote(p, cloudId));
    (prevParty || []).forEach(p => { if (!nextIds.has(p.id)) this.deletePartyItemRemote(p.id); });
  },

  refreshPartyFromRemote(cloudId) {
    if (!cloudId) return;
    this.loadPartyRemote(cloudId).then(party => this.setState({ party }));
  },

  // Creates the server-side campaign row + membership for the active local
  // game the first time it's shared (idempotent — a game that's already
  // shared just resolves its existing cloudId). The sharer's current local
  // party list becomes the shared list's starting state.
  ensureGameShared() {
    const existing = this.activeCloudId();
    if (existing) return Promise.resolve(existing);
    if (!supabaseClient || !this.state.session) return Promise.resolve(null);
    const activeGame = this.state.activeGame;
    const localGame = (this.state.games || []).find(g => g.id === activeGame);
    const name = (localGame && localGame.name) || 'Shared Campaign';
    this.setState({ sharingCampaign: true });
    return supabaseClient.from('games').insert({ name }).select('id').single()
      .then(({ data, error }) => {
        if (error) throw error;
        const cloudId = data.id;
        return supabaseClient.from('game_members').insert({ game_id: cloudId })
          .then(({ error: memberErr }) => { if (memberErr) throw memberErr; return cloudId; });
      })
      .then(cloudId => {
        (this.state.party || []).forEach(item => this.savePartyItemRemote(item, cloudId));
        const games = this.state.games.map(g => g.id === activeGame ? Object.assign({}, g, { cloudId }) : g);
        this.saveGames(games);
        this.setState({ games, sharingCampaign: false });
        return cloudId;
      })
      .catch(e => {
        console.error('ensureGameShared', e);
        this.setState({ sharingCampaign: false, joinError: 'Could not share this campaign — try again.' });
        return null;
      });
  },

  shareCampaign() {
    this.ensureGameShared().then(cloudId => {
      if (!cloudId) return;
      const link = location.origin + location.pathname + '?join=' + cloudId;
      try { navigator.clipboard.writeText(link); } catch (e) {}
      this.setState({ shareLinkCopied: true });
      setTimeout(() => this.setState({ shareLinkCopied: false }), 2500);
    });
  },

  // Self-service join: possession of the link (i.e. this id) is the access
  // model the group chose, so no owner-approval step — just record membership
  // and drop the player into a new local game entry pointed at it.
  joinGame(cloudId) {
    if (!supabaseClient) return;
    const existing = (this.state.games || []).find(g => g.cloudId === cloudId);
    if (existing) {
      this.setState({ pendingJoinId: null });
      if (existing.id !== this.state.activeGame) this.switchGame(existing.id);
      else this.refreshPartyFromRemote(cloudId);
      return;
    }
    // ignoreDuplicates: re-clicking a link you're already a member of (or the
    // auth listener firing more than once on load) must be a no-op, not an
    // UPDATE — there's no update policy on this table since nothing here
    // ever needs to change once a membership row exists.
    supabaseClient.from('game_members').upsert({ game_id: cloudId }, { onConflict: 'game_id,user_id', ignoreDuplicates: true })
      .then(({ error }) => {
        if (error) throw error;
        return supabaseClient.from('games').select('name').eq('id', cloudId).single();
      })
      .then(({ data, error }) => {
        if (error) throw error;
        const name = (data && data.name) || 'Shared Campaign';
        const id = 'g' + Date.now();
        const games = this.state.games.concat([{ id, name, cloudId }]);
        this.saveGames(games);
        this.setState({ games, pendingJoinId: null });
        this.switchGame(id);
      })
      .catch(e => {
        console.error('joinGame', e);
        this.setState({ pendingJoinId: null, joinError: 'That invite link is invalid or has expired.' });
      });
  },

  setSkipAuth(val) {
    saveRaw('dh-tracker-skip-auth', val ? '1' : '0');
    this.setState({ skipAuth: val, pendingJoinId: null });
  },

  // --- Remote (Supabase) character persistence — only used while signed in.
  // localStorage stays the source of truth when signed out, so the app keeps
  // working offline/unauthenticated exactly as it always has.
  loadCharsRemote(gameId) {
    if (!supabaseClient) return Promise.resolve([]);
    return supabaseClient.from('characters').select('id,data').eq('game_id', gameId)
      .then(({ data, error }) => {
        if (error) { console.error('loadCharsRemote', error); return []; }
        return (data || []).map(row => Object.assign({}, row.data, { id: row.id }));
      })
      .catch(e => { console.error('loadCharsRemote', e); return []; });
  },

  saveCharRemote(char, gameId) {
    if (!supabaseClient) return Promise.resolve();
    return supabaseClient.from('characters').upsert({ id: char.id, game_id: gameId, data: char })
      .then(({ error }) => { if (error) console.error('saveCharRemote', error); })
      .catch(e => console.error('saveCharRemote', e));
  },

  deleteCharRemote(id) {
    if (!supabaseClient) return Promise.resolve();
    return supabaseClient.from('characters').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('deleteCharRemote', error); })
      .catch(e => console.error('deleteCharRemote', e));
  },

  // Mirrors a just-saved local chars[] array to Supabase, best-effort. Upserts
  // everything currently present (cheap at this scale — mirrors the existing
  // "write the whole array" behavior of save()) and deletes any id that
  // dropped out of the array since the previous state.
  syncCharsRemote(chars, prevChars) {
    if (!this.state.session) return;
    const gameId = this.state.activeGame;
    const nextIds = new Set((chars || []).map(c => c.id));
    (chars || []).forEach(c => this.saveCharRemote(c, gameId));
    (prevChars || []).forEach(c => { if (!nextIds.has(c.id)) this.deleteCharRemote(c.id); });
  }
};

export const authGateTemplate = `
<!-- ============ SIGN IN ============ -->
<sc-if value="{{showAuthGate}}" hint-placeholder-val="{{ false }}">
<div data-screen-label="Sign In" style="max-width:400px;margin:0 auto;padding:80px 32px">
  <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(38,34,27,0.06)">
    <h1 style="font-family:'Spectral',serif;font-weight:600;font-size:24px;margin:0 0 6px">Sign in</h1>
    <p style="font-size:13px;color:var(--muted);margin:0 0 20px">Sign in to sync your characters across devices. We'll email you a magic link — no password needed.</p>
    <sc-if value="{{authMagicLinkSent}}" hint-placeholder-val="{{ false }}">
      <p style="font-size:13.5px;color:var(--text)">Check your email for a sign-in link.</p>
    </sc-if>
    <sc-if value="{{authFormOpen}}" hint-placeholder-val="{{ true }}">
      <input type="email" value="{{authEmail}}" sc-camel-on-change="{{setAuthEmail}}" placeholder="you@example.com" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:10px 12px;font-size:14px;background:var(--input-bg);margin-bottom:10px">
      <sc-if value="{{authErrorOpen}}" hint-placeholder-val="{{ false }}">
        <p style="font-size:12.5px;color:#A33B3B;margin:0 0 10px">{{authErrorText}}</p>
      </sc-if>
      <button sc-camel-on-click="{{sendMagicLink}}" style="width:100%;border:none;background:var(--accent,#8C5A2B);color:#fff;border-radius:8px;padding:10px;font-size:14px;font-weight:600;cursor:pointer">Send magic link</button>
    </sc-if>
    <div style="height:1px;background:var(--border3);margin:20px 0"></div>
    <button sc-camel-on-click="{{skipAuthClick}}" style="width:100%;border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:9px;font-size:13px;cursor:pointer">Continue without an account (this device only)</button>
  </div>
</div>
</sc-if>

<!-- ============ LOCAL CHARACTER IMPORT PROMPT ============ -->
<sc-if value="{{localImportOpen}}" hint-placeholder-val="{{ false }}">
  <div style="position:fixed;inset:0;z-index:200;background:rgba(38,34,27,0.45);display:flex;align-items:center;justify-content:center;padding:24px">
    <div style="max-width:420px;background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:26px;box-shadow:0 8px 24px rgba(38,34,27,0.25)">
      <h2 style="font-family:'Spectral',serif;font-weight:600;font-size:19px;margin:0 0 10px">Import local characters?</h2>
      <p style="font-size:13.5px;color:var(--muted);margin:0 0 20px">This browser has {{localImportCount}} character(s) saved locally that aren't in your account yet. Import them now, or start fresh with an empty roster.</p>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button sc-camel-on-click="{{dismissLocalImport}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:9px 14px;font-size:13px;cursor:pointer">Start fresh</button>
        <button sc-camel-on-click="{{confirmLocalImport}}" style="border:none;background:var(--accent,#8C5A2B);color:#fff;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:600;cursor:pointer">Import</button>
      </div>
    </div>
  </div>
</sc-if>`;

export const joinErrorToastTemplate = `
<sc-if value="{{joinErrorOpen}}" hint-placeholder-val="{{ false }}">
  <div style="position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:#A33B3B;color:#fff;border-radius:10px;padding:12px 14px 12px 18px;display:flex;align-items:center;gap:14px;box-shadow:0 12px 30px rgba(0,0,0,0.25);z-index:200;font-size:13.5px;max-width:90vw">
    <span>{{joinErrorText}}</span>
    <button sc-camel-on-click="{{dismissJoinError}}" style="border:none;background:none;color:#fff;opacity:0.8;cursor:pointer;font-size:14px;padding:2px">✕</button>
  </div>
</sc-if>`;
