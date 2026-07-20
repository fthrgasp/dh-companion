// The only file in the app that touches localStorage directly. Everything
// else imports these five generic primitives (or the named save*/load*
// wrapper methods below, which are the same wrappers that already existed
// before this split — just moved here) rather than calling localStorage
// itself.

export function loadJSON(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
}
export function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}
export function loadRaw(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
export function saveRaw(key, value) {
  try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
}
export function removeRaw(key) {
  try { localStorage.removeItem(key); } catch (e) {}
}

// --- Named save*/load* wrappers, unchanged in behavior from the original
// single-file version — just relocated here and using the primitives above
// instead of calling localStorage inline.
export const storageMixin = {
  saveGames(games) { saveJSON('dh-tracker-games', games); },
  saveCreatures(list) { saveJSON(this.gk('dh-tracker-creatures'), list); },
  saveClasses(list) { saveJSON(this.gk('dh-tracker-classes'), list); },
  saveAncestries(list) { saveJSON(this.gk('dh-tracker-ancestries'), list); },
  saveDomains(domains) { saveJSON(this.gk('dh-tracker-domains'), domains); },
  saveImportedCards(imported) { saveJSON(this.gk('dh-tracker-imported-cards'), imported); },
  saveParty(party) { saveJSON(this.gk('dh-tracker-party'), party); },
  saveRecaps(recaps) { saveJSON(this.gk('dh-tracker-recaps'), recaps); },
  save(chars) { saveJSON(this.gk('dh-tracker-v1'), chars); }
};
