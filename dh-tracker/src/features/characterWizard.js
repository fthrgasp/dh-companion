export const characterWizardMixin = {
  rollTraitArray() {
    const order = ['Agility', 'Strength', 'Finesse', 'Instinct', 'Presence', 'Knowledge'];
    const pool = [2, 1, 1, 0, 0, -1];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    const traits = {};
    order.forEach((k, i) => { traits[k] = pool[i]; });
    return traits;
  },

  newWizard() {
    const wp = this.weaponPresets()[0], ap = this.armorPresets()[0];
    return {
      step: 0, id: 'c' + Date.now(), name: '', pronouns: '', klass: '', subclass: '', ancestry: '', community: '', level: 1, levelHigherOpen: false,
      multiclassEnabled: false, multiKlass: '', multiSubclass: '',
      traits: this.rollTraitArray(), traitsRerolled: false,
      domainCards: [{ name: '', text: '' }, { name: '', text: '' }],
      weaponPreset: wp.id, weaponName: wp.name, weaponRange: wp.range, weaponDamage: wp.damage,
      armorPreset: ap.id, armorName: ap.name, armorScore: ap.score,
      companionEnabled: false, compName: '', compMovement: '', compAttackName: '', compAttackRange: 'Melee', compAttackFormula: '', compBackstory: '',
      compPortraitKey: 'comp-' + Math.random().toString(36).slice(2, 9),
      inventoryText: '',
      exp1: '', exp2: '', background: '', connections: ''
    };
  },

  upWizard(fn) {
    this.setState(s => {
      const w = Object.assign({}, s.wizard);
      fn(w);
      return { wizard: w };
    });
  },

  finishWizard() {
    const w = this.state.wizard;
    if (!w) return;
    const cd = this.classData()[w.klass] || { domains: [], evasion: 10, hp: 6 };
    const base = this.blankChar();
    const level = Math.max(1, Math.min(10, parseInt(w.level, 10) || 1));
    const scale = this.levelScaling(level);
    const backstory = [w.background.trim(), w.connections.trim() && ('Connections: ' + w.connections.trim())].filter(Boolean).join('\n\n');
    const cards = w.domainCards.filter(c => c.name.trim()).map((c, i) => ({
      id: 'k' + (i + 1), name: c.name.trim(), domain: cd.domains[i] || cd.domains[0] || '', level: 1, type: 'Ability', text: c.text.trim(), loadout: true
    }));
    // for a level > 1 character, pad with additional domain cards from the library up to the level's total — the player can swap these via the Cards tab
    const lib = this.effectiveDomainCardLibrary();
    const usedNames = new Set(cards.map(c => c.name));
    for (let i = cards.length; i < scale.domainCardCount; i++) {
      const domain = cd.domains[i % cd.domains.length] || cd.domains[0] || '';
      const options = (lib[domain] || []).filter(o => !usedNames.has(o.name));
      const pick = options[0];
      if (pick) usedNames.add(pick.name);
      cards.push({
        id: 'k' + (i + 1), name: pick ? pick.name : 'Domain card (choose)', domain,
        level: Math.min(level, i + 1), type: pick ? pick.type : 'Ability', text: pick ? pick.text : '', loadout: cards.length < 5
      });
    }
    const experiences = [w.exp1, w.exp2].filter(x => x && x.trim()).map(x => ({ name: x.trim(), bonus: 2 }));
    const companions = [];
    if (w.companionEnabled && w.compName.trim()) {
      const comp = this.defaultCompanion();
      comp.name = w.compName.trim();
      comp.movement = w.compMovement.trim();
      comp.portraitKey = w.compPortraitKey;
      comp.backstory = w.compBackstory.trim();
      if (w.compAttackName.trim() || w.compAttackFormula.trim()) {
        comp.attacks = [{ name: w.compAttackName.trim() || 'Attack', range: w.compAttackRange, formula: w.compAttackFormula.trim(), effect: '' }];
      }
      companions.push(comp);
    }
    const char = Object.assign({}, base, {
      id: w.id,
      name: w.name.trim() || 'New Adventurer',
      pronouns: w.pronouns, ancestry: w.ancestry, community: w.community,
      klass: w.klass, subclass: w.subclass, domains: cd.domains.slice(),
      multiclass: (w.multiclassEnabled && w.multiKlass) ? { klass: w.multiKlass, subclass: w.multiSubclass } : null,
      level, proficiency: scale.proficiency,
      evasion: cd.evasion, traits: w.traits,
      hp: { max: cd.hp + scale.hpBonus, marked: 0 }, stress: { max: 6, marked: 0 }, hope: { max: 6, marked: 2 },
      armor: { max: w.armorScore, marked: 0 }, thresholds: scale.thresholds,
      cards, experiences, backstory, inventory: w.inventoryText,
      weapons: { primary: { name: w.weaponName, range: w.weaponRange, damage: w.weaponDamage }, secondaryEnabled: false, secondary: { name: '', range: 'Melee', damage: '' } },
      equippedArmor: { name: w.armorName, score: w.armorScore }, armorScore: w.armorScore,
      companions, activeCompanion: 0
    });
    this.upAll(chars => chars.push(char));
    this.setState({ wizard: null, screen: 'sheet', activeId: char.id, tab: 'play', dmgInput: '', useArmor: false });
  }
};

export const wizardTemplate = `
<!-- ============ CHARACTER CREATION WIZARD ============ -->
<sc-if value="{{wizardOpen}}" hint-placeholder-val="{{ false }}">
  <div style="position:fixed;inset:0;background:rgba(20,18,14,0.55);display:flex;align-items:center;justify-content:center;z-index:300;padding:20px">
    <div style="background:var(--panel);border-radius:16px;width:100%;max-width:560px;max-height:88vh;overflow:auto;padding:28px 30px;box-shadow:0 24px 60px rgba(0,0,0,0.3);display:flex;flex-direction:column;gap:16px">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <div style="font-family:'Spectral',serif;font-size:22px;font-weight:600">Guided character creation</div>
        <button sc-camel-on-click="{{wizNewCancel}}" style="border:none;background:none;color:var(--muted);cursor:pointer;font-size:16px">✕</button>
      </div>
      <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:var(--accent,#8C5A2B)">{{wizStepLabel}}</div>

      <sc-if value="{{wizIsStep.0}}" hint-placeholder-val="{{ false }}">
        <div style="display:flex;flex-direction:column;gap:14px">
          <div style="font-family:'Spectral',serif;font-size:19px;font-weight:600">What level is this character starting at?</div>
          <div style="font-size:13px;color:var(--muted)">Most new characters start at level 1. If your table is starting higher — joining an existing party, a one-shot, etc. — set it here and everything else (HP, Proficiency, thresholds, domain cards) will be built to match automatically.</div>
          <div style="display:flex;gap:10px">
            <button sc-camel-on-click="{{wizPickLevel1}}" style="flex:1;border:1px solid {{wizLevel1BorderColor}};background:{{wizLevel1Bg}};color:var(--text);border-radius:10px;padding:16px;font-size:15px;font-weight:600;cursor:pointer">Level 1<div style="font-size:12px;font-weight:400;color:var(--muted);margin-top:4px">Standard start</div></button>
            <button sc-camel-on-click="{{wizPickLevelHigher}}" style="flex:1;border:1px solid {{wizLevelHigherBorderColor}};background:{{wizLevelHigherBg}};color:var(--text);border-radius:10px;padding:16px;font-size:15px;font-weight:600;cursor:pointer">Higher level<div style="font-size:12px;font-weight:400;color:var(--muted);margin-top:4px">Set a specific level</div></button>
          </div>
          <sc-if value="{{wizLevelHigherOpen}}" hint-placeholder-val="{{ false }}">
            <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Starting level</div><input type="number" min="2" max="10" value="{{wizLevel}}" sc-camel-on-change="{{wizSetLevel}}" style="width:100px;border:1px solid var(--border2);border-radius:8px;padding:9px 12px;font-size:14px;background:var(--input-bg)"></div>
          </sc-if>
        </div>
      </sc-if>

      <sc-if value="{{wizIsStep.1}}" hint-placeholder-val="{{ false }}">
        <div style="display:flex;flex-direction:column;gap:12px">
          <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Character name</div><input value="{{wizName}}" sc-camel-on-change="{{wizSetName}}" placeholder="Name" style="width:100%;border:1px solid var(--border2);border-radius:8px;padding:9px 12px;font-size:14px;background:var(--input-bg);box-sizing:border-box"></div>
          <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Pronouns</div><input value="{{wizPronouns}}" sc-camel-on-change="{{wizSetPronouns}}" style="width:100%;border:1px solid var(--border2);border-radius:8px;padding:9px 12px;font-size:14px;background:var(--input-bg);box-sizing:border-box"></div>
          <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Class</div>
            <sc-raw-select value="{{wizKlass}}" sc-camel-on-change="{{wizSetKlass}}" style="width:100%;border:1px solid var(--border2);border-radius:8px;padding:9px 12px;font-size:14px;background:var(--input-bg)">
              <option value="">Choose a class…</option>
              <sc-for list="{{wizClassOptions}}" as="ko" hint-placeholder-count="9"><option value="{{ko}}">{{ko}}</option></sc-for>
            </sc-raw-select>
          </div>
          <sc-if value="{{wizHasSubclasses}}" hint-placeholder-val="{{ false }}">
            <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Subclass</div>
              <sc-raw-select value="{{wizSubclass}}" sc-camel-on-change="{{wizSetSubclass}}" style="width:100%;border:1px solid var(--border2);border-radius:8px;padding:9px 12px;font-size:14px;background:var(--input-bg)">
                <option value="">Choose a subclass…</option>
                <sc-for list="{{wizSubclassOptions}}" as="so" hint-placeholder-count="2"><option value="{{so}}">{{so}}</option></sc-for>
              </sc-raw-select>
            </div>
          </sc-if>
        </div>
      </sc-if>

      <sc-if value="{{wizIsStep.2}}" hint-placeholder-val="{{ false }}">
        <div style="display:flex;flex-direction:column;gap:14px">
          <div style="font-size:13px;color:var(--muted)">Multiclassing lets you draw on a second class's domains. Most tables add this at level 2+ — skip it here if you're starting fresh.</div>
          <div style="display:flex;align-items:center;gap:10px">
            <input type="checkbox" checked="{{wizMulticlassEnabled}}" sc-camel-on-change="{{wizToggleMulticlass}}" style="width:18px;height:18px;cursor:pointer">
            <span style="font-size:13.5px">Add a multiclass</span>
          </div>
          <sc-if value="{{wizMulticlassEnabled}}" hint-placeholder-val="{{ false }}">
            <div style="display:flex;flex-direction:column;gap:12px">
              <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Second class</div>
                <sc-raw-select value="{{wizMultiKlass}}" sc-camel-on-change="{{wizSetMultiKlass}}" style="width:100%;border:1px solid var(--border2);border-radius:8px;padding:9px 12px;font-size:14px;background:var(--input-bg)">
                  <option value="">Choose a class…</option>
                  <sc-for list="{{wizMultiClassOptions}}" as="mko" hint-placeholder-count="8"><option value="{{mko}}">{{mko}}</option></sc-for>
                </sc-raw-select>
              </div>
              <sc-if value="{{wizMultiHasSubclasses}}" hint-placeholder-val="{{ false }}">
                <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Second subclass</div>
                  <sc-raw-select value="{{wizMultiSubclass}}" sc-camel-on-change="{{wizSetMultiSubclass}}" style="width:100%;border:1px solid var(--border2);border-radius:8px;padding:9px 12px;font-size:14px;background:var(--input-bg)">
                    <option value="">Choose a subclass…</option>
                    <sc-for list="{{wizMultiSubclassOptions}}" as="mso" hint-placeholder-count="2"><option value="{{mso}}">{{mso}}</option></sc-for>
                  </sc-raw-select>
                </div>
              </sc-if>
            </div>
          </sc-if>
        </div>
      </sc-if>

      <sc-if value="{{wizIsStep.3}}" hint-placeholder-val="{{ false }}">
        <div style="display:flex;flex-direction:column;gap:12px">
          <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Ancestry</div>
            <sc-raw-select value="{{wizAncestry}}" sc-camel-on-change="{{wizSetAncestry}}" style="width:100%;border:1px solid var(--border2);border-radius:8px;padding:9px 12px;font-size:14px;background:var(--input-bg)">
              <option value="">Choose an ancestry…</option>
              <sc-for list="{{wizAncestryOptions}}" as="ao" hint-placeholder-count="18"><option value="{{ao}}">{{ao}}</option></sc-for>
            </sc-raw-select>
          </div>
          <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Community</div>
            <sc-raw-select value="{{wizCommunity}}" sc-camel-on-change="{{wizSetCommunity}}" style="width:100%;border:1px solid var(--border2);border-radius:8px;padding:9px 12px;font-size:14px;background:var(--input-bg)">
              <option value="">Choose a community…</option>
              <sc-for list="{{wizCommunityOptions}}" as="co" hint-placeholder-count="9"><option value="{{co}}">{{co}}</option></sc-for>
            </sc-raw-select>
          </div>
        </div>
      </sc-if>

      <sc-if value="{{wizIsStep.4}}" hint-placeholder-val="{{ false }}">
        <div style="display:flex;flex-direction:column;gap:14px">
          <div style="font-size:13px;color:var(--muted)">Rolled from the array (+2, +1, +1, 0, 0, -1). Edit any value directly if you'd rather set it by hand.</div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">
            <sc-for list="{{wizTraits}}" as="tr" hint-placeholder-count="6">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--border);border-radius:8px;padding:8px 12px">
                <span style="font-size:13.5px">{{tr.name}}</span>
                <input type="number" value="{{tr.val}}" sc-camel-on-change="{{tr.on}}" style="width:64px;border:1px solid var(--border2);border-radius:7px;padding:6px 8px;font-size:14px;text-align:center;background:var(--input-bg)">
              </div>
            </sc-for>
          </div>
          <button sc-camel-on-click="{{wizReroll}}" disabled="{{wizRerollDisabled}}" style="align-self:flex-start;border:1px solid var(--border2);background:var(--panel);border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer">↻ Reroll all (1 free reroll)</button>
        </div>
      </sc-if>

      <sc-if value="{{wizIsStep.5}}" hint-placeholder-val="{{ false }}">
        <div style="display:flex;flex-direction:column;gap:14px">
          <div style="font-size:13px;color:var(--muted)">Note a starting domain card for each of your two class domains.</div>
          <sc-for list="{{wizCards}}" as="dc2" hint-placeholder-count="2">
            <div style="border:1px solid var(--border);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:8px">
              <div style="font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:var(--accent,#8C5A2B)">{{dc2.domainLabel}}</div>
              <sc-if value="{{dc2.hasOptions}}" hint-placeholder-val="{{ false }}">
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                  <sc-for list="{{dc2.options}}" as="opt" hint-placeholder-count="2">
                    <button sc-camel-on-click="{{opt.select}}" style="border:1px solid {{opt.borderColor}};background:var(--panel);color:var(--text);border-radius:999px;padding:6px 12px;font-size:12.5px;cursor:pointer">{{opt.name}}</button>
                  </sc-for>
                </div>
              </sc-if>
              <input value="{{dc2.name}}" sc-camel-on-change="{{dc2.onName}}" placeholder="Card name" style="border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--input-bg);box-sizing:border-box">
              <textarea value="{{dc2.text}}" sc-camel-on-change="{{dc2.onText}}" placeholder="Effect text" rows="2" style="border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13px;background:var(--input-bg);resize:vertical;font-family:inherit;box-sizing:border-box"></textarea>
            </div>
          </sc-for>
        </div>
      </sc-if>

      <sc-if value="{{wizIsStep.6}}" hint-placeholder-val="{{ false }}">
        <div style="display:flex;flex-direction:column;gap:16px">
          <div>
            <div style="font-size:11px;color:var(--muted);margin-bottom:6px">Starting weapon</div>
            <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap">
              <sc-for list="{{wizWeaponPresets}}" as="wp" hint-placeholder-count="3">
                <button sc-camel-on-click="{{wp.select}}" style="border:1px solid {{wp.borderColor}};background:var(--panel);color:var(--text);border-radius:999px;padding:7px 14px;font-size:12.5px;cursor:pointer">{{wp.name}}</button>
              </sc-for>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <input value="{{wizWeaponName}}" sc-camel-on-change="{{wizSetWeaponName}}" placeholder="Name" style="flex:2;min-width:120px;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--input-bg)">
              <input value="{{wizWeaponRange}}" sc-camel-on-change="{{wizSetWeaponRange}}" placeholder="Range" style="flex:1;min-width:90px;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--input-bg)">
              <input value="{{wizWeaponDamage}}" sc-camel-on-change="{{wizSetWeaponDamage}}" placeholder="Damage" style="flex:1;min-width:90px;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--input-bg)">
            </div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--muted);margin-bottom:6px">Starting armor</div>
            <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap">
              <sc-for list="{{wizArmorPresets}}" as="ap2" hint-placeholder-count="3">
                <button sc-camel-on-click="{{ap2.select}}" style="border:1px solid {{ap2.borderColor}};background:var(--panel);color:var(--text);border-radius:999px;padding:7px 14px;font-size:12.5px;cursor:pointer">{{ap2.name}}</button>
              </sc-for>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <input value="{{wizArmorName}}" sc-camel-on-change="{{wizSetArmorName}}" placeholder="Name" style="flex:2;min-width:120px;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--input-bg)">
              <input type="number" value="{{wizArmorScore}}" sc-camel-on-change="{{wizSetArmorScore}}" placeholder="Score" style="flex:1;min-width:70px;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--input-bg)">
            </div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--muted);margin-bottom:6px">Other inventory</div>
            <textarea value="{{wizInventoryText}}" sc-camel-on-change="{{wizSetInventoryText}}" rows="4" placeholder="Rations, rope, trinkets, potions… one item per line" style="width:100%;border:1px solid var(--border2);border-radius:8px;padding:9px 12px;font-size:13.5px;background:var(--input-bg);resize:vertical;font-family:inherit;box-sizing:border-box"></textarea>
          </div>
        </div>
      </sc-if>

      <sc-if value="{{wizIsStep.7}}" hint-placeholder-val="{{ false }}">
        <div style="display:flex;flex-direction:column;gap:14px">
          <div style="font-size:13px;color:var(--muted)">Some archetypes (like Beastbound Rangers) start with an animal companion. Optional for everyone else.</div>
          <div style="display:flex;align-items:center;gap:10px">
            <input type="checkbox" checked="{{wizCompanionEnabled}}" sc-camel-on-change="{{wizToggleCompanion}}" style="width:18px;height:18px;cursor:pointer">
            <span style="font-size:13.5px">Start with a companion</span>
          </div>
          <sc-if value="{{wizCompanionEnabled}}" hint-placeholder-val="{{ false }}">
            <div style="display:flex;gap:14px;align-items:flex-start">
              <div style="flex:none;width:72px;height:72px">
                <x-import component-from-global-scope="image-slot" from="c6b115b3-1cc5-46ce-8deb-17fd610f11d8#/image-slot.js" id="{{wizCompPortraitId}}" shape="circle" placeholder="Portrait" style="width:72px;height:72px" hint-size="72px,72px"></x-import>
              </div>
              <div style="flex:1;display:flex;flex-direction:column;gap:10px">
                <input value="{{wizCompName}}" sc-camel-on-change="{{wizSetCompName}}" placeholder="Companion name" style="border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--input-bg);box-sizing:border-box">
                <input value="{{wizCompMovement}}" sc-camel-on-change="{{wizSetCompMovement}}" placeholder="Species / movement (e.g. Wolf, quick)" style="border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--input-bg);box-sizing:border-box">
                <div style="display:flex;gap:8px">
                  <input value="{{wizCompAttackName}}" sc-camel-on-change="{{wizSetCompAttackName}}" placeholder="Attack name" style="flex:2;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13px;background:var(--input-bg)">
                  <input value="{{wizCompAttackRange}}" sc-camel-on-change="{{wizSetCompAttackRange}}" placeholder="Range" style="flex:1;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13px;background:var(--input-bg)">
                  <input value="{{wizCompAttackFormula}}" sc-camel-on-change="{{wizSetCompAttackFormula}}" placeholder="Damage" style="flex:1;border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13px;background:var(--input-bg)">
                </div>
                <textarea value="{{wizCompBackstory}}" sc-camel-on-change="{{wizSetCompBackstory}}" rows="2" placeholder="Companion backstory (optional)" style="border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:13px;background:var(--input-bg);resize:vertical;font-family:inherit;box-sizing:border-box"></textarea>
              </div>
            </div>
          </sc-if>
        </div>
      </sc-if>

      <sc-if value="{{wizIsStep.8}}" hint-placeholder-val="{{ false }}">
        <div style="display:flex;flex-direction:column;gap:12px">
          <div style="font-size:13px;color:var(--muted)">Name two experiences (each starts at +2).</div>
          <input value="{{wizExp1}}" sc-camel-on-change="{{wizSetExp1}}" placeholder="Experience 1" style="border:1px solid var(--border2);border-radius:8px;padding:9px 12px;font-size:14px;background:var(--input-bg);box-sizing:border-box">
          <input value="{{wizExp2}}" sc-camel-on-change="{{wizSetExp2}}" placeholder="Experience 2" style="border:1px solid var(--border2);border-radius:8px;padding:9px 12px;font-size:14px;background:var(--input-bg);box-sizing:border-box">
        </div>
      </sc-if>

      <sc-if value="{{wizIsStep.9}}" hint-placeholder-val="{{ false }}">
        <div style="display:flex;flex-direction:column;gap:12px">
          <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Background</div>
            <textarea value="{{wizBackground}}" sc-camel-on-change="{{wizSetBackground}}" rows="3" placeholder="Where do they come from? What shaped them?" style="width:100%;border:1px solid var(--border2);border-radius:8px;padding:9px 12px;font-size:13.5px;background:var(--input-bg);resize:vertical;font-family:inherit;box-sizing:border-box"></textarea>
          </div>
          <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Connections to the party</div>
            <textarea value="{{wizConnections}}" sc-camel-on-change="{{wizSetConnections}}" rows="3" placeholder="How do they know the others?" style="width:100%;border:1px solid var(--border2);border-radius:8px;padding:9px 12px;font-size:13.5px;background:var(--input-bg);resize:vertical;font-family:inherit;box-sizing:border-box"></textarea>
          </div>
        </div>
      </sc-if>

      <sc-if value="{{wizIsStep.10}}" hint-placeholder-val="{{ false }}">
        <div style="display:flex;flex-direction:column;gap:14px">
          <div style="font-size:13px;color:var(--muted)">Optional — drag an image on or click to upload a portrait. Skip it and add one later from the sheet.</div>
          <div style="width:140px;height:140px">
            <x-import component-from-global-scope="image-slot" from="c6b115b3-1cc5-46ce-8deb-17fd610f11d8#/image-slot.js" id="{{wizPortraitId}}" shape="circle" placeholder="Portrait" style="width:140px;height:140px" hint-size="140px,140px"></x-import>
          </div>
        </div>
      </sc-if>

      <sc-if value="{{wizIsStep.11}}" hint-placeholder-val="{{ false }}">
        <div style="display:flex;flex-direction:column;gap:8px">
          <div style="font-family:'Spectral',serif;font-size:19px;font-weight:600">{{wizReviewName}}</div>
          <div style="font-size:13px;color:var(--muted)">{{wizReviewLevelLine}}</div>
          <div style="font-size:13px;color:var(--muted)">{{wizReviewLine2}}</div>
          <div style="font-size:13px;color:var(--muted)">{{wizReviewLine3}}</div>
          <sc-if value="{{wizHasMultiReview}}" hint-placeholder-val="{{ false }}">
            <div style="font-size:13px;color:var(--muted)">{{wizReviewLine3b}}</div>
          </sc-if>
          <sc-if value="{{wizHasCompReview}}" hint-placeholder-val="{{ false }}">
            <div style="font-size:13px;color:var(--muted)">{{wizReviewCompLine}}</div>
          </sc-if>
          <div style="font-size:13px;color:var(--text);margin-top:6px">{{wizReviewTraits}}</div>
          <div style="font-size:12.5px;color:var(--muted);margin-top:10px">Review looks good? Create the character to open their sheet — everything here stays editable afterward.</div>
        </div>
      </sc-if>

      <div style="display:flex;justify-content:space-between;gap:8px;margin-top:8px;border-top:1px solid var(--border);padding-top:16px">
        <sc-if value="{{wizIsFirst}}" hint-placeholder-val="{{ false }}"><button sc-camel-on-click="{{wizNewCancel}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:9px 18px;font-size:13.5px;cursor:pointer">Cancel</button></sc-if>
        <sc-if value="{{wizIsNotFirst}}" hint-placeholder-val="{{ false }}"><button sc-camel-on-click="{{wizBack}}" style="border:1px solid var(--border2);background:var(--panel);color:var(--text);border-radius:8px;padding:9px 18px;font-size:13.5px;cursor:pointer">← Back</button></sc-if>
        <sc-if value="{{wizIsNotLast}}" hint-placeholder-val="{{ false }}"><button sc-camel-on-click="{{wizNext}}" disabled="{{wizNextDisabled}}" style="border:none;background:var(--accent,#8C5A2B);color:#fff;border-radius:8px;padding:9px 20px;font-size:13.5px;font-weight:600;cursor:pointer">Next →</button></sc-if>
        <sc-if value="{{wizIsLast}}" hint-placeholder-val="{{ false }}"><button sc-camel-on-click="{{wizFinish}}" style="border:none;background:var(--accent,#8C5A2B);color:#fff;border-radius:8px;padding:9px 20px;font-size:13.5px;font-weight:600;cursor:pointer">Create character</button></sc-if>
      </div>
    </div>
  </div>
</sc-if>
`;
