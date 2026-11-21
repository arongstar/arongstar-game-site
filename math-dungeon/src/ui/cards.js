// Small DOM helpers and card / fraction components.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** Stacked fraction. n and d may be numbers, strings or nodes. */
export function fracView(n, d, cls = '') {
  return h('span', { class: `frac ${cls}`, role: 'math', 'aria-label': `${d}분의 ${n}` }, h('span', { class: 'frac-n' }, n), h('span', { class: 'frac-d' }, d));
}

export function mixedView(w, n, d, cls = '') {
  return h('span', { class: `mixed ${cls}`, 'aria-label': `${w}과 ${d}분의 ${n}` }, h('span', { class: 'mixed-w' }, w), fracView(n, d));
}

/** Render a fraction value { n, d } (reduced, mixed if > 1 unless mixed: false). */
export function valueView(f, { mixed = true } = {}) {
  const g = gcdLocal(f.n, f.d);
  const n = f.n / g, d = f.d / g;
  if (d === 1) return h('span', { class: 'whole-num' }, n);
  if (mixed && n > d) return mixedView(Math.floor(n / d), n % d, d);
  return fracView(n, d);
}
function gcdLocal(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

/** Tokens from the boss generator: string | {f:[n,d]} | {m:[w,n,d]} */
export function tokensView(tokens) {
  return h('span', { class: 'tokens' }, ...tokens.map((t) => typeof t === 'string' ? h('span', null, t) : t.f ? fracView(t.f[0], t.f[1]) : mixedView(t.m[0], t.m[1], t.m[2])));
}

export function numberCard(value, { used = false, onclick } = {}) {
  return h('button', { class: 'num-card' + (used ? ' used' : ''), type: 'button', disabled: used, 'aria-label': `수 카드 ${value}${used ? ', 사용함' : ''}`, onclick }, String(value));
}

/** A slot in the expression: shows the placed card or an empty box. */
export function slotView(value, { active = false, label = '', onclick } = {}) {
  return h('button', { class: 'slot' + (value != null ? ' filled' : '') + (active ? ' active' : ''), type: 'button', 'aria-label': `${label} 칸${value != null ? `: ${value}` : ', 비어 있음'}`, onclick }, value != null ? String(value) : '');
}
