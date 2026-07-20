import { dmgCalc } from '../features/damageCalculator.js';

export const sheetMixin = {
  bind(path, isNum) {
    const c = this.active();
    let val = c;
    for (const k of path.split('.')) val = val ? val[k] : '';
    return {
      val: val === undefined || val === null ? '' : val,
      on: (e) => {
        const raw = e.target.value;
        const v = isNum ? (parseInt(raw, 10) || 0) : raw;
        this.up(ch => {
          const keys = path.split('.');
          let o = ch;
          for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
          o[keys[keys.length - 1]] = v;
        });
      }
    };
  },

  tier(level) {
    if (level <= 1) return 'Tier 1';
    if (level <= 4) return 'Tier 2';
    if (level <= 7) return 'Tier 3';
    return 'Tier 4';
  },

  // Converts a saved Creature stat block into a companion so a GM's
  // adversary write-up can double as a player's companion sheet.
  creatureToCompanion(cr) {
    this.normalizeCreature(cr);
    return {
      name: cr.name, level: 1, difficulty: cr.difficulty || 12, movement: '',
      hp: { label: cr.type || 'Moderate', max: (cr.hp && cr.hp.max) || 5, marked: 0 },
      stress: { max: (cr.stress && cr.stress.max) || 3, marked: 0 },
      attacks: cr.attacks.map(a => ({ name: a.name, range: a.range, formula: a.formula, effect: a.effect })),
      features: cr.features.map(f => ({ type: 'Passive', name: f.name, desc: f.desc })),
      notes: cr.description || ''
    };
  },

  // Builds the editable rows for one of a character's weapon lists
  // ('weaponsPrimary' or 'weaponsSecondary'), each with an equipped toggle
  // and its own features sublist.
  buildWeaponList(listKey) {
    const c = this.active();
    if (!c) return [];
    const list = c[listKey] || [];
    return list.map((w, i) => ({
      equipped: { val: !!w.equipped, on: () => this.up(ch => { ch[listKey][i].equipped = !ch[listKey][i].equipped; }) },
      name: { val: w.name, on: e => this.up(ch => { ch[listKey][i].name = e.target.value; }) },
      range: { val: w.range, on: e => this.up(ch => { ch[listKey][i].range = e.target.value; }) },
      damage: { val: w.damage, on: e => this.up(ch => { ch[listKey][i].damage = e.target.value; }) },
      remove: () => this.up(ch => ch[listKey].splice(i, 1)),
      features: (w.features || []).map((f, j) => ({
        name: { val: f.name, on: e => this.up(ch => { ch[listKey][i].features[j].name = e.target.value; }) },
        desc: { val: f.desc, on: e => this.up(ch => { ch[listKey][i].features[j].desc = e.target.value; }) },
        remove: () => this.up(ch => ch[listKey][i].features.splice(j, 1))
      })),
      addFeature: () => this.up(ch => ch[listKey][i].features.push({ name: '', desc: '' }))
    }));
  },

  levelScaling(level) {
    const proficiency = 1 + (level >= 2 ? 1 : 0) + (level >= 5 ? 1 : 0) + (level >= 8 ? 1 : 0);
    const hpBonus = Math.floor((level - 1) / 2);
    const domainCardCount = level + 1; // 2 at level 1, +1 per level thereafter
    return {
      proficiency,
      hpBonus,
      domainCardCount,
      thresholds: { major: 7 + (level - 1), severe: 12 + (level - 1) }
    };
  }
};

export const sheetTemplate = `
<!-- ============ SHEET ============ -->
<sc-if value="{{isSheet}}" hint-placeholder-val="{{ false }}">
<div style="max-width:1180px;margin:0 auto;padding:20px 24px 60px">
  <!-- Top bar -->
  <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:8px 0 14px;border-bottom:2px solid var(--text)">
    <div style="position:relative" data-print-hide="1">
      <button sc-camel-on-click="{{togglePages}}" style="border:1px solid var(--border2);background:var(--panel);border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:7px" style-hover="border-color:var(--text)">Pages <span style="font-size:10px;color:var(--muted)">▾</span></button>
      <sc-if value="{{pagesOpen}}" hint-placeholder-val="{{ false }}">
        <div style="position:absolute;top:calc(100% + 6px);left:0;z-index:50;min-width:220px;background:var(--panel);border:1px solid var(--border2);border-radius:10px;box-shadow:0 8px 24px rgba(38,34,27,0.14);padding:6px;display:flex;flex-direction:column;gap:2px">
          <button sc-camel-on-click="{{pageRoster}}" style="border:none;background:none;text-align:left;border-radius:7px;padding:9px 12px;font-size:13.5px;cursor:pointer;font-weight:600" style-hover="background:var(--highlight-bg)">Party Roster</button>
          <button sc-camel-on-click="{{goPartyMenu}}" style="border:none;background:none;text-align:left;border-radius:7px;padding:9px 12px;font-size:13.5px;cursor:pointer;font-weight:600" style-hover="background:var(--highlight-bg)">Shared Inventory</button>
          <button sc-camel-on-click="{{goRecapsMenu}}" style="border:none;background:none;text-align:left;border-radius:7px;padding:9px 12px;font-size:13.5px;cursor:pointer;font-weight:600" style-hover="background:var(--highlight-bg)">Session Recaps</button>
          <button sc-camel-on-click="{{goCreaturesMenu}}" style="border:none;background:none;text-align:left;border-radius:7px;padding:9px 12px;font-size:13.5px;cursor:pointer;font-weight:600" style-hover="background:var(--highlight-bg)">Creatures</button>
          <button sc-camel-on-click="{{goCompendiumMenu}}" style="border:none;background:none;text-align:left;border-radius:7px;padding:9px 12px;font-size:13.5px;cursor:pointer;font-weight:600" style-hover="background:var(--highlight-bg)">Companion Compendium</button>
          <div style="height:1px;background:var(--border3);margin:3px 6px"></div>
          <sc-for list="{{pageList}}" as="pg" hint-placeholder-count="3">
            <button sc-camel-on-click="{{pg.open}}" style="border:none;background:none;text-align:left;border-radius:7px;padding:9px 12px;font-size:13.5px;cursor:pointer;display:flex;justify-content:space-between;gap:10px;align-items:baseline;color:{{pg.fg}};background:{{pg.bg}}" style-hover="background:var(--highlight-bg)"><span>{{pg.name}}</span><span style="font-size:11px;color:var(--muted)">{{pg.sub}}</span></button>
          </sc-for>
        </div>
      </sc-if>
    </div>
    <div style="flex:none;width:52px;height:52px">
      <x-import component-from-global-scope="image-slot" from="c6b115b3-1cc5-46ce-8deb-17fd610f11d8#/image-slot.js" id="portrait-{{c.id}}" shape="circle" placeholder="Photo" style="width:52px;height:52px" hint-size="52px,52px"></x-import>
    </div>
    <div style="flex:1;min-width:200px">
      <div style="font-family:'Spectral',serif;font-size:26px;font-weight:600;line-height:1.1">{{c.name}}</div>
      <div style="font-size:12.5px;color:var(--muted)">{{headerSub}}</div>
      <sc-if value="{{isMulticlass}}" hint-placeholder-val="{{ false }}">
        <div style="margin-top:4px;display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--accent,#8C5A2B);background:var(--highlight-bg);border-radius:999px;padding:2px 10px">Multiclass · {{multiclassLabel}}</div>
      </sc-if>
    </div>
    <div style="display:flex;align-items:center;gap:8px">
      <div style="display:flex;align-items:center;gap:8px;border:1px solid var(--border2);background:var(--panel);border-radius:8px;padding:6px 6px 6px 12px" data-print-hide="1">
        <span style="font-family:'Spectral',serif;font-size:15px;font-weight:600;min-width:52px">{{sessionTimeTxt}}</span>
        <button sc-camel-on-click="{{sessionToggle}}" style="width:28px;height:28px;border:none;background:var(--highlight-bg);color:var(--text);border-radius:6px;cursor:pointer;font-size:12px">{{sessionToggleLabel}}</button>
        <button sc-camel-on-click="{{sessionReset}}" style="width:28px;height:28px;border:none;background:none;color:var(--muted);cursor:pointer;font-size:13px" style-hover="color:#A33B3B">↻</button>
      </div>
      <div style="position:relative" data-print-hide="1">
        <button sc-camel-on-click="{{toggleExportMenu}}" title="Export" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:8px 12px;font-size:13px;cursor:pointer" style-hover="border-color:var(--text)">⋯</button>
        <sc-if value="{{exportMenuOpen}}" hint-placeholder-val="{{ false }}">
          <div style="position:absolute;top:calc(100% + 6px);right:0;z-index:50;min-width:180px;background:var(--panel);border:1px solid var(--border2);border-radius:10px;box-shadow:0 8px 24px rgba(38,34,27,0.14);padding:6px;display:flex;flex-direction:column;gap:2px">
            <button sc-camel-on-click="{{exportPdf}}" style="border:none;background:none;text-align:left;border-radius:7px;padding:9px 12px;font-size:13.5px;cursor:pointer" style-hover="background:var(--highlight-bg)">⇩ Export PDF</button>
            <button sc-camel-on-click="{{exportJson}}" style="border:none;background:none;text-align:left;border-radius:7px;padding:9px 12px;font-size:13.5px;cursor:pointer" style-hover="background:var(--highlight-bg)">⇩ Export JSON</button>
          </div>
        </sc-if>
      </div>
      <button sc-camel-on-click="{{toggleDark}}" data-print-hide="1" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer" style-hover="border-color:var(--text)">{{darkLabel}}</button>
      <div style="text-align:center;background:var(--accent,#8C5A2B);color:#fff;border-radius:10px;padding:6px 14px"><div style="font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;opacity:0.8">Level</div><div style="font-family:'Spectral',serif;font-size:20px;font-weight:600;line-height:1">{{c.level}}</div></div>
    </div>
  </div>
  <!-- Tabs -->
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin:14px 0 20px" data-print-hide="1">
    <sc-for list="{{tabs}}" as="t" hint-placeholder-count="6">
      <button sc-camel-on-click="{{t.click}}" title="{{t.tip}}" style="border:1px solid var(--border2);border-radius:999px;padding:8px 18px;font-size:13px;cursor:pointer;background:{{t.bg}};color:{{t.fg}};border-color:{{t.bc}};opacity:{{t.opacity}}">{{t.label}}</button>
    </sc-for>
  </div>

  <!-- ======== PLAY TAB ======== -->
  <sc-if value="{{tabPlay}}" hint-placeholder-val="{{ true }}">
  <div data-screen-label="Play" style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start">

    <!-- Column A: stats -->
    <div style="flex:1;min-width:290px;display:flex;flex-direction:column;gap:16px">
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px">
        <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Conditions</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px" data-print-hide="1">
          <sc-for list="{{conditionList}}" as="cd2" hint-placeholder-count="3">
            <div style="display:inline-flex;align-items:center;gap:6px;border:1px solid {{cd2.bc}};background:{{cd2.bg}};color:{{cd2.fg}};border-radius:999px;padding:6px 6px 6px 14px;font-size:12.5px;cursor:pointer" title="{{cd2.desc}}">
              <span sc-camel-on-click="{{cd2.toggle}}">{{cd2.name}}</span>
              <sc-if value="{{cd2.removable}}" hint-placeholder-val="{{ false }}">
                <button sc-camel-on-click="{{cd2.remove}}" style="border:none;background:none;color:inherit;opacity:0.6;cursor:pointer;font-size:12px;padding:0 2px">✕</button>
              </sc-if>
            </div>
          </sc-for>
        </div>
        <div style="display:flex;gap:6px" data-print-hide="1">
          <input value="{{newConditionName}}" sc-camel-on-change="{{setNewConditionName}}" placeholder="Custom condition" style="flex:1;border:1px solid var(--border2);border-radius:8px;padding:7px 10px;font-size:13px;background:var(--input-bg)">
          <button sc-camel-on-click="{{addCondition}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:7px 14px;font-size:13px;cursor:pointer" style-hover="border-color:var(--text)">Add</button>
        </div>
      </div>
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px">
        <div style="display:flex;gap:10px">
          <div style="flex:1;text-align:center;border:1px solid var(--border);border-radius:10px;padding:10px 6px"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted)">Evasion</div><div style="font-family:'Spectral',serif;font-size:26px;font-weight:600">{{c.evasion}}</div></div>
          <div style="flex:1;text-align:center;border:1px solid var(--border);border-radius:10px;padding:10px 6px"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted)">Armor</div><div style="font-family:'Spectral',serif;font-size:26px;font-weight:600">{{c.armorScore}}</div></div>
          <div style="flex:1;text-align:center;border:1px solid var(--border);border-radius:10px;padding:10px 6px"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted)">Prof.</div><div style="font-family:'Spectral',serif;font-size:26px;font-weight:600">{{c.proficiency}}</div></div>
        </div>
        <div style="margin-top:14px">
          <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Damage thresholds</div>
          <div style="display:flex;border:1px solid var(--border);border-radius:8px;overflow:hidden;text-align:center;font-size:12px">
            <div style="flex:1;padding:8px 4px;background:var(--input-bg)"><div style="color:var(--muted)">Minor</div><div style="font-weight:600">1+ · mark 1</div></div>
            <div style="flex:1;padding:8px 4px;border-left:1px solid var(--border);background:var(--major-bg)"><div style="color:var(--muted)">Major</div><div style="font-weight:600">{{c.thresholds.major}}+ · mark 2</div></div>
            <div style="flex:1;padding:8px 4px;border-left:1px solid var(--border);background:var(--severe-bg)"><div style="color:var(--muted)">Severe</div><div style="font-weight:600">{{c.thresholds.severe}}+ · mark 3</div></div>
          </div>
        </div>
      </div>
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px">
        <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Traits</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
          <sc-for list="{{traitList}}" as="tr" hint-placeholder-count="6">
            <div style="border:1px solid var(--border);border-radius:10px;padding:8px 4px;text-align:center"><div style="font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted)">{{tr.name}}</div><div style="font-family:'Spectral',serif;font-size:22px;font-weight:600">{{tr.val}}</div></div>
          </sc-for>
        </div>
      </div>
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px">
        <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Experiences</div>
        <sc-for list="{{expListView}}" as="ex" hint-placeholder-count="2">
          <div style="display:flex;justify-content:space-between;gap:10px;font-size:13.5px;padding:5px 0;border-bottom:1px solid var(--border3)"><span>{{ex.name}}</span><span style="font-weight:600;color:var(--accent,#8C5A2B)">{{ex.bonus}}</span></div>
        </sc-for>
      </div>
    </div>

    <!-- Column B: resources + damage -->
    <div style="flex:1.25;min-width:330px;display:flex;flex-direction:column;gap:16px">
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px;display:flex;flex-direction:column;gap:14px">
        <div>
          <div style="display:flex;justify-content:space-between;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#A33B3B;margin-bottom:7px"><span style="font-weight:600">Hit Points</span><span>{{hpTxt}}</span></div>
          <div style="display:flex;gap:7px;flex-wrap:wrap"><sc-for list="{{hpPips}}" as="p" hint-placeholder-count="6"><div sc-camel-on-click="{{p.click}}" style="width:26px;height:26px;cursor:pointer;border:2px solid #A33B3B;background:{{p.bg}};border-radius:var(--prad,999px);transform:var(--prot,none)"></div></sc-for></div>
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#5B4A8A;margin-bottom:7px"><span style="font-weight:600">Stress</span><span>{{stTxt}}</span></div>
          <div style="display:flex;gap:7px;flex-wrap:wrap"><sc-for list="{{stPips}}" as="p" hint-placeholder-count="6"><div sc-camel-on-click="{{p.click}}" style="width:26px;height:26px;cursor:pointer;border:2px solid #5B4A8A;background:{{p.bg}};border-radius:var(--prad,999px);transform:var(--prot,none)"></div></sc-for></div>
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#5A6470;margin-bottom:7px"><span style="font-weight:600">Armor slots</span><span>{{arTxt}}</span></div>
          <div style="display:flex;gap:7px;flex-wrap:wrap"><sc-for list="{{arPips}}" as="p" hint-placeholder-count="3"><div sc-camel-on-click="{{p.click}}" style="width:26px;height:26px;cursor:pointer;border:2px solid #5A6470;background:{{p.bg}};border-radius:var(--prad,999px);transform:var(--prot,none)"></div></sc-for></div>
        </div>
        <div style="border-top:1px solid var(--border3);padding-top:14px">
          <div style="display:flex;justify-content:space-between;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#a5821f;margin-bottom:7px"><span style="font-weight:600">Hope</span><span>{{hopeTxt}}</span></div>
          <div style="display:flex;gap:9px;flex-wrap:wrap"><sc-for list="{{hopePips}}" as="p" hint-placeholder-count="6"><div sc-camel-on-click="{{p.click}}" style="width:24px;height:24px;cursor:pointer;border:2px solid #C9A227;background:{{p.bg}};border-radius:3px;transform:rotate(45deg);margin:3px"></div></sc-for></div>
        </div>
      </div>

      <!-- Damage calculator -->
      <div data-screen-label="Damage calculator" data-print-hide="1" style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px">
        <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Take damage</div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <input type="number" value="{{dmgInput}}" sc-camel-on-change="{{setDmgInput}}" placeholder="Incoming damage" style="width:150px;border:1px solid var(--border2);border-radius:8px;padding:9px 12px;font-size:15px;background:var(--input-bg)">
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" checked="{{useArmor}}" sc-camel-on-change="{{toggleArmor}}">Mark an armor slot (−1 severity)</label>
        </div>
        <div style="margin-top:12px">
          <div style="font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Modifiers</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <sc-for list="{{modList}}" as="m" hint-placeholder-count="2">
              <div style="display:flex;align-items:center;gap:8px;font-size:13px">
                <button sc-camel-on-click="{{m.toggle}}" style="flex:1;text-align:left;display:flex;justify-content:space-between;gap:8px;border:1px solid {{m.bc}};background:{{m.bg}};color:{{m.fg}};border-radius:8px;padding:7px 12px;cursor:pointer"><span>{{m.label}}</span><span style="font-weight:600">{{m.eff}}</span></button>
                <button sc-camel-on-click="{{m.remove}}" style="border:none;background:none;color:#b3ab9d;cursor:pointer;font-size:15px;padding:4px" style-hover="color:#A33B3B">✕</button>
              </div>
            </sc-for>
          </div>
          <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
            <input value="{{newModLabel}}" sc-camel-on-change="{{setNewModLabel}}" placeholder="e.g. Physical resistance" style="flex:2;min-width:140px;border:1px solid var(--border2);border-radius:8px;padding:7px 10px;font-size:13px;background:var(--input-bg)">
            <sc-raw-select value="{{newModType}}" sc-camel-on-change="{{setNewModType}}" style="border:1px solid var(--border2);border-radius:8px;padding:7px 8px;font-size:13px;background:var(--input-bg)">
              <option value="half">Halve damage</option>
              <option value="minus">Reduce by N</option>
              <option value="plus">Increase by N</option>
            </sc-raw-select>
            <input type="number" value="{{newModValue}}" sc-camel-on-change="{{setNewModValue}}" style="width:56px;border:1px solid var(--border2);border-radius:8px;padding:7px 8px;font-size:13px;background:var(--input-bg)">
            <button sc-camel-on-click="{{addMod}}" style="border:1px solid var(--border2);background:var(--panel);border-radius:8px;padding:7px 14px;font-size:13px;cursor:pointer" style-hover="border-color:var(--text)">Add</button>
          </div>
        </div>
        <div style="margin-top:14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;border-top:1px solid var(--border3);padding-top:12px">
          <div style="flex:1;min-width:180px;font-size:14px">{{dmgResult}}</div>
          <button sc-camel-on-click="{{applyDamage}}" style="border:none;background:#A33B3B;color:#fff;border-radius:8px;padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer" style-hover="background:#8c3030">Apply</button>
        </div>
      </div>

      <button sc-camel-on-click="{{longRest}}" data-print-hide="1" style="border:1px solid var(--border2);background:var(--panel);border-radius:10px;padding:13px;font-size:14px;cursor:pointer;color:var(--text)" style-hover="border-color:var(--accent,#8C5A2B);color:var(--accent,#8C5A2B)">☽ Long rest — clear HP &amp; Stress, restore armor slots &amp; once-per-rest items</button>
    </div>

    <!-- Column C: trackers + items -->
    <div style="flex:1;min-width:280px;display:flex;flex-direction:column;gap:16px">
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px">
        <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Weapons &amp; Armor</div>
        <sc-if value="{{hasEquippedWeapons}}" hint-placeholder-val="{{ false }}">
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px">
            <sc-for list="{{playEquippedWeapons}}" as="ew" hint-placeholder-count="1">
              <div style="border:1px solid var(--border3);border-radius:8px;padding:8px 10px">
                <div style="display:flex;justify-content:space-between;gap:8px;font-size:13.5px;font-weight:600"><span>{{ew.name}}</span><span style="color:var(--muted);font-weight:400">{{ew.range}}</span></div>
                <div style="font-size:12.5px;color:var(--muted);margin-top:2px">{{ew.damage}}</div>
                <sc-if value="{{ew.hasFeatures}}" hint-placeholder-val="{{ false }}">
                  <div style="font-size:11.5px;color:var(--muted);margin-top:4px;font-style:italic">{{ew.featuresTxt}}</div>
                </sc-if>
              </div>
            </sc-for>
          </div>
        </sc-if>
        <sc-if value="{{noEquippedWeapons}}" hint-placeholder-val="{{ true }}">
          <div style="font-size:13px;color:var(--muted);margin-bottom:8px">No weapon equipped.</div>
        </sc-if>
        <div style="font-size:12.5px;color:var(--muted)">{{playArmorSummary}}</div>
        <div style="font-size:11.5px;color:var(--muted);margin-top:8px;font-style:italic" data-print-hide="1">Edit these on the Gear tab.</div>
      </div>
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px">
        <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Trackers</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <sc-for list="{{trackerList}}" as="tk" hint-placeholder-count="1">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="flex:1;font-size:14px">{{tk.label}}</span>
              <button sc-camel-on-click="{{tk.dec}}" style="width:28px;height:28px;border:1px solid var(--border2);background:var(--panel);border-radius:7px;cursor:pointer;font-size:15px">−</button>
              <span style="width:26px;text-align:center;font-family:'Spectral',serif;font-size:19px;font-weight:600">{{tk.value}}</span>
              <button sc-camel-on-click="{{tk.inc}}" style="width:28px;height:28px;border:1px solid var(--border2);background:var(--panel);border-radius:7px;cursor:pointer;font-size:15px">+</button>
              <button sc-camel-on-click="{{tk.remove}}" style="border:none;background:none;color:#b3ab9d;cursor:pointer;font-size:14px;padding:2px" style-hover="color:#A33B3B">✕</button>
            </div>
          </sc-for>
        </div>
        <div style="display:flex;gap:6px;margin-top:10px" data-print-hide="1">
          <input value="{{newTracker}}" sc-camel-on-change="{{setNewTracker}}" placeholder="e.g. Inspiration" style="flex:1;border:1px solid var(--border2);border-radius:8px;padding:7px 10px;font-size:13px;background:var(--input-bg)">
          <button sc-camel-on-click="{{addTracker}}" style="border:1px solid var(--border2);background:var(--panel);border-radius:8px;padding:7px 14px;font-size:13px;cursor:pointer" style-hover="border-color:var(--text)">Add</button>
        </div>
      </div>
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px">
        <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Once per long rest</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <sc-for list="{{restItemList}}" as="ri" hint-placeholder-count="2">
            <div style="display:flex;gap:10px;align-items:flex-start">
              <button sc-camel-on-click="{{ri.toggle}}" style="flex:none;width:22px;height:22px;margin-top:1px;border:2px solid var(--accent,#8C5A2B);background:{{ri.bg}};border-radius:6px;cursor:pointer;color:#fff;font-size:13px;line-height:1;display:flex;align-items:center;justify-content:center;padding:0">{{ri.check}}</button>
              <div style="flex:1">
                <div style="font-size:14px;font-weight:600;text-decoration:{{ri.deco}};color:{{ri.fg}}">{{ri.name}}</div>
                <div style="font-size:12.5px;color:var(--muted);margin-top:1px">{{ri.desc}}</div>
              </div>
              <button sc-camel-on-click="{{ri.remove}}" style="border:none;background:none;color:#b3ab9d;cursor:pointer;font-size:14px;padding:2px" style-hover="color:#A33B3B">✕</button>
            </div>
          </sc-for>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:12px" data-print-hide="1">
          <input value="{{newItemName}}" sc-camel-on-change="{{setNewItemName}}" placeholder="Item name" style="border:1px solid var(--border2);border-radius:8px;padding:7px 10px;font-size:13px;background:var(--input-bg)">
          <div style="display:flex;gap:6px">
            <input value="{{newItemDesc}}" sc-camel-on-change="{{setNewItemDesc}}" placeholder="What it does" style="flex:1;border:1px solid var(--border2);border-radius:8px;padding:7px 10px;font-size:13px;background:var(--input-bg)">
            <button sc-camel-on-click="{{addRestItem}}" style="border:1px solid var(--border2);background:var(--panel);border-radius:8px;padding:7px 14px;font-size:13px;cursor:pointer" style-hover="border-color:var(--text)">Add</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  </sc-if>

  <!-- ======== CARDS TAB ======== -->
  <sc-if value="{{tabCards}}" hint-placeholder-val="{{ false }}">
  <div data-screen-label="Domain cards" style="display:flex;flex-direction:column;gap:22px;max-width:820px">
    <div>
      <div style="font-family:'Spectral',serif;font-size:19px;font-weight:600;margin-bottom:10px">Loadout <span style="font-size:12px;color:var(--muted);font-family:system-ui,sans-serif;font-weight:400">— active cards</span></div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <sc-for list="{{loadoutCards}}" as="cd" hint-placeholder-count="3">
          <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:16px 18px;display:flex;gap:14px;align-items:flex-start">
            <div style="flex:none;width:10px;align-self:stretch;border-radius:5px;background:{{cd.chip}}"></div>
            <div style="flex:1">
              <div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><span style="font-family:'Spectral',serif;font-size:17px;font-weight:600">{{cd.name}}</span><span style="font-size:11.5px;color:var(--muted);letter-spacing:0.05em;text-transform:uppercase">{{cd.meta}}</span></div>
              <div style="font-size:13.5px;color:#4d463a;margin-top:4px;line-height:1.45">{{cd.text}}</div>
            </div>
            <button sc-camel-on-click="{{cd.move}}" style="flex:none;border:1px solid var(--border2);background:var(--panel);border-radius:8px;padding:6px 12px;font-size:12px;cursor:pointer;color:var(--muted)" style-hover="border-color:var(--text);color:var(--text)">To vault</button>
          </div>
        </sc-for>
      </div>
    </div>
    <div>
      <div style="font-family:'Spectral',serif;font-size:19px;font-weight:600;margin-bottom:10px">Vault <span style="font-size:12px;color:var(--muted);font-family:system-ui,sans-serif;font-weight:400">— stored cards</span></div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <sc-for list="{{vaultCards}}" as="cd" hint-placeholder-count="1">
          <div style="background:var(--input-bg);border:1px dashed var(--border2);border-radius:12px;padding:14px 18px;display:flex;gap:14px;align-items:flex-start;opacity:0.85">
            <div style="flex:none;width:10px;align-self:stretch;border-radius:5px;background:{{cd.chip}}"></div>
            <div style="flex:1">
              <div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><span style="font-family:'Spectral',serif;font-size:16px;font-weight:600">{{cd.name}}</span><span style="font-size:11.5px;color:var(--muted);letter-spacing:0.05em;text-transform:uppercase">{{cd.meta}}</span></div>
              <div style="font-size:13px;color:#4d463a;margin-top:4px;line-height:1.45">{{cd.text}}</div>
            </div>
            <button sc-camel-on-click="{{cd.move}}" style="flex:none;border:1px solid var(--border2);background:var(--panel);border-radius:8px;padding:6px 12px;font-size:12px;cursor:pointer" style-hover="border-color:var(--text)">Equip</button>
          </div>
        </sc-for>
      </div>
    </div>
    <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:16px 18px" data-print-hide="1">
      <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Add a card</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <input value="{{newCardName}}" sc-camel-on-change="{{setNewCardName}}" placeholder="Card name" style="flex:1;min-width:140px;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13px;background:var(--input-bg)">
        <sc-raw-select value="{{newCardDomain}}" sc-camel-on-change="{{setNewCardDomain}}" style="border:1px solid var(--border2);border-radius:8px;padding:8px;font-size:13px;background:var(--input-bg)">
          <sc-for list="{{domainOptions}}" as="dopt" hint-placeholder-count="9">
            <option value="{{dopt}}">{{dopt}}</option>
          </sc-for>
        </sc-raw-select>
        <input value="{{newCardText}}" sc-camel-on-change="{{setNewCardText}}" placeholder="Effect text" style="flex:2;min-width:180px;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13px;background:var(--input-bg)">
        <button sc-camel-on-click="{{addCard}}" style="border:1px solid var(--border2);background:var(--panel);border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer" style-hover="border-color:var(--text)">Add</button>
      </div>
    </div>
    <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:16px 18px">
      <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Custom domain decks</div>
      <p style="font-size:12.5px;color:var(--muted);margin:0 0 10px;line-height:1.5">Playing with a homebrew domain? Add its name here so it shows up in the domain picker above.</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">
        <sc-for list="{{customDomainList}}" as="cdm" hint-placeholder-count="1">
          <div style="display:inline-flex;align-items:center;gap:8px;border:1px solid var(--border);border-radius:999px;padding:5px 6px 5px 12px;font-size:13px">
            <span style="width:9px;height:9px;border-radius:999px;background:{{cdm.chip}}"></span>
            <span>{{cdm.name}}</span>
            <button sc-camel-on-click="{{cdm.remove}}" style="border:none;background:none;color:var(--muted);cursor:pointer;font-size:13px;padding:2px" style-hover="color:#A33B3B">✕</button>
          </div>
        </sc-for>
      </div>
      <div style="display:flex;gap:6px">
        <input value="{{newDomainName}}" sc-camel-on-change="{{setNewDomainName}}" placeholder="Domain name (e.g. Moonlight)" style="flex:1;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13px;background:var(--input-bg)">
        <button sc-camel-on-click="{{addDomain}}" style="border:1px solid var(--border2);background:var(--panel);border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer" style-hover="border-color:var(--text)">Add domain</button>
      </div>
    </div>
    <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:16px 18px" data-print-hide="1">
      <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Bulk card import</div>
      <p style="font-size:12.5px;color:var(--muted);margin:0 0 10px;line-height:1.5">Have one person paste in a whole batch of cards at once instead of everyone retyping the same text into the wizard. Works for any domain, including Blood and Dread. Format, one card per block:</p>
      <pre style="font-size:11.5px;background:var(--input-bg);border:1px solid var(--border2);border-radius:8px;padding:10px 12px;margin:0 0 10px;white-space:pre-wrap;line-height:1.5">DOMAIN: Blood
CARD: Ravenous Bite
TYPE: Ability
LEVEL: 1
TEXT: On a successful attack, mark a Stress to deal an extra 1d6 damage.

CARD: Next card name
TEXT: Its text can run
across multiple lines too.

DOMAIN: Dread
CARD: ...</pre>
      <p style="font-size:11.5px;color:var(--muted);margin:0 0 10px;line-height:1.5">TYPE and LEVEL are optional (default to Ability / 1). Re-importing a card with the same name updates it instead of duplicating it, so it's safe to paste an updated file over an old one.</p>
      <textarea value="{{cardImportText}}" sc-camel-on-change="{{setCardImportText}}" placeholder="Paste your card file here…" style="width:100%;min-height:140px;border:1px solid var(--border2);border-radius:8px;padding:10px 12px;font-size:13px;background:var(--input-bg);box-sizing:border-box;font-family:ui-monospace,monospace;resize:vertical"></textarea>
      <div style="display:flex;align-items:center;gap:10px;margin-top:10px">
        <button sc-camel-on-click="{{importCards}}" style="border:1px solid var(--border2);background:var(--panel);border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer" style-hover="border-color:var(--text)">Import cards</button>
        <sc-if value="{{hasImportResult}}" hint-placeholder-val="{{ false }}">
          <span style="font-size:12.5px;color:var(--muted)">{{importResultSummary}}</span>
        </sc-if>
      </div>
      <sc-if value="{{hasImportErrors}}" hint-placeholder-val="{{ false }}">
        <div style="margin-top:10px;background:#fff4f0;border:1px solid #d98b6f;border-radius:8px;padding:10px 12px">
          <div style="font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:#a33b3b;margin-bottom:6px">Skipped lines — fix and re-paste</div>
          <sc-for list="{{importErrors}}" as="ierr" hint-placeholder-count="1">
            <div style="font-size:12px;color:#7a3020;line-height:1.5">{{ierr}}</div>
          </sc-for>
        </div>
      </sc-if>
      <sc-if value="{{hasImportedCards}}" hint-placeholder-val="{{ false }}">
        <div style="margin-top:14px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:var(--muted)">Imported so far ({{importedCardCount}})</span>
            <button sc-camel-on-click="{{clearAllImported}}" style="border:none;background:none;color:var(--muted);cursor:pointer;font-size:11.5px;text-decoration:underline" style-hover="color:#A33B3B">Clear all</button>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            <sc-for list="{{importedCardList}}" as="icd" hint-placeholder-count="1">
              <div style="display:inline-flex;align-items:center;gap:8px;border:1px solid var(--border);border-radius:999px;padding:5px 6px 5px 12px;font-size:13px">
                <span style="width:9px;height:9px;border-radius:999px;background:{{icd.chip}}"></span>
                <span>{{icd.name}}</span>
                <span style="font-size:11px;color:var(--muted)">{{icd.domain}}</span>
                <button sc-camel-on-click="{{icd.remove}}" style="border:none;background:none;color:var(--muted);cursor:pointer;font-size:13px;padding:2px" style-hover="color:#A33B3B">✕</button>
              </div>
            </sc-for>
          </div>
        </div>
      </sc-if>
    </div>
  </div>
  </sc-if>

  <!-- ======== GEAR TAB ======== -->
  <sc-if value="{{tabGear}}" hint-placeholder-val="{{ false }}">
  <div data-screen-label="Gear and notes" style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start">
    <div style="flex:1;min-width:300px;display:flex;flex-direction:column;gap:16px">
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px">
        <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Weapons</div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:8px">Primary</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px">
          <sc-for list="{{primaryWeapons}}" as="pw" hint-placeholder-count="1">
            <div style="border:1px solid var(--border3);border-radius:10px;padding:10px 12px">
              <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                <label style="display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--muted);cursor:pointer"><input type="checkbox" checked="{{pw.equipped.val}}" sc-camel-on-change="{{pw.equipped.on}}">Equipped</label>
                <input value="{{pw.name.val}}" sc-camel-on-change="{{pw.name.on}}" placeholder="Weapon name" style="flex:2;min-width:110px;border:1px solid var(--border2);border-radius:8px;padding:7px 9px;font-size:13.5px;background:var(--input-bg)">
                <sc-raw-select value="{{pw.range.val}}" sc-camel-on-change="{{pw.range.on}}" style="border:1px solid var(--border2);border-radius:8px;padding:7px;font-size:13px;background:var(--input-bg)">
                  <option value="Melee">Melee</option><option value="Very Close">Very Close</option><option value="Close">Close</option><option value="Far">Far</option><option value="Very Far">Very Far</option>
                </sc-raw-select>
                <input value="{{pw.damage.val}}" sc-camel-on-change="{{pw.damage.on}}" placeholder="Damage" style="flex:1;min-width:100px;border:1px solid var(--border2);border-radius:8px;padding:7px 9px;font-size:13px;background:var(--input-bg)">
                <button sc-camel-on-click="{{pw.remove}}" style="border:none;background:none;color:#b3ab9d;cursor:pointer;font-size:13px;padding:4px" style-hover="color:#A33B3B">✕</button>
              </div>
              <div style="margin-top:8px">
                <div style="font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Features</div>
                <sc-for list="{{pw.features}}" as="pf" hint-placeholder-count="1">
                  <div style="display:flex;gap:6px;margin-bottom:5px">
                    <input value="{{pf.name.val}}" sc-camel-on-change="{{pf.name.on}}" placeholder="Feature" style="flex:1;min-width:90px;border:1px solid var(--border2);border-radius:7px;padding:6px 8px;font-size:12.5px;background:var(--input-bg)">
                    <input value="{{pf.desc.val}}" sc-camel-on-change="{{pf.desc.on}}" placeholder="What it does" style="flex:2;min-width:120px;border:1px solid var(--border2);border-radius:7px;padding:6px 8px;font-size:12.5px;background:var(--input-bg)">
                    <button sc-camel-on-click="{{pf.remove}}" style="border:none;background:none;color:#b3ab9d;cursor:pointer;font-size:12px;padding:2px" style-hover="color:#A33B3B">✕</button>
                  </div>
                </sc-for>
                <button sc-camel-on-click="{{pw.addFeature}}" style="border:1px dashed var(--border2);background:none;color:var(--muted);border-radius:7px;padding:5px 10px;font-size:11.5px;cursor:pointer" style-hover="border-color:var(--accent,#8C5A2B);color:var(--accent,#8C5A2B)">+ Add feature</button>
              </div>
            </div>
          </sc-for>
        </div>
        <button sc-camel-on-click="{{addPrimaryWeapon}}" style="margin-bottom:14px;border:1px dashed var(--border2);background:none;color:var(--muted);border-radius:8px;padding:7px 14px;font-size:12.5px;cursor:pointer" style-hover="border-color:var(--accent,#8C5A2B);color:var(--accent,#8C5A2B)">+ Add primary weapon</button>
        <div style="font-size:11px;color:var(--muted);margin-bottom:8px">Secondary</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px">
          <sc-for list="{{secondaryWeapons}}" as="sw" hint-placeholder-count="1">
            <div style="border:1px solid var(--border3);border-radius:10px;padding:10px 12px">
              <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                <label style="display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--muted);cursor:pointer"><input type="checkbox" checked="{{sw.equipped.val}}" sc-camel-on-change="{{sw.equipped.on}}">Equipped</label>
                <input value="{{sw.name.val}}" sc-camel-on-change="{{sw.name.on}}" placeholder="Weapon name" style="flex:2;min-width:110px;border:1px solid var(--border2);border-radius:8px;padding:7px 9px;font-size:13.5px;background:var(--input-bg)">
                <sc-raw-select value="{{sw.range.val}}" sc-camel-on-change="{{sw.range.on}}" style="border:1px solid var(--border2);border-radius:8px;padding:7px;font-size:13px;background:var(--input-bg)">
                  <option value="Melee">Melee</option><option value="Very Close">Very Close</option><option value="Close">Close</option><option value="Far">Far</option><option value="Very Far">Very Far</option>
                </sc-raw-select>
                <input value="{{sw.damage.val}}" sc-camel-on-change="{{sw.damage.on}}" placeholder="Damage" style="flex:1;min-width:100px;border:1px solid var(--border2);border-radius:8px;padding:7px 9px;font-size:13px;background:var(--input-bg)">
                <button sc-camel-on-click="{{sw.remove}}" style="border:none;background:none;color:#b3ab9d;cursor:pointer;font-size:13px;padding:4px" style-hover="color:#A33B3B">✕</button>
              </div>
              <div style="margin-top:8px">
                <div style="font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Features</div>
                <sc-for list="{{sw.features}}" as="sf" hint-placeholder-count="1">
                  <div style="display:flex;gap:6px;margin-bottom:5px">
                    <input value="{{sf.name.val}}" sc-camel-on-change="{{sf.name.on}}" placeholder="Feature" style="flex:1;min-width:90px;border:1px solid var(--border2);border-radius:7px;padding:6px 8px;font-size:12.5px;background:var(--input-bg)">
                    <input value="{{sf.desc.val}}" sc-camel-on-change="{{sf.desc.on}}" placeholder="What it does" style="flex:2;min-width:120px;border:1px solid var(--border2);border-radius:7px;padding:6px 8px;font-size:12.5px;background:var(--input-bg)">
                    <button sc-camel-on-click="{{sf.remove}}" style="border:none;background:none;color:#b3ab9d;cursor:pointer;font-size:12px;padding:2px" style-hover="color:#A33B3B">✕</button>
                  </div>
                </sc-for>
                <button sc-camel-on-click="{{sw.addFeature}}" style="border:1px dashed var(--border2);background:none;color:var(--muted);border-radius:7px;padding:5px 10px;font-size:11.5px;cursor:pointer" style-hover="border-color:var(--accent,#8C5A2B);color:var(--accent,#8C5A2B)">+ Add feature</button>
              </div>
            </div>
          </sc-for>
        </div>
        <button sc-camel-on-click="{{addSecondaryWeapon}}" style="border:1px dashed var(--border2);background:none;color:var(--muted);border-radius:8px;padding:7px 14px;font-size:12.5px;cursor:pointer" style-hover="border-color:var(--accent,#8C5A2B);color:var(--accent,#8C5A2B)">+ Add secondary weapon</button>
      </div>
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px">
        <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Armor</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <input value="{{armorName.val}}" sc-camel-on-change="{{armorName.on}}" placeholder="Armor name (e.g. Leather armor)" style="flex:2;min-width:150px;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--input-bg)">
          <div style="flex:none;width:100px">
            <input type="number" value="{{armorScoreVal.val}}" sc-camel-on-change="{{armorScoreVal.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--input-bg)">
          </div>
        </div>
        <div style="font-size:11.5px;color:var(--muted);margin-top:6px">Armor score also drives the Play tab &amp; Edit tab defense stats.</div>
      </div>
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px">
        <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Gold</div>
        <div style="display:flex;gap:10px">
          <sc-for list="{{goldList}}" as="g" hint-placeholder-count="3">
            <div style="flex:1;border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center">
              <div style="font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted)">{{g.label}}</div>
              <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:6px">
                <button sc-camel-on-click="{{g.dec}}" style="width:26px;height:26px;border:1px solid var(--border2);background:var(--panel);border-radius:7px;cursor:pointer">−</button>
                <span style="font-family:'Spectral',serif;font-size:20px;font-weight:600;min-width:22px">{{g.value}}</span>
                <button sc-camel-on-click="{{g.inc}}" style="width:26px;height:26px;border:1px solid var(--border2);background:var(--panel);border-radius:7px;cursor:pointer">+</button>
              </div>
            </div>
          </sc-for>
        </div>
      </div>
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px">
        <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Inventory</div>
        <textarea value="{{invVal}}" sc-camel-on-change="{{setInv}}" placeholder="Weapons, armor, supplies…" style="width:100%;box-sizing:border-box;min-height:180px;border:1px solid var(--border2);border-radius:8px;padding:10px 12px;font-size:13.5px;line-height:1.5;background:var(--input-bg);resize:vertical"></textarea>
      </div>
    </div>
    <div style="flex:1;min-width:300px">
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px">
        <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Session notes</div>
        <textarea value="{{notesVal}}" sc-camel-on-change="{{setNotes}}" placeholder="NPCs, quests, loose threads…" style="width:100%;box-sizing:border-box;min-height:320px;border:1px solid var(--border2);border-radius:8px;padding:10px 12px;font-size:13.5px;line-height:1.5;background:var(--input-bg);resize:vertical"></textarea>
      </div>
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px;margin-top:16px">
        <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Character development</div>
        <p style="font-size:12px;color:var(--muted);margin:0 0 8px;line-height:1.5">Track how your character is growing — decisions, turning points, what they've learned about themselves.</p>
        <textarea value="{{devNotesVal}}" sc-camel-on-change="{{setDevNotes}}" placeholder="Growth, choices, turning points…" style="width:100%;box-sizing:border-box;min-height:200px;border:1px solid var(--border2);border-radius:8px;padding:10px 12px;font-size:13.5px;line-height:1.5;background:var(--input-bg);resize:vertical"></textarea>
      </div>
    </div>
  </div>
  </sc-if>

  <!-- ======== COMPANION TAB ======== -->
  <sc-if value="{{tabComp}}" hint-placeholder-val="{{ false }}">
  <div data-screen-label="Companion">
    <sc-if value="{{noComp}}" hint-placeholder-val="{{ false }}">
      <div style="border:2px dashed var(--border2);border-radius:12px;padding:40px;text-align:center;color:var(--muted);max-width:520px">
        <div style="font-family:'Spectral',serif;font-size:19px;color:#4d463a;margin-bottom:6px">No companion yet</div>
        <div style="font-size:13px;margin-bottom:16px">Beastbound rangers fight alongside an animal companion.</div>
        <button sc-camel-on-click="{{addComp}}" style="border:none;background:var(--accent,#8C5A2B);color:#fff;border-radius:8px;padding:10px 20px;font-size:14px;cursor:pointer">Add companion</button>
      </div>
    </sc-if>
    <sc-if value="{{hasComp}}" hint-placeholder-val="{{ false }}">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;align-items:center">
        <sc-for list="{{companionChips}}" as="cc" hint-placeholder-count="2">
          <button sc-camel-on-click="{{cc.select}}" style="border:1px solid {{cc.bc}};background:{{cc.bg}};color:{{cc.fg}};border-radius:999px;padding:7px 16px;font-size:13px;cursor:pointer">{{cc.name}}</button>
        </sc-for>
        <button sc-camel-on-click="{{addComp}}" style="border:1px dashed var(--border2);background:none;color:var(--muted);border-radius:999px;padding:7px 16px;font-size:13px;cursor:pointer" style-hover="border-color:var(--accent,#8C5A2B);color:var(--accent,#8C5A2B)">+ Add companion</button>
        <div style="position:relative">
          <button sc-camel-on-click="{{toggleCreatureImport}}" style="border:1px dashed var(--border2);background:none;color:var(--muted);border-radius:999px;padding:7px 16px;font-size:13px;cursor:pointer" style-hover="border-color:var(--accent,#8C5A2B);color:var(--accent,#8C5A2B)">+ From creature</button>
          <sc-if value="{{creatureImportOpen}}" hint-placeholder-val="{{ false }}">
            <div style="position:absolute;top:calc(100% + 6px);left:0;z-index:50;min-width:220px;background:var(--panel);border:1px solid var(--border2);border-radius:10px;box-shadow:0 8px 24px rgba(38,34,27,0.18);padding:8px;display:flex;flex-direction:column;gap:2px">
              <sc-if value="{{hasCreatures}}" hint-placeholder-val="{{ false }}">
                <sc-for list="{{creaturePickList}}" as="cp2" hint-placeholder-count="2">
                  <button sc-camel-on-click="{{cp2.pick}}" style="border:none;background:none;text-align:left;border-radius:7px;padding:9px 12px;font-size:13.5px;cursor:pointer" style-hover="background:var(--highlight-bg)">{{cp2.name}}</button>
                </sc-for>
              </sc-if>
              <sc-if value="{{noCreatures}}" hint-placeholder-val="{{ false }}">
                <div style="font-size:12.5px;color:var(--muted);padding:8px 10px">No saved creatures yet — add one on the Creatures page.</div>
              </sc-if>
            </div>
          </sc-if>
        </div>
      </div>
      <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start">
        <div style="flex:1;min-width:300px;display:flex;flex-direction:column;gap:16px">
          <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px;display:flex;flex-direction:column;gap:14px">
            <div style="display:flex;gap:14px;align-items:center">
              <div style="flex:none;width:72px;height:72px">
                <x-import component-from-global-scope="image-slot" from="c6b115b3-1cc5-46ce-8deb-17fd610f11d8#/image-slot.js" id="{{compPortraitId}}" shape="circle" placeholder="Portrait" style="width:72px;height:72px" hint-size="72px,72px"></x-import>
              </div>
              <div style="flex:1"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Name</div><input value="{{comp.name.val}}" sc-camel-on-change="{{comp.name.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-family:'Spectral',serif;font-size:17px;font-weight:600;background:var(--input-bg)"></div>
              <div style="flex:none;text-align:center;background:var(--accent,#8C5A2B);color:#fff;border-radius:10px;padding:6px 12px"><div style="font-size:9px;letter-spacing:0.1em;text-transform:uppercase;opacity:0.8">Level</div><div style="font-family:'Spectral',serif;font-size:18px;font-weight:600;line-height:1">{{compLevel}}</div></div>
            </div>
            <div style="display:flex;gap:10px">
              <div style="flex:1"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Difficulty</div><input type="number" value="{{comp.difficulty.val}}" sc-camel-on-change="{{comp.difficulty.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:14px;background:var(--input-bg)"></div>
              <div style="flex:1"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Movement</div><input value="{{comp.movement.val}}" sc-camel-on-change="{{comp.movement.on}}" placeholder="e.g. 40'" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:14px;background:var(--input-bg)"></div>
            </div>
            <button sc-camel-on-click="{{levelUpComp}}" style="border:none;background:var(--accent,#8C5A2B);color:#fff;border-radius:8px;padding:9px 16px;font-size:13.5px;font-weight:600;cursor:pointer">Level up → +1 Difficulty, +1 HP{{compLevelUpHint}}</button>
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#A33B3B;margin-bottom:7px">
                <span style="display:flex;align-items:center;gap:8px;font-weight:600"><span>HP</span><input value="{{comp.hpLabel.val}}" sc-camel-on-change="{{comp.hpLabel.on}}" placeholder="Moderate" style="width:84px;border:1px solid var(--border2);border-radius:6px;padding:4px 6px;font-size:12px;text-transform:none;letter-spacing:normal;background:var(--input-bg)"></span>
                <span style="display:flex;align-items:center;gap:6px;text-transform:none;letter-spacing:normal"><span>{{compHpMarked}} /</span><input type="number" value="{{comp.hpMax.val}}" sc-camel-on-change="{{comp.hpMax.on}}" style="width:44px;border:1px solid var(--border2);border-radius:6px;padding:4px 6px;font-size:12.5px;background:var(--input-bg)"></span>
              </div>
              <div style="display:flex;gap:7px;flex-wrap:wrap"><sc-for list="{{compHpPips}}" as="p" hint-placeholder-count="5"><div sc-camel-on-click="{{p.click}}" style="width:24px;height:24px;cursor:pointer;border:2px solid #A33B3B;background:{{p.bg}};border-radius:6px"></div></sc-for></div>
            </div>
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#5B4A8A;margin-bottom:7px">
                <span style="font-weight:600">Stress</span>
                <span style="display:flex;align-items:center;gap:6px;text-transform:none;letter-spacing:normal"><span>{{compStMarked}} /</span><input type="number" value="{{comp.stressMax.val}}" sc-camel-on-change="{{comp.stressMax.on}}" style="width:44px;border:1px solid var(--border2);border-radius:6px;padding:4px 6px;font-size:12.5px;background:var(--input-bg)"></span>
              </div>
              <div style="display:flex;gap:7px;flex-wrap:wrap"><sc-for list="{{compStPips}}" as="p" hint-placeholder-count="3"><div sc-camel-on-click="{{p.click}}" style="width:24px;height:24px;cursor:pointer;border:2px solid #5B4A8A;background:{{p.bg}};border-radius:999px"></div></sc-for></div>
              <div style="font-size:12px;color:var(--muted);margin-top:6px">When all HP or Stress is marked, the companion is defeated or must retreat.</div>
            </div>
            <button sc-camel-on-click="{{removeComp}}" style="align-self:flex-start;border:1px solid var(--border2);background:var(--panel);border-radius:8px;padding:7px 14px;font-size:12.5px;color:var(--muted);cursor:pointer" style-hover="border-color:#A33B3B;color:#A33B3B">Remove companion</button>
          </div>
          <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px">
            <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Notes</div>
            <textarea value="{{comp.notes.val}}" sc-camel-on-change="{{comp.notes.on}}" rows="4" placeholder="Flavor, appearance, how it was acquired…" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13px;background:var(--input-bg);font-family:inherit;resize:vertical"></textarea>
          </div>
          <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px">
            <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Backstory (optional)</div>
            <textarea value="{{comp.backstory.val}}" sc-camel-on-change="{{comp.backstory.on}}" rows="4" placeholder="How you met, their history…" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13px;background:var(--input-bg);font-family:inherit;resize:vertical"></textarea>
          </div>
        </div>
        <div style="flex:1.2;min-width:320px;display:flex;flex-direction:column;gap:16px">
          <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px">
            <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Attacks</div>
            <div style="display:flex;flex-direction:column;gap:10px">
              <sc-for list="{{compAttacks}}" as="atk" hint-placeholder-count="2">
                <div style="border:1px solid var(--border3);border-radius:10px;padding:10px 12px">
                  <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start">
                    <input value="{{atk.name.val}}" sc-camel-on-change="{{atk.name.on}}" placeholder="Attack name" style="flex:1.4;min-width:120px;border:1px solid var(--border2);border-radius:7px;padding:7px 9px;font-size:13.5px;font-weight:600;background:var(--input-bg)">
                    <input value="{{atk.range.val}}" sc-camel-on-change="{{atk.range.on}}" placeholder="Range" style="flex:1;min-width:80px;border:1px solid var(--border2);border-radius:7px;padding:7px 9px;font-size:13px;background:var(--input-bg)">
                    <input value="{{atk.formula.val}}" sc-camel-on-change="{{atk.formula.on}}" placeholder="Damage" style="flex:1;min-width:110px;border:1px solid var(--border2);border-radius:7px;padding:7px 9px;font-size:13px;background:var(--input-bg)">
                    <button sc-camel-on-click="{{atk.remove}}" style="border:none;background:none;color:#b3ab9d;cursor:pointer;font-size:13px;padding:6px" style-hover="color:#A33B3B">✕</button>
                  </div>
                  <textarea value="{{atk.effect.val}}" sc-camel-on-change="{{atk.effect.on}}" rows="2" placeholder="Effect (optional)" style="width:100%;box-sizing:border-box;margin-top:8px;border:1px solid var(--border2);border-radius:7px;padding:7px 9px;font-size:12.5px;background:var(--input-bg);font-family:inherit;resize:vertical"></textarea>
                </div>
              </sc-for>
            </div>
            <button sc-camel-on-click="{{addCompAttack}}" style="margin-top:10px;border:1px dashed var(--border2);background:none;color:var(--muted);border-radius:8px;padding:7px 14px;font-size:12.5px;cursor:pointer" style-hover="border-color:var(--accent,#8C5A2B);color:var(--accent,#8C5A2B)">+ Add attack</button>
          </div>
          <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px">
            <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Features</div>
            <div style="display:flex;flex-direction:column;gap:10px">
              <sc-for list="{{compFeatures}}" as="ft" hint-placeholder-count="3">
                <div style="border:1px solid var(--border3);border-radius:10px;padding:10px 12px">
                  <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start">
                    <sc-raw-select value="{{ft.type.val}}" sc-camel-on-change="{{ft.type.on}}" style="border:1px solid var(--border2);border-radius:7px;padding:7px 8px;font-size:12px;background:var(--input-bg)">
                      <option value="Passive">Passive</option>
                      <option value="Action">Action</option>
                      <option value="Reaction">Reaction</option>
                    </sc-raw-select>
                    <input value="{{ft.name.val}}" sc-camel-on-change="{{ft.name.on}}" placeholder="Feature name" style="flex:1;min-width:140px;border:1px solid var(--border2);border-radius:7px;padding:7px 9px;font-size:13.5px;font-weight:600;background:var(--input-bg)">
                    <button sc-camel-on-click="{{ft.remove}}" style="border:none;background:none;color:#b3ab9d;cursor:pointer;font-size:13px;padding:6px" style-hover="color:#A33B3B">✕</button>
                  </div>
                  <textarea value="{{ft.desc.val}}" sc-camel-on-change="{{ft.desc.on}}" rows="2" placeholder="What it does" style="width:100%;box-sizing:border-box;margin-top:8px;border:1px solid var(--border2);border-radius:7px;padding:7px 9px;font-size:12.5px;background:var(--input-bg);font-family:inherit;resize:vertical"></textarea>
                </div>
              </sc-for>
            </div>
            <button sc-camel-on-click="{{addCompFeature}}" style="margin-top:10px;border:1px dashed var(--border2);background:none;color:var(--muted);border-radius:8px;padding:7px 14px;font-size:12.5px;cursor:pointer" style-hover="border-color:var(--accent,#8C5A2B);color:var(--accent,#8C5A2B)">+ Add feature</button>
          </div>
        </div>
      </div>
    </sc-if>
  </div>
  </sc-if>

  <!-- ======== WILDSHAPE TAB ======== -->
  <sc-if value="{{tabWildshape}}" hint-placeholder-val="{{ false }}">
  <div data-screen-label="Wildshape" style="display:flex;flex-direction:column;gap:16px;max-width:820px">
    <sc-if value="{{wildshapeActiveBanner}}" hint-placeholder-val="{{ false }}">
      <div style="background:var(--highlight-bg);border:1px solid var(--accent,#8C5A2B);border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <div style="flex:1"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:2px">Currently shifted</div><div style="font-family:'Spectral',serif;font-size:20px;font-weight:600">{{wildshapeActiveName}}</div></div>
        <button sc-camel-on-click="{{revertWildshape}}" style="border:none;background:var(--accent,#8C5A2B);color:#fff;border-radius:8px;padding:9px 18px;font-size:13.5px;font-weight:600;cursor:pointer">Revert to normal form</button>
      </div>
    </sc-if>
    <div style="display:flex;flex-direction:column;gap:12px">
      <sc-for list="{{wildshapeForms}}" as="wf" hint-placeholder-count="3">
        <div style="background:var(--panel);border:1px solid {{wf.bc}};border-radius:12px;padding:16px 18px">
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <div style="flex:2;min-width:160px"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Form</div><input value="{{wf.name.val}}" sc-camel-on-change="{{wf.name.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-family:'Spectral',serif;font-size:15px;font-weight:600;background:var(--input-bg)"></div>
            <div style="flex:none;width:70px"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Tier</div><input type="number" value="{{wf.tier.val}}" sc-camel-on-change="{{wf.tier.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:14px;background:var(--input-bg)"></div>
            <div style="flex:none;width:80px"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Evasion</div><input type="number" value="{{wf.evasion.val}}" sc-camel-on-change="{{wf.evasion.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:14px;background:var(--input-bg)"></div>
            <div style="flex:none;width:90px"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Stress cost</div><input type="number" value="{{wf.stressCost.val}}" sc-camel-on-change="{{wf.stressCost.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:14px;background:var(--input-bg)"></div>
          </div>
          <div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap">
            <div style="flex:1;min-width:180px"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Attack</div><input value="{{wf.attack.val}}" sc-camel-on-change="{{wf.attack.on}}" placeholder="e.g. Bite (Melee, Instinct)" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--input-bg)"></div>
            <div style="flex:none;width:120px"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Damage</div><input value="{{wf.damage.val}}" sc-camel-on-change="{{wf.damage.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--input-bg)"></div>
          </div>
          <div style="margin-top:10px"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Feature</div><input value="{{wf.feature.val}}" sc-camel-on-change="{{wf.feature.on}}" placeholder="What this form gains or can do" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--input-bg)"></div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:12px;border-top:1px solid var(--border3);padding-top:12px">
            <button sc-camel-on-click="{{wf.transform}}" disabled="{{wf.isActive}}" style="border:none;background:{{wf.btnBg}};color:#fff;border-radius:8px;padding:8px 18px;font-size:13px;font-weight:600;cursor:pointer;opacity:{{wf.btnOpacity}}">{{wf.btnLabel}}</button>
            <div style="flex:1"></div>
            <button sc-camel-on-click="{{wf.remove}}" style="border:none;background:none;color:#b3ab9d;cursor:pointer;font-size:13px;padding:4px" style-hover="color:#A33B3B">Remove form</button>
          </div>
        </div>
      </sc-for>
    </div>
    <button sc-camel-on-click="{{addWildshapeForm}}" style="align-self:flex-start;border:1px dashed var(--border2);background:none;color:var(--muted);border-radius:8px;padding:9px 16px;font-size:13px;cursor:pointer" style-hover="border-color:var(--accent,#8C5A2B);color:var(--accent,#8C5A2B)">+ Add beastform</button>
  </div>
  </sc-if>

  <!-- ======== TRANSFORMATION TAB (Void) ======== -->
  <sc-if value="{{tabTransformation}}" hint-placeholder-val="{{ false }}">
  <div data-screen-label="Transformation" style="display:flex;flex-direction:column;gap:16px;max-width:820px">
    <sc-if value="{{transformationActiveBanner}}" hint-placeholder-val="{{ false }}">
      <div style="background:var(--highlight-bg);border:1px solid var(--accent,#8C5A2B);border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <div style="flex:1"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:2px">Currently transformed</div><div style="font-family:'Spectral',serif;font-size:20px;font-weight:600">{{transformationActiveName}}</div></div>
        <button sc-camel-on-click="{{revertTransformation}}" style="border:none;background:var(--accent,#8C5A2B);color:#fff;border-radius:8px;padding:9px 18px;font-size:13.5px;font-weight:600;cursor:pointer">Revert to normal form</button>
      </div>
    </sc-if>
    <div style="display:flex;flex-direction:column;gap:12px">
      <sc-for list="{{transformationForms}}" as="tf" hint-placeholder-count="6">
        <div style="background:var(--panel);border:1px solid {{tf.bc}};border-radius:12px;padding:16px 18px">
          <sc-if value="{{tf.pendingBadge}}" hint-placeholder-val="{{ false }}">
            <div style="display:inline-block;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:#A33B3B;border:1px solid #A33B3B;border-radius:999px;padding:3px 8px;margin-bottom:10px">{{tf.pendingBadge}}</div>
          </sc-if>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <div style="flex:2;min-width:160px"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Form</div><input value="{{tf.name.val}}" sc-camel-on-change="{{tf.name.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-family:'Spectral',serif;font-size:15px;font-weight:600;background:var(--input-bg)"></div>
            <div style="flex:none;width:70px"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Tier</div><input type="number" value="{{tf.tier.val}}" sc-camel-on-change="{{tf.tier.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:14px;background:var(--input-bg)"></div>
            <div style="flex:none;width:80px"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Evasion</div><input type="number" value="{{tf.evasion.val}}" sc-camel-on-change="{{tf.evasion.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:14px;background:var(--input-bg)"></div>
            <div style="flex:none;width:90px"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Stress cost</div><input type="number" value="{{tf.stressCost.val}}" sc-camel-on-change="{{tf.stressCost.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:14px;background:var(--input-bg)"></div>
          </div>
          <div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap">
            <div style="flex:1;min-width:180px"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Attack</div><input value="{{tf.attack.val}}" sc-camel-on-change="{{tf.attack.on}}" placeholder="e.g. Claws (Melee, Strength)" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--input-bg)"></div>
            <div style="flex:none;width:120px"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Damage</div><input value="{{tf.damage.val}}" sc-camel-on-change="{{tf.damage.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--input-bg)"></div>
          </div>
          <div style="margin-top:10px"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Feature</div><input value="{{tf.feature.val}}" sc-camel-on-change="{{tf.feature.on}}" placeholder="What this form gains or can do" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--input-bg)"></div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:12px;border-top:1px solid var(--border3);padding-top:12px">
            <button sc-camel-on-click="{{tf.transform}}" disabled="{{tf.isActive}}" style="border:none;background:{{tf.btnBg}};color:#fff;border-radius:8px;padding:8px 18px;font-size:13px;font-weight:600;cursor:pointer;opacity:{{tf.btnOpacity}}">{{tf.btnLabel}}</button>
            <div style="flex:1"></div>
            <button sc-camel-on-click="{{tf.remove}}" style="border:none;background:none;color:#b3ab9d;cursor:pointer;font-size:13px;padding:4px" style-hover="color:#A33B3B">Remove form</button>
          </div>
        </div>
      </sc-for>
    </div>
    <button sc-camel-on-click="{{addTransformationForm}}" style="align-self:flex-start;border:1px dashed var(--border2);background:none;color:var(--muted);border-radius:8px;padding:9px 16px;font-size:13px;cursor:pointer" style-hover="border-color:var(--accent,#8C5A2B);color:var(--accent,#8C5A2B)">+ Add transformation</button>
  </div>
  </sc-if>

  <!-- ======== BACKSTORY TAB ======== -->
  <sc-if value="{{tabBackstory}}" hint-placeholder-val="{{ false }}">
  <div data-screen-label="Backstory" style="display:flex;flex-direction:column;gap:16px;max-width:720px">
    <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:20px 22px">
      <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Backstory</div>
      <sc-if value="{{hasBackstory}}" hint-placeholder-val="{{ false }}">
        <div style="font-size:14px;line-height:1.7;white-space:pre-wrap">{{backstoryVal}}</div>
      </sc-if>
      <sc-if value="{{noBackstory}}" hint-placeholder-val="{{ true }}">
        <div style="font-size:13px;color:var(--muted)">No backstory yet — add one from the Edit tab.</div>
      </sc-if>
    </div>
    <sc-if value="{{hasCompBackstory}}" hint-placeholder-val="{{ false }}">
      <div style="background:var(--panel);border:1px solid var(--companion-border);border-radius:12px;padding:20px 22px">
        <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Companion backstory</div>
        <div style="font-size:14px;line-height:1.7;white-space:pre-wrap">{{compBackstoryLine}}</div>
      </div>
    </sc-if>
  </div>
  </sc-if>

  <!-- ======== DOWNTIME TAB ======== -->
  <sc-if value="{{tabDowntime}}" hint-placeholder-val="{{ false }}">
  <div data-screen-label="Downtime" style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start;max-width:900px">
    <div style="flex:1;min-width:320px;background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px">
      <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Long-term downtime moves</div>
      <div style="font-size:12.5px;color:var(--muted);margin-bottom:12px">Between sessions, choose moves to make during downtime.</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <sc-for list="{{downtimeMoves}}" as="dm" hint-placeholder-count="5">
          <div sc-camel-on-click="{{dm.toggle}}" style="display:flex;gap:10px;align-items:flex-start;cursor:pointer;border:1px solid {{dm.bc}};background:{{dm.bg}};border-radius:10px;padding:10px 12px">
            <div style="flex:none;width:20px;height:20px;margin-top:1px;border:2px solid var(--accent,#8C5A2B);background:{{dm.ck}};border-radius:6px;color:#fff;font-size:12px;display:flex;align-items:center;justify-content:center">{{dm.mark}}</div>
            <div><div style="font-size:14px;font-weight:600">{{dm.name}}</div><div style="font-size:12.5px;color:var(--muted);margin-top:1px">{{dm.desc}}</div></div>
          </div>
        </sc-for>
      </div>
      <button sc-camel-on-click="{{clearDowntime}}" style="margin-top:14px;border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:8px 14px;font-size:12.5px;cursor:pointer" style-hover="border-color:var(--text)">Clear selections</button>
    </div>
    <div style="flex:1;min-width:280px;background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px">
      <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Short Rest moves</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <sc-for list="{{shortRestMoves}}" as="sm" hint-placeholder-count="4">
          <div sc-camel-on-click="{{sm.toggle}}" style="display:flex;gap:10px;align-items:flex-start;cursor:pointer;border:1px solid {{sm.bc}};background:{{sm.bg}};border-radius:10px;padding:9px 11px">
            <div style="flex:none;width:18px;height:18px;margin-top:1px;border:2px solid var(--accent,#8C5A2B);background:{{sm.ck}};border-radius:5px;color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center">{{sm.mark}}</div>
            <div><div style="font-size:13px;font-weight:600">{{sm.name}}</div><div style="font-size:11.5px;color:var(--muted);margin-top:1px">{{sm.desc}}</div></div>
          </div>
        </sc-for>
      </div>
      <button sc-camel-on-click="{{shortRest}}" style="margin-top:10px;border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:7px 14px;font-size:12.5px;cursor:pointer" style-hover="border-color:var(--accent,#8C5A2B);color:var(--accent,#8C5A2B)">Clear selections</button>
    </div>
    <div style="flex:1;min-width:280px;background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px">
      <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Long-term project</div>
      <input value="{{projectName}}" sc-camel-on-change="{{setProjectName}}" placeholder="Project name (e.g. building a hideout)" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:14px;background:var(--input-bg);margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);margin-bottom:7px"><span style="font-weight:600">Progress</span><span>{{projectTxt}}</span></div>
      <div style="display:flex;gap:7px;flex-wrap:wrap"><sc-for list="{{projectPips}}" as="p" hint-placeholder-count="6"><div sc-camel-on-click="{{p.click}}" style="width:26px;height:26px;cursor:pointer;border:2px solid var(--accent,#8C5A2B);background:{{p.bg}};border-radius:6px"></div></sc-for></div>
      <sc-if value="{{projectComplete}}" hint-placeholder-val="{{ false }}">
        <div style="margin-top:14px;font-size:13px;color:#4E7A4E;font-weight:600">Project complete — narrate the result with your GM!</div>
      </sc-if>
    </div>
  </div>
  </sc-if>

  <!-- ======== LEVEL TAB ======== -->
  <sc-if value="{{tabLevel}}" hint-placeholder-val="{{ false }}">
  <div data-screen-label="Level up" style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start">
    <div style="flex:1.2;min-width:320px;display:flex;flex-direction:column;gap:16px">
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted)">Current level</div><div style="font-family:'Spectral',serif;font-size:32px;font-weight:600;line-height:1.1">{{c.level}} <span style="font-size:14px;color:var(--muted);font-family:system-ui,sans-serif;font-weight:400">{{tierTxt}}</span></div></div>
        <div style="flex:1"></div>
        <button sc-camel-on-click="{{levelUp}}" style="border:none;background:var(--accent,#8C5A2B);color:#fff;border-radius:8px;padding:11px 22px;font-size:14px;font-weight:600;cursor:pointer">Level up →</button>
      </div>
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px">
        <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Advancements</div>
        <div style="font-size:12.5px;color:var(--muted);margin-bottom:12px">Choose two each time you level up. Taking one applies it to the sheet automatically where possible.</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <sc-for list="{{advList}}" as="ad" hint-placeholder-count="7">
            <div style="display:flex;align-items:center;gap:10px;border:1px solid var(--border3);border-radius:10px;padding:9px 12px">
              <div style="flex:1"><div style="font-size:13.5px;font-weight:600">{{ad.label}}</div><div style="font-size:12px;color:var(--muted)">{{ad.desc}}</div></div>
              <span style="font-size:12px;color:var(--muted)">×{{ad.taken}}</span>
              <button sc-camel-on-click="{{ad.take}}" style="border:1px solid var(--border2);background:var(--panel);border-radius:8px;padding:6px 14px;font-size:12.5px;cursor:pointer" style-hover="border-color:var(--accent,#8C5A2B);color:var(--accent,#8C5A2B)">Take</button>
            </div>
          </sc-for>
        </div>
      </div>
    </div>
    <div style="flex:1;min-width:280px;background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px">
      <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Advancement log</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <sc-for list="{{levelLog}}" as="lg" hint-placeholder-count="3">
          <div style="font-size:13px;color:#4d463a;border-bottom:1px solid var(--border3);padding:5px 0">{{lg.text}}</div>
        </sc-for>
      </div>
    </div>
  </div>

  <!-- Level-up wizard overlay -->
  <sc-if value="{{levelWizOpen}}" hint-placeholder-val="{{ false }}">
    <div style="position:fixed;inset:0;background:rgba(20,18,14,0.45);display:flex;align-items:center;justify-content:center;z-index:100;padding:20px">
      <div style="background:var(--panel);border-radius:16px;width:100%;max-width:520px;max-height:86vh;overflow:auto;padding:28px 30px;box-shadow:0 20px 50px rgba(0,0,0,0.25)">

        <sc-if value="{{wizStep0}}" hint-placeholder-val="{{ false }}">
          <div style="font-family:'Spectral',serif;font-size:22px;font-weight:600;margin-bottom:6px">Level Up</div>
          <p style="font-size:13.5px;color:var(--muted);margin:0 0 18px;line-height:1.5">You're about to go from level {{wizCurLevel}} to level {{wizNewLevel}} ({{wizNewTier}}). Damage thresholds will rise to {{wizNewMajor}} major / {{wizNewSevere}} severe, then you'll choose two advancements.</p>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button sc-camel-on-click="{{wizCancel}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:9px 16px;font-size:13.5px;cursor:pointer">Cancel</button>
            <button sc-camel-on-click="{{wizStart}}" style="border:none;background:var(--accent,#8C5A2B);color:#fff;border-radius:8px;padding:9px 18px;font-size:13.5px;font-weight:600;cursor:pointer">Continue →</button>
          </div>
        </sc-if>

        <sc-if value="{{wizStep1}}" hint-placeholder-val="{{ false }}">
          <div style="font-family:'Spectral',serif;font-size:20px;font-weight:600;margin-bottom:4px">Choose advancement 1 of 2</div>
          <div style="font-size:12px;color:var(--muted);letter-spacing:0.06em;text-transform:uppercase;margin-bottom:14px">Step 2 of 4</div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px">
            <sc-for list="{{wizOptionsA}}" as="op" hint-placeholder-count="8">
              <div sc-camel-on-click="{{op.pick}}" style="border:1px solid {{op.selBc}};background:{{op.selBg}};border-radius:10px;padding:10px 12px;cursor:pointer">
                <div style="font-size:13.5px;font-weight:600">{{op.label}}</div>
                <div style="font-size:12px;color:var(--muted)">{{op.desc}}</div>
              </div>
            </sc-for>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button sc-camel-on-click="{{wizBackTo0}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:9px 16px;font-size:13.5px;cursor:pointer">Back</button>
            <button sc-camel-on-click="{{wizToStep2}}" disabled="{{wizNext1Disabled}}" style="border:none;background:var(--accent,#8C5A2B);color:#fff;border-radius:8px;padding:9px 18px;font-size:13.5px;font-weight:600;cursor:pointer;opacity:{{wizNext1Opacity}}">Next →</button>
          </div>
        </sc-if>

        <sc-if value="{{wizStep2}}" hint-placeholder-val="{{ false }}">
          <div style="font-family:'Spectral',serif;font-size:20px;font-weight:600;margin-bottom:4px">Choose advancement 2 of 2</div>
          <div style="font-size:12px;color:var(--muted);letter-spacing:0.06em;text-transform:uppercase;margin-bottom:14px">Step 3 of 4</div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px">
            <sc-for list="{{wizOptionsB}}" as="op" hint-placeholder-count="8">
              <div sc-camel-on-click="{{op.pick}}" style="border:1px solid {{op.selBc}};background:{{op.selBg}};border-radius:10px;padding:10px 12px;cursor:pointer">
                <div style="font-size:13.5px;font-weight:600">{{op.label}}</div>
                <div style="font-size:12px;color:var(--muted)">{{op.desc}}</div>
              </div>
            </sc-for>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button sc-camel-on-click="{{wizBackTo1}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:9px 16px;font-size:13.5px;cursor:pointer">Back</button>
            <button sc-camel-on-click="{{wizToStep3}}" disabled="{{wizNext2Disabled}}" style="border:none;background:var(--accent,#8C5A2B);color:#fff;border-radius:8px;padding:9px 18px;font-size:13.5px;font-weight:600;cursor:pointer;opacity:{{wizNext2Opacity}}">Review →</button>
          </div>
        </sc-if>

        <sc-if value="{{wizStep3}}" hint-placeholder-val="{{ false }}">
          <div style="font-family:'Spectral',serif;font-size:20px;font-weight:600;margin-bottom:4px">Confirm level {{wizNewLevel}}</div>
          <div style="font-size:12px;color:var(--muted);letter-spacing:0.06em;text-transform:uppercase;margin-bottom:14px">Step 4 of 4</div>
          <div style="border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:18px;display:flex;flex-direction:column;gap:6px">
            <div style="font-size:13.5px"><strong>Thresholds:</strong> {{wizNewMajor}} major / {{wizNewSevere}} severe</div>
            <div style="font-size:13.5px"><strong>Advancement 1:</strong> {{wizPickALabel}}</div>
            <div style="font-size:13.5px"><strong>Advancement 2:</strong> {{wizPickBLabel}}</div>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button sc-camel-on-click="{{wizBackTo1}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:9px 16px;font-size:13.5px;cursor:pointer">Back</button>
            <button sc-camel-on-click="{{wizConfirm}}" style="border:none;background:var(--accent,#8C5A2B);color:#fff;border-radius:8px;padding:9px 18px;font-size:13.5px;font-weight:600;cursor:pointer">Confirm Level Up</button>
          </div>
        </sc-if>

      </div>
    </div>
  </sc-if>
  <sc-if value="{{profDoubleConfirmOpen}}" hint-placeholder-val="{{ false }}">
    <div style="position:fixed;inset:0;background:rgba(20,18,14,0.45);display:flex;align-items:center;justify-content:center;z-index:150;padding:20px">
      <div style="background:var(--panel);border-radius:16px;width:100%;max-width:400px;padding:26px 28px;box-shadow:0 20px 50px rgba(0,0,0,0.25)">
        <div style="font-family:'Spectral',serif;font-size:19px;font-weight:600;margin-bottom:8px">Increase Proficiency again?</div>
        <p style="font-size:13.5px;color:var(--muted);margin:0 0 20px;line-height:1.5">Reaching this level already bumped Proficiency automatically for hitting a new tier. Picking this too means taking it twice this level — that's usually not intended, but it's your call.</p>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button sc-camel-on-click="{{profDoubleConfirmNo}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:9px 16px;font-size:13.5px;cursor:pointer">Cancel</button>
          <button sc-camel-on-click="{{profDoubleConfirmYes}}" style="border:none;background:#A33B3B;color:#fff;border-radius:8px;padding:9px 18px;font-size:13.5px;font-weight:600;cursor:pointer">Yes, add anyway</button>
        </div>
      </div>
    </div>
  </sc-if>
  </sc-if>

  <!-- ======== EDIT TAB ======== -->
  <sc-if value="{{tabEdit}}" hint-placeholder-val="{{ false }}">
  <div data-screen-label="Edit character" style="max-width:680px;display:flex;flex-direction:column;gap:16px">
    <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px;display:flex;flex-direction:column;gap:12px">
      <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted)">Identity</div>
      <div style="display:flex;gap:16px;align-items:center">
        <div style="flex:none;width:88px;height:88px">
          <x-import component-from-global-scope="image-slot" from="c6b115b3-1cc5-46ce-8deb-17fd610f11d8#/image-slot.js" id="portrait-{{c.id}}" shape="circle" placeholder="Portrait" style="width:88px;height:88px" hint-size="88px,88px"></x-import>
        </div>
        <div style="font-size:12.5px;color:var(--muted);line-height:1.5">Drag an image here or click to upload a portrait. It shows next to your name at the top of the sheet.</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">Backstory</div>
        <textarea value="{{ed.backstory.val}}" sc-camel-on-change="{{ed.backstory.on}}" rows="6" placeholder="Where they come from, what shaped them, ties to the party…" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:10px 12px;font-size:13.5px;line-height:1.5;background:var(--input-bg);resize:vertical;font-family:inherit"></textarea>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div style="flex:2;min-width:160px"><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Name</div><input value="{{ed.name.val}}" sc-camel-on-change="{{ed.name.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:14px;background:var(--input-bg)"></div>
        <div style="flex:1;min-width:100px"><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Pronouns</div><input value="{{ed.pronouns.val}}" sc-camel-on-change="{{ed.pronouns.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:14px;background:var(--input-bg)"></div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div style="flex:1;min-width:130px"><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Class</div><input value="{{ed.klass.val}}" sc-camel-on-change="{{ed.klass.on}}" list="class-options" placeholder="Leave blank to start classless" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:14px;background:var(--input-bg)">
          <datalist id="class-options"><sc-for list="{{classOptions}}" as="copt" hint-placeholder-count="9"><option value="{{copt}}"></option></sc-for></datalist>
        </div>
        <div style="flex:1;min-width:130px"><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Subclass</div><input value="{{ed.subclass.val}}" sc-camel-on-change="{{ed.subclass.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:14px;background:var(--input-bg)"></div>
        <button sc-camel-on-click="{{clearClass}}" style="flex:none;align-self:flex-end;border:1px solid var(--border2);background:var(--panel);color:var(--muted);border-radius:8px;padding:8px 12px;font-size:12.5px;cursor:pointer" style-hover="border-color:#A33B3B;color:#A33B3B">Clear class</button>
      </div>
      <div style="border-top:1px dashed var(--border2);padding-top:12px">
        <div style="font-size:11px;color:var(--muted);margin-bottom:8px">Homebrew classes</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px">
          <sc-for list="{{customClassList}}" as="hcl" hint-placeholder-count="1">
            <div style="display:inline-flex;align-items:center;gap:8px;border:1px solid var(--border);border-radius:999px;padding:5px 6px 5px 12px;font-size:13px" title="{{hcl.desc}}">
              <span>{{hcl.name}}</span>
              <button sc-camel-on-click="{{hcl.remove}}" style="border:none;background:none;color:var(--muted);cursor:pointer;font-size:13px;padding:2px" style-hover="color:#A33B3B">✕</button>
            </div>
          </sc-for>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <input value="{{newClassName}}" sc-camel-on-change="{{setNewClassName}}" placeholder="Class name" style="flex:1;min-width:120px;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13px;background:var(--input-bg)">
          <input value="{{newClassDesc}}" sc-camel-on-change="{{setNewClassDesc}}" placeholder="Description (optional)" style="flex:2;min-width:160px;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13px;background:var(--input-bg)">
          <button sc-camel-on-click="{{addClass}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer" style-hover="border-color:var(--text)">Add</button>
        </div>
      </div>
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;padding-top:2px"><input type="checkbox" checked="{{isMulticlass}}" sc-camel-on-change="{{toggleMulticlass}}">Multiclass — take a second class</label>
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;padding-top:2px"><input type="checkbox" checked="{{transformationEnabled}}" sc-camel-on-change="{{toggleTransformation}}">Has Transformation forms (Void) — adds a Transformation tab</label>
      <sc-if value="{{isMulticlass}}" hint-placeholder-val="{{ false }}">
        <div style="display:flex;gap:10px;flex-wrap:wrap;border-top:1px dashed var(--border2);padding-top:12px">
          <div style="flex:1;min-width:130px"><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Second class</div><input value="{{ed.klass2.val}}" sc-camel-on-change="{{ed.klass2.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:14px;background:var(--input-bg)"></div>
          <div style="flex:1;min-width:130px"><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Second subclass</div><input value="{{ed.subclass2.val}}" sc-camel-on-change="{{ed.subclass2.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:14px;background:var(--input-bg)"></div>
        </div>
      </sc-if>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div style="flex:1;min-width:130px"><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Ancestry</div><input value="{{ed.ancestry.val}}" sc-camel-on-change="{{ed.ancestry.on}}" list="ancestry-options" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:14px;background:var(--input-bg)">
          <datalist id="ancestry-options"><sc-for list="{{ancestryOptions}}" as="aopt" hint-placeholder-count="18"><option value="{{aopt}}"></option></sc-for></datalist>
        </div>
        <div style="flex:1;min-width:130px"><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Community</div><input value="{{ed.community.val}}" sc-camel-on-change="{{ed.community.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:14px;background:var(--input-bg)"></div>
        <div style="flex:none;width:80px"><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Level</div><input type="number" value="{{ed.level.val}}" sc-camel-on-change="{{ed.level.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:14px;background:var(--input-bg)"></div>
      </div>
      <div style="border-top:1px dashed var(--border2);padding-top:12px">
        <div style="font-size:11px;color:var(--muted);margin-bottom:8px">Homebrew ancestries</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px">
          <sc-for list="{{customAncestryList}}" as="han" hint-placeholder-count="1">
            <div style="display:inline-flex;align-items:center;gap:8px;border:1px solid var(--border);border-radius:999px;padding:5px 6px 5px 12px;font-size:13px" title="{{han.feature}}">
              <span>{{han.name}}</span>
              <button sc-camel-on-click="{{han.remove}}" style="border:none;background:none;color:var(--muted);cursor:pointer;font-size:13px;padding:2px" style-hover="color:#A33B3B">✕</button>
            </div>
          </sc-for>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <input value="{{newAncestryName}}" sc-camel-on-change="{{setNewAncestryName}}" placeholder="Ancestry name" style="flex:1;min-width:120px;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13px;background:var(--input-bg)">
          <input value="{{newAncestryFeature}}" sc-camel-on-change="{{setNewAncestryFeature}}" placeholder="Feature (optional)" style="flex:2;min-width:160px;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13px;background:var(--input-bg)">
          <button sc-camel-on-click="{{addAncestry}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer" style-hover="border-color:var(--text)">Add</button>
        </div>
      </div>
    </div>
    <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px">
      <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:12px">Traits</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:10px">
        <sc-for list="{{traitEdits}}" as="te" hint-placeholder-count="6">
          <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px">{{te.name}}</div><input type="number" value="{{te.val}}" sc-camel-on-change="{{te.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:14px;background:var(--input-bg)"></div>
        </sc-for>
      </div>
    </div>
    <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px">
      <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:12px">Defenses &amp; resources</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px">
        <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Evasion</div><input type="number" value="{{ed.evasion.val}}" sc-camel-on-change="{{ed.evasion.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:14px;background:var(--input-bg)"></div>
        <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Armor score</div><input type="number" value="{{ed.armorScore.val}}" sc-camel-on-change="{{ed.armorScore.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:14px;background:var(--input-bg)"></div>
        <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Proficiency</div><input type="number" value="{{ed.proficiency.val}}" sc-camel-on-change="{{ed.proficiency.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:14px;background:var(--input-bg)"></div>
        <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Major threshold</div><input type="number" value="{{ed.thrMajor.val}}" sc-camel-on-change="{{ed.thrMajor.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:14px;background:var(--input-bg)"></div>
        <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Severe threshold</div><input type="number" value="{{ed.thrSevere.val}}" sc-camel-on-change="{{ed.thrSevere.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:14px;background:var(--input-bg)"></div>
        <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Max HP</div><input type="number" value="{{ed.hpMax.val}}" sc-camel-on-change="{{ed.hpMax.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:14px;background:var(--input-bg)"></div>
        <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Max stress</div><input type="number" value="{{ed.stressMax.val}}" sc-camel-on-change="{{ed.stressMax.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:14px;background:var(--input-bg)"></div>
        <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Armor slots</div><input type="number" value="{{ed.armorMax.val}}" sc-camel-on-change="{{ed.armorMax.on}}" style="width:100%;box-sizing:border-box;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:14px;background:var(--input-bg)"></div>
      </div>
    </div>
    <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px">
      <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:12px">Experiences</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <sc-for list="{{expEdits}}" as="xe" hint-placeholder-count="2">
          <div style="display:flex;flex-direction:column;gap:4px">
            <div style="display:flex;gap:8px;align-items:center">
              <input value="{{xe.name}}" sc-camel-on-change="{{xe.onName}}" placeholder="Experience" style="flex:1;border:1px solid {{xe.borderColor}};border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--input-bg)">
              <input type="number" value="{{xe.bonus}}" sc-camel-on-change="{{xe.onBonus}}" style="width:64px;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--input-bg)">
              <button sc-camel-on-click="{{xe.remove}}" style="border:none;background:none;color:#b3ab9d;cursor:pointer;font-size:14px" style-hover="color:#A33B3B">✕</button>
            </div>
            <sc-if value="{{xe.dupWarning}}" hint-placeholder-val="{{ false }}">
              <div style="font-size:11.5px;color:#A33B3B;padding-left:2px">Another experience already uses this name.</div>
            </sc-if>
          </div>
        </sc-for>
      </div>
      <button sc-camel-on-click="{{addExp}}" style="margin-top:10px;border:1px solid var(--border2);background:var(--panel);border-radius:8px;padding:7px 14px;font-size:13px;cursor:pointer" style-hover="border-color:var(--text)">+ Add experience</button>
    </div>
    <button sc-camel-on-click="{{askDeleteChar}}" style="align-self:flex-start;border:1px solid var(--border2);background:var(--panel);border-radius:8px;padding:9px 16px;font-size:13px;color:var(--muted);cursor:pointer" style-hover="border-color:#A33B3B;color:#A33B3B">Delete this character</button>
    <sc-if value="{{confirmDeleteOpen}}" hint-placeholder-val="{{ false }}">
      <div style="position:fixed;inset:0;background:rgba(20,18,14,0.45);display:flex;align-items:center;justify-content:center;z-index:100;padding:20px">
        <div style="background:var(--panel);border-radius:16px;width:100%;max-width:400px;padding:26px 28px;box-shadow:0 20px 50px rgba(0,0,0,0.25)">
          <div style="font-family:'Spectral',serif;font-size:19px;font-weight:600;margin-bottom:8px">Delete {{c.name}}?</div>
          <p style="font-size:13.5px;color:var(--muted);margin:0 0 20px;line-height:1.5">This permanently removes the character, their companions, and their level-up history. This can't be undone.</p>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button sc-camel-on-click="{{cancelDeleteChar}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:9px 16px;font-size:13.5px;cursor:pointer">Cancel</button>
            <button sc-camel-on-click="{{deleteChar}}" style="border:none;background:#A33B3B;color:#fff;border-radius:8px;padding:9px 18px;font-size:13.5px;font-weight:600;cursor:pointer">Delete</button>
          </div>
        </div>
      </div>
    </sc-if>
  </div>
  </sc-if>

</div>
</sc-if>
`;
