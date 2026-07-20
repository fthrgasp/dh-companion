import { saveJSON } from '../core/storage.js';

export const creaturesMixin = {
  saveCreatures(list) { saveJSON(this.gk('dh-tracker-creatures'), list); },

  upCreatures(fn) {
    this.setState(s => {
      const list = JSON.parse(JSON.stringify(s.creatures || []));
      fn(list);
      this.saveCreatures(list);
      return { creatures: list };
    });
  },

  defaultCreature() {
    return {
      id: 'cr' + Date.now(), name: 'New Creature', tier: 1, type: 'Standard', difficulty: 12,
      evasion: 10, hp: { max: 5, marked: 0 }, stress: { max: 3, marked: 0 },
      attacks: [{ name: '', range: 'Melee', formula: '', effect: '' }],
      thresholds: { major: 8, severe: 15 }, features: [], description: ''
    };
  }
};

export const creaturesTemplate = `
<!-- ============ CREATURES / ADVERSARIES ============ -->
<sc-if value="{{isCreatures}}" hint-placeholder-val="{{ false }}">
<div data-screen-label="Creatures" style="max-width:920px;margin:0 auto;padding:48px 32px">
  <div style="display:flex;align-items:center;gap:14px;border-bottom:2px solid var(--text);padding-bottom:14px;margin-bottom:20px">
    <button sc-camel-on-click="{{goRoster}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer" style-hover="border-color:var(--text)">← Roster</button>
    <h1 style="font-family:'Spectral',serif;font-weight:600;font-size:30px;margin:0;letter-spacing:-0.01em;flex:1">Creatures</h1>
    <button sc-camel-on-click="{{addCreature}}" style="border:none;background:var(--accent,#8C5A2B);color:#fff;border-radius:8px;padding:9px 18px;font-size:13.5px;font-weight:600;cursor:pointer">+ Add creature</button>
  </div>
  <p style="font-size:13px;color:var(--muted);margin:0 0 18px">Custom adversary stat blocks for your GM to pull out mid-session.</p>
  <div style="display:flex;flex-direction:column;gap:14px">
    <sc-for list="{{creatureList}}" as="cr" hint-placeholder-count="2">
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px">
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-start">
          <div style="flex:2;min-width:180px"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Name</div><input value="{{cr.name.val}}" sc-camel-on-change="{{cr.name.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-family:'Spectral',serif;font-size:16px;font-weight:600;background:var(--input-bg)"></div>
          <div style="flex:1;min-width:120px"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Type</div><input value="{{cr.type.val}}" sc-camel-on-change="{{cr.type.on}}" placeholder="Standard, Solo, Horde…" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--input-bg)"></div>
          <div style="flex:none;width:60px"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Tier</div><input type="number" value="{{cr.tier.val}}" sc-camel-on-change="{{cr.tier.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--input-bg)"></div>
          <div style="flex:none;width:90px"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Difficulty</div><input type="number" value="{{cr.difficulty.val}}" sc-camel-on-change="{{cr.difficulty.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--input-bg)"></div>
          <button sc-camel-on-click="{{cr.remove}}" style="border:none;background:none;color:#b3ab9d;cursor:pointer;font-size:14px;padding:8px 2px" style-hover="color:#A33B3B">✕</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:10px;margin-top:10px">
          <div><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Evasion</div><input type="number" value="{{cr.evasion.val}}" sc-camel-on-change="{{cr.evasion.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--input-bg)"></div>
          <div><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">HP</div><input type="number" value="{{cr.hpMax.val}}" sc-camel-on-change="{{cr.hpMax.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--input-bg)"></div>
          <div><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Stress</div><input type="number" value="{{cr.stressMax.val}}" sc-camel-on-change="{{cr.stressMax.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--input-bg)"></div>
          <div><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Major</div><input type="number" value="{{cr.thrMajor.val}}" sc-camel-on-change="{{cr.thrMajor.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--input-bg)"></div>
          <div><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Severe</div><input type="number" value="{{cr.thrSevere.val}}" sc-camel-on-change="{{cr.thrSevere.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--input-bg)"></div>
        </div>
        <div style="margin-top:12px">
          <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Attacks</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <sc-for list="{{cr.attacksList}}" as="atk" hint-placeholder-count="1">
              <div style="border:1px solid var(--border3);border-radius:10px;padding:8px 10px">
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                  <input value="{{atk.name.val}}" sc-camel-on-change="{{atk.name.on}}" placeholder="Attack name" style="flex:1.4;min-width:120px;border:1px solid var(--border2);border-radius:7px;padding:7px 9px;font-size:13px;font-weight:600;background:var(--input-bg)">
                  <input value="{{atk.range.val}}" sc-camel-on-change="{{atk.range.on}}" placeholder="Range" style="flex:1;min-width:80px;border:1px solid var(--border2);border-radius:7px;padding:7px 9px;font-size:12.5px;background:var(--input-bg)">
                  <input value="{{atk.formula.val}}" sc-camel-on-change="{{atk.formula.on}}" placeholder="Damage" style="flex:1;min-width:100px;border:1px solid var(--border2);border-radius:7px;padding:7px 9px;font-size:12.5px;background:var(--input-bg)">
                  <button sc-camel-on-click="{{atk.remove}}" style="border:none;background:none;color:#b3ab9d;cursor:pointer;font-size:13px;padding:4px" style-hover="color:#A33B3B">✕</button>
                </div>
                <textarea value="{{atk.effect.val}}" sc-camel-on-change="{{atk.effect.on}}" rows="2" placeholder="Effect (optional)" style="width:100%;box-sizing:border-box;margin-top:7px;border:1px solid var(--border2);border-radius:7px;padding:7px 9px;font-size:12px;background:var(--input-bg);font-family:inherit;resize:vertical"></textarea>
              </div>
            </sc-for>
          </div>
          <button sc-camel-on-click="{{cr.addAttack}}" style="margin-top:8px;border:1px dashed var(--border2);background:none;color:var(--muted);border-radius:8px;padding:6px 12px;font-size:12px;cursor:pointer" style-hover="border-color:var(--accent,#8C5A2B);color:var(--accent,#8C5A2B)">+ Add attack</button>
        </div>
        <div style="margin-top:12px">
          <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Features</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <sc-for list="{{cr.featuresList}}" as="ft" hint-placeholder-count="1">
              <div style="border:1px solid var(--border3);border-radius:10px;padding:8px 10px">
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                  <input value="{{ft.name.val}}" sc-camel-on-change="{{ft.name.on}}" placeholder="Feature name" style="flex:1;min-width:120px;border:1px solid var(--border2);border-radius:7px;padding:7px 9px;font-size:13px;font-weight:600;background:var(--input-bg)">
                  <button sc-camel-on-click="{{ft.remove}}" style="border:none;background:none;color:#b3ab9d;cursor:pointer;font-size:13px;padding:4px" style-hover="color:#A33B3B">✕</button>
                </div>
                <textarea value="{{ft.desc.val}}" sc-camel-on-change="{{ft.desc.on}}" rows="2" placeholder="What it does" style="width:100%;box-sizing:border-box;margin-top:7px;border:1px solid var(--border2);border-radius:7px;padding:7px 9px;font-size:12px;background:var(--input-bg);font-family:inherit;resize:vertical"></textarea>
              </div>
            </sc-for>
          </div>
          <button sc-camel-on-click="{{cr.addFeature}}" style="margin-top:8px;border:1px dashed var(--border2);background:none;color:var(--muted);border-radius:8px;padding:6px 12px;font-size:12px;cursor:pointer" style-hover="border-color:var(--accent,#8C5A2B);color:var(--accent,#8C5A2B)">+ Add feature</button>
        </div>
        <div style="margin-top:12px"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Description</div><textarea value="{{cr.description.val}}" sc-camel-on-change="{{cr.description.on}}" rows="2" placeholder="Flavor and appearance" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--input-bg);font-family:inherit;resize:vertical"></textarea></div>
        <button sc-camel-on-click="{{cr.remove}}" style="margin-top:12px;border:1px solid var(--border2);background:var(--panel);border-radius:8px;padding:7px 14px;font-size:12.5px;color:var(--muted);cursor:pointer" style-hover="border-color:#A33B3B;color:#A33B3B">Remove creature</button>
      </div>
    </sc-for>
  </div>
</div>
</sc-if>`;
