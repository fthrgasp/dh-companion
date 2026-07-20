export const undoMixin = {
  showUndo(kind, label, data) {
    if (this.undoTimer) clearTimeout(this.undoTimer);
    this.setState({ undo: { kind, label, data } });
    this.undoTimer = setTimeout(() => this.setState({ undo: null }), 8000);
  },

  performUndo() {
    const u = this.state.undo;
    if (!u) return;
    if (this.undoTimer) clearTimeout(this.undoTimer);
    if (u.kind === 'char' && u.data.char) {
      this.upAll(chars => {
        const idx = Math.min(u.data.index, chars.length);
        chars.splice(idx, 0, u.data.char);
      });
    } else if (u.kind === 'comp' && u.data.comp) {
      this.upAll(chars => {
        const owner = chars.find(x => x.id === u.data.ownerId);
        if (owner) {
          if (!owner.companions) owner.companions = [];
          const idx = Math.min(u.data.index, owner.companions.length);
          owner.companions.splice(idx, 0, u.data.comp);
        }
      });
    }
    this.setState({ undo: null });
  }
};

export const undoToastTemplate = `
<sc-if value="{{undoOpen}}" hint-placeholder-val="{{ false }}">
  <div style="position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:var(--text);color:var(--bg);border-radius:10px;padding:12px 14px 12px 18px;display:flex;align-items:center;gap:14px;box-shadow:0 12px 30px rgba(0,0,0,0.25);z-index:200;font-size:13.5px">
    <span>{{undoLabel}}</span>
    <button sc-camel-on-click="{{undoClick}}" style="border:1px solid var(--bg);background:none;color:var(--bg);border-radius:7px;padding:6px 12px;font-size:13px;font-weight:600;cursor:pointer">Undo</button>
    <button sc-camel-on-click="{{undoDismiss}}" style="border:none;background:none;color:var(--bg);opacity:0.6;cursor:pointer;font-size:14px;padding:2px">✕</button>
  </div>
</sc-if>`;
