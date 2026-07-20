import { saveJSON } from '../core/storage.js';

export const recapsMixin = {
  saveRecaps(recaps) { saveJSON(this.gk('dh-tracker-recaps'), recaps); },

  upRecaps(fn) {
    this.setState(s => {
      const recaps = JSON.parse(JSON.stringify(s.recaps || []));
      fn(recaps);
      this.saveRecaps(recaps);
      return { recaps };
    });
  },

  defaultRecaps() {
    return [
      { id: 'sr1', date: 'Session 2', title: 'The claw marks by the river', text: 'The party followed strange tracks upstream and found a ruined shrine. Marlowe spotted something large watching from the tree line.' },
      { id: 'sr2', date: 'Session 1', title: 'Arrival in Hearthollow', text: 'The party met in a mountain garrison town, took on a job from the caravan master, and repaired Bram’s plate armor.' }
    ];
  }
};

export const recapsTemplate = `
<!-- ============ SESSION RECAPS ============ -->
<sc-if value="{{isRecaps}}" hint-placeholder-val="{{ false }}">
<div data-screen-label="Session Recaps" style="max-width:760px;margin:0 auto;padding:48px 32px">
  <div style="display:flex;align-items:center;gap:14px;border-bottom:2px solid var(--text);padding-bottom:14px;margin-bottom:20px">
    <button sc-camel-on-click="{{goRoster}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer" style-hover="border-color:var(--text)">← Roster</button>
    <h1 style="font-family:'Spectral',serif;font-weight:600;font-size:30px;margin:0;letter-spacing:-0.01em;flex:1">Session Recaps</h1>
  </div>
  <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:16px 18px;margin-bottom:20px">
    <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Log this session</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
      <input value="{{newRecapDate}}" sc-camel-on-change="{{setNewRecapDate}}" placeholder="Session label (e.g. Session 3)" style="flex:1;min-width:180px;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13px;background:var(--input-bg)">
      <input value="{{newRecapTitle}}" sc-camel-on-change="{{setNewRecapTitle}}" placeholder="Title" style="flex:2;min-width:180px;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13px;background:var(--input-bg)">
    </div>
    <textarea value="{{newRecapText}}" sc-camel-on-change="{{setNewRecapText}}" placeholder="What happened…" style="width:100%;box-sizing:border-box;min-height:90px;border:1px solid var(--border2);border-radius:8px;padding:10px 12px;font-size:13.5px;line-height:1.5;background:var(--input-bg);resize:vertical"></textarea>
    <button sc-camel-on-click="{{addRecap}}" style="margin-top:10px;border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer" style-hover="border-color:var(--text)">Add recap</button>
  </div>
  <div style="display:flex;flex-direction:column;gap:14px">
    <sc-for list="{{recapList}}" as="rc2" hint-placeholder-count="2">
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:16px 18px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px">
          <div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><span style="font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:var(--accent,#8C5A2B);font-weight:600">{{rc2.date}}</span><span style="font-family:'Spectral',serif;font-size:18px;font-weight:600">{{rc2.title}}</span></div>
          <button sc-camel-on-click="{{rc2.remove}}" style="border:none;background:none;color:var(--muted);cursor:pointer;font-size:14px;padding:2px" style-hover="color:#A33B3B">✕</button>
        </div>
        <div style="font-size:13.5px;color:var(--text);line-height:1.55;margin-top:8px;opacity:0.85">{{rc2.text}}</div>
      </div>
    </sc-for>
  </div>
</div>
</sc-if>`;
