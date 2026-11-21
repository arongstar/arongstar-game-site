// Fraction input widget: boxes for the whole-number part, numerator and denominator,
// typed with an on-screen keypad (no device keyboard pops up on tablets).
import { h } from './cards.js';

/**
 * A group of number boxes that share one keypad.
 * fields: [{ id, label, cls }]
 */
export function createBoxes(fields, { maxDigits = 2, onchange = () => {} } = {}) {
  const values = Object.fromEntries(fields.map((f) => [f.id, '']));
  let active = fields[0].id;
  const boxes = {};
  for (const f of fields) {
    boxes[f.id] = h('button', { class: `num-box ${f.cls ?? ''}`, type: 'button', 'aria-label': f.label, onclick: () => focus(f.id) });
  }
  function render() {
    for (const f of fields) {
      const b = boxes[f.id];
      b.textContent = values[f.id];
      b.classList.toggle('active', active === f.id);
      b.classList.toggle('empty', values[f.id] === '');
      b.setAttribute('aria-label', `${f.label}: ${values[f.id] || '비어 있음'}`);
    }
  }
  function focus(id) {
    active = id;
    group.dispatchEvent(new CustomEvent('boxfocus', { bubbles: true, detail: { group: api } }));
    render();
  }
  function type(key) {
    if (!active) return;
    if (key === 'back') values[active] = values[active].slice(0, -1);
    else if (key === 'next') {
      const i = fields.findIndex((f) => f.id === active);
      active = fields[(i + 1) % fields.length].id;
    } else if (/^\d$/.test(key) && values[active].length < maxDigits) values[active] = (values[active] + key).replace(/^0(\d)/, '$1');
    render();
    onchange(read());
  }
  function read() {
    return Object.fromEntries(fields.map((f) => [f.id, values[f.id] === '' ? null : Number(values[f.id])]));
  }
  function clear() {
    for (const f of fields) values[f.id] = '';
    active = fields[0].id;
    render();
  }
  function setDisabled(on) {
    for (const b of Object.values(boxes)) b.disabled = on;
  }
  const group = h('span', { class: 'box-group' });
  const api = { boxes, type, read, clear, focus, setDisabled, get active() { return active; }, blur() { active = null; render(); }, el: group };
  render();
  return api;
}

/** Answer widget: [whole] n/d */
export function fractionInput({ label = '몫', onchange } = {}) {
  const g = createBoxes([
    { id: 'whole', label: '자연수 부분 (없으면 비워 두세요)', cls: 'whole' },
    { id: 'n', label: '분자', cls: 'num' },
    { id: 'd', label: '분모', cls: 'den' },
  ], { onchange });
  g.el.append(h('span', { class: 'answer-input' },
    h('span', { class: 'ai-label' }, label, ' ='),
    g.boxes.whole,
    h('span', { class: 'frac input-frac' }, h('span', { class: 'frac-n' }, g.boxes.n), h('span', { class: 'frac-d' }, g.boxes.d))));
  g.focus('n');
  return g;
}

/** Small n/d input (lesson 4: the multiplier). */
export function smallFraction(onchange) {
  const g = createBoxes([{ id: 'n', label: '곱하는 분수의 분자', cls: 'num' }, { id: 'd', label: '곱하는 분수의 분모', cls: 'den' }], { onchange });
  g.el.append(h('span', { class: 'frac input-frac small' }, h('span', { class: 'frac-n' }, g.boxes.n), h('span', { class: 'frac-d' }, g.boxes.d)));
  g.blur();
  return g;
}

/** Shared keypad: sends keys to whichever box group was focused last. */
export function keypad(getTarget) {
  const key = (k, label, cls = '') => h('button', { class: `key ${cls}`, type: 'button', 'aria-label': label, onclick: () => getTarget()?.type(k) }, label);
  return h('div', { class: 'keypad', role: 'group', 'aria-label': '숫자 자판' },
    ...['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => key(d, d)),
    key('back', '⌫ 지우기', 'wide-key'), key('0', '0'), key('next', '다음 칸 ▶', 'wide-key'));
}
