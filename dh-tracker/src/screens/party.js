import { saveJSON } from '../core/storage.js';

export const partyMixin = {
  saveParty(party) { saveJSON(this.gk('dh-tracker-party'), party); },

  upParty(fn) {
    this.setState(s => {
      const party = JSON.parse(JSON.stringify(s.party || []));
      fn(party);
      this.saveParty(party);
      this.syncPartyRemote(party, s.party);
      return { party };
    });
  },

  defaultParty() {
    return [
      { id: 'p1', name: 'Rope, 50 ft', qty: 1, note: 'Shared climbing gear', holder: '' },
      { id: 'p2', name: 'Healing potions', qty: 3, note: 'Clear 1d4 HP', holder: '' }
    ];
  }
};

export const partyTemplate = `
<!-- ============ PARTY INVENTORY ============ -->
<sc-if value="{{isParty}}" hint-placeholder-val="{{ false }}">
<div data-screen-label="Shared Inventory" style="max-width:820px;margin:0 auto;padding:48px 32px">
  <div style="display:flex;align-items:center;gap:14px;border-bottom:2px solid var(--text);padding-bottom:14px;margin-bottom:20px">
    <button sc-camel-on-click="{{goRoster}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer" style-hover="border-color:var(--text)">← Roster</button>
    <h1 style="font-family:'Spectral',serif;font-weight:600;font-size:30px;margin:0;letter-spacing:-0.01em;flex:1">Shared Inventory</h1>
  </div>
  <p style="font-size:13px;color:var(--muted);margin:0 0 18px">Party-wide gear, potions, and loot the whole table can see. Tap a holder chip to cycle who's carrying it.</p>
  <div style="display:flex;flex-direction:column;gap:10px">
    <sc-for list="{{partyList}}" as="pi" hint-placeholder-count="2">
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <div style="flex:1;min-width:160px">
          <div style="font-size:15px;font-weight:600">{{pi.name}}</div>
          <div style="font-size:12.5px;color:var(--muted);margin-top:2px">{{pi.note}}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <button sc-camel-on-click="{{pi.dec}}" style="width:28px;height:28px;border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:7px;cursor:pointer;font-size:15px">−</button>
          <span style="width:26px;text-align:center;font-family:'Spectral',serif;font-size:19px;font-weight:600">{{pi.qty}}</span>
          <button sc-camel-on-click="{{pi.inc}}" style="width:28px;height:28px;border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:7px;cursor:pointer;font-size:15px">+</button>
        </div>
        <button sc-camel-on-click="{{pi.cycleHolder}}" style="border:1px solid var(--border2);background:var(--highlight-bg);color:var(--text);border-radius:999px;padding:6px 14px;font-size:12.5px;cursor:pointer" style-hover="border-color:var(--accent,#8C5A2B)">{{pi.holder}}</button>
        <button sc-camel-on-click="{{pi.remove}}" style="border:none;background:none;color:var(--muted);cursor:pointer;font-size:15px;padding:4px" style-hover="color:#A33B3B">✕</button>
      </div>
    </sc-for>
  </div>
  <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:16px 18px;margin-top:14px">
    <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Add shared item</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <input value="{{newPartyName}}" sc-camel-on-change="{{setNewPartyName}}" placeholder="Item name" style="flex:2;min-width:160px;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13px;background:var(--input-bg)">
      <input type="number" value="{{newPartyQty}}" sc-camel-on-change="{{setNewPartyQty}}" style="width:70px;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13px;background:var(--input-bg)">
      <input value="{{newPartyNote}}" sc-camel-on-change="{{setNewPartyNote}}" placeholder="Note (optional)" style="flex:2;min-width:160px;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13px;background:var(--input-bg)">
      <button sc-camel-on-click="{{addPartyItem}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer" style-hover="border-color:var(--text)">Add</button>
    </div>
  </div>
</div>
</sc-if>`;
