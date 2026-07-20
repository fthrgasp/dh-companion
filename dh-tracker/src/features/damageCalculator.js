export function dmgCalc(state, c) {
  const base = parseInt(state.dmgInput, 10);
  if (!c || isNaN(base)) return { txt: 'Enter incoming damage to preview the result.', hp: 0, valid: false };
  let d = base;
  for (const m of c.dmgMods) {
    if (!m.active) continue;
    if (m.type === 'half') d = Math.floor(d / 2);
    if (m.type === 'minus') d -= m.value;
    if (m.type === 'plus') d += m.value;
  }
  d = Math.max(0, d);
  let hp = 0, band = 'None';
  if (d >= c.thresholds.severe) { hp = 3; band = 'Severe'; }
  else if (d >= c.thresholds.major) { hp = 2; band = 'Major'; }
  else if (d >= 1) { hp = 1; band = 'Minor'; }
  let armorNote = '';
  if (state.useArmor && hp > 0 && c.armor.marked < c.armor.max) { hp -= 1; armorNote = ' (armor slot marked)'; }
  const txt = hp === 0 && band === 'None' ? 'Final damage 0 — no Hit Points marked.'
    : 'Final damage ' + d + ' → ' + band + ': mark ' + hp + ' HP' + armorNote + '.';
  return { txt, hp, valid: true };
}
