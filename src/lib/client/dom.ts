// 작은 화면 그리기 도우미
type Child = Node | string | number | null | undefined | false;
type Attrs = Record<string, any>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs | null = null,
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const SVGNS = 'http://www.w3.org/2000/svg';
export function s(tag: string, attrs: Attrs = {}, ...children: (Node | string)[]): SVGElement {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, String(v));
  }
  for (const c of children) el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  return el;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function readJSON<T = any>(id: string): T {
  const el = document.getElementById(id);
  return JSON.parse(el?.textContent || '{}');
}

export function photoFigure(p: any, opts: { label?: string; small?: boolean } = {}) {
  if (!p) {
    return h('figure', { class: 'ph ph-missing' }, h('div', { class: 'ph-empty' }, '🖼️', h('span', null, opts.label || '사진 준비 중')));
  }
  return h(
    'figure',
    { class: 'ph' + (opts.small ? ' ph-small' : '') },
    h('img', { src: p.src, alt: p.alt || opts.label || '', loading: 'lazy', decoding: 'async' }),
    opts.label ? h('figcaption', { class: 'ph-label' }, opts.label) : null,
    p.credit ? h('small', { class: 'ph-credit' }, p.credit) : null,
  );
}
