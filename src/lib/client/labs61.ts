// 6학년 1학기 과학 가상 실험실: 지시약, 산·염기 섞기, 위치 변화, 달리기 경주, 현미경, 남쪽 하늘, 자전, 계절 별자리
import { h, s } from './dom';

const fig = (title: string, ...kids: any[]) => h('figure', { class: 'lab' }, h('figcaption', { class: 'chart-title' }, title), ...kids);
const note = (t: string) => h('small', { class: 'ph-credit' }, t);

// ───────────── 🧪 지시약 실험실 ─────────────
type Sol = { name: string; acid: boolean; cabbage: string; emoji: string };
// 붉은 양배추 지시약 색은 용액의 성질이 강할수록 더 진하게 달라지는 예시 색이에요.
export const SOLUTIONS: Sol[] = [
  { name: '묽은 염산', acid: true, cabbage: '#d81b60', emoji: '⚗️' },
  { name: '식초', acid: true, cabbage: '#e2557a', emoji: '🍶' },
  { name: '레몬즙', acid: true, cabbage: '#e46a8c', emoji: '🍋' },
  { name: '탄산수', acid: true, cabbage: '#b9629c', emoji: '🫧' },
  { name: '빨랫비누 물', acid: false, cabbage: '#3e9d8f', emoji: '🧼' },
  { name: '유리 세정제', acid: false, cabbage: '#4caf50', emoji: '🧴' },
  { name: '석회수', acid: false, cabbage: '#a5c63b', emoji: '🥛' },
  { name: '묽은 수산화 나트륨 용액', acid: false, cabbage: '#e0c53a', emoji: '⚗️' },
];
const IND = ['푸른 리트머스 종이', '붉은 리트머스 종이', '페놀프탈레인 용액', '붉은 양배추 지시약'] as const;
const BLUE = '#3f6fc4', RED = '#d6453d', PINK = '#e7397a', CLEAR = '#e8f4fb', PURPLE = '#7b4fa0';

export function indicatorLab(opt: { solutions?: string[] } | true) {
  const list = opt === true || !opt.solutions ? SOLUTIONS : SOLUTIONS.filter((x) => opt.solutions!.includes(x.name));
  let sol = 0, ind = -1; // 처음에는 지시약을 고르지 않은 상태 (학생이 직접 골라 관찰)
  const svg = s('svg', { viewBox: '0 0 400 200', class: 'lab-svg', role: 'img', 'aria-label': '지시약 실험' });
  svg.append(s('rect', { x: 0, y: 0, width: 400, height: 200, fill: '#f6f3ea' }), s('rect', { x: 0, y: 170, width: 400, height: 30, fill: '#e6dcc6' }));
  // 비커
  const liquid = s('rect', { x: 92, y: 90, width: 96, height: 78, fill: CLEAR });
  svg.append(liquid, s('path', { d: 'M 88 40 L 88 170 L 192 170 L 192 40 M 192 40 L 200 34', fill: 'none', stroke: '#7d93a0', 'stroke-width': 3 }));
  const drop = s('circle', { cx: 140, cy: 60, r: 0, fill: PURPLE });
  svg.append(drop);
  // 리트머스 종이 (처음 색 → 바뀐 색)
  const paperBefore = s('rect', { x: 250, y: 50, width: 34, height: 100, rx: 3 });
  const paperAfter = s('rect', { x: 320, y: 50, width: 34, height: 100, rx: 3 });
  const dot = s('circle', { cx: 337, cy: 100, r: 13 });
  const tBefore = s('text', { x: 267, y: 165, 'text-anchor': 'middle', class: 'lab-t' }, '처음');
  const tAfter = s('text', { x: 337, y: 165, 'text-anchor': 'middle', class: 'lab-t' }, '용액을 묻힘');
  const paperG = s('g'); paperG.append(paperBefore, paperAfter, dot, tBefore, tAfter);
  svg.append(paperG);
  const label = s('text', { x: 140, y: 190, 'text-anchor': 'middle', class: 'lab-t' });
  svg.append(label);
  const result = h('p', { class: 'lab-status', 'aria-live': 'polite' });
  const solBox = h('div', { class: 'lab-mats' });
  const indBox = h('div', { class: 'lab-mats' });
  function draw() {
    const x = list[sol], k = IND[ind];
    label.textContent = `${x.emoji} ${x.name}`;
    let col = CLEAR, text = '';
    if (ind < 0) {
      paperG.setAttribute('opacity', '0');
      liquid.setAttribute('fill', CLEAR); drop.setAttribute('r', '0');
      text = '아래에서 지시약을 골라 보세요.';
    } else if (k === '푸른 리트머스 종이' || k === '붉은 리트머스 종이') {
      const start = k === '푸른 리트머스 종이' ? BLUE : RED;
      const after = x.acid ? RED : BLUE;
      paperG.setAttribute('opacity', '1');
      paperBefore.setAttribute('fill', start); paperAfter.setAttribute('fill', start); dot.setAttribute('fill', after);
      liquid.setAttribute('fill', CLEAR); drop.setAttribute('r', '0');
      text = start === after ? `${k}의 색깔이 변하지 않았어요.` : `${k}가 ${after === RED ? '붉은색' : '푸른색'}으로 변했어요.`;
    } else {
      paperG.setAttribute('opacity', '0');
      col = k === '페놀프탈레인 용액' ? (x.acid ? CLEAR : PINK) : x.cabbage;
      liquid.setAttribute('fill', col); drop.setAttribute('r', '5');
      drop.setAttribute('fill', k === '페놀프탈레인 용액' ? '#ffffff' : PURPLE);
      text = k === '페놀프탈레인 용액'
        ? (x.acid ? '페놀프탈레인 용액을 넣어도 색깔이 변하지 않았어요.' : '페놀프탈레인 용액을 넣었더니 붉은색으로 변했어요.')
        : `붉은 양배추 지시약을 넣었더니 ${x.acid ? '붉은색 계열' : '푸른색·초록색·노란색 계열'}로 변했어요.`;
    }
    result.textContent = text;
    solBox.replaceChildren(h('span', null, '용액: '), ...list.map((y, i) => h('button', { class: 'btn small ghost' + (i === sol ? ' on' : ''), type: 'button', onclick: () => { sol = i; draw(); } }, `${y.emoji} ${y.name}`)));
    indBox.replaceChildren(h('span', null, '지시약: '), ...IND.map((y, i) => h('button', { class: 'btn small ghost' + (i === ind ? ' on' : ''), type: 'button', onclick: () => { ind = i; draw(); } }, y)));
  }
  draw();
  return fig('🧪 지시약 실험실 — 용액과 지시약을 골라 보세요', svg, indBox, solBox, result, note('붉은 양배추 지시약의 색은 이해를 돕는 예시 색이에요. 실제 색은 용액의 진하기에 따라 조금씩 달라요.'));
}

// ───────────── 🧪 산성 용액과 염기성 용액 섞기 ─────────────
// 붉은 양배추 지시약을 넣은 용액에 다른 용액을 조금씩 넣을 때의 색 변화 (예시)
const MIX = ['#d81b60', '#d63a7a', '#c2569a', '#9b5fb0', '#6f63b8', '#4f78b8', '#3e9d8f', '#4caf50', '#8fbe3e', '#c8c43a', '#e0c53a'];
export function mixLab() {
  let base = true; // true: 묽은 염산에 수산화 나트륨 용액 넣기
  let n = 0;
  const svg = s('svg', { viewBox: '0 0 400 190', class: 'lab-svg', role: 'img', 'aria-label': '용액 섞기' });
  svg.append(s('rect', { x: 0, y: 0, width: 400, height: 190, fill: '#f6f3ea' }));
  const liquid = s('rect', { x: 152, y: 80, width: 96, height: 88 });
  svg.append(liquid, s('path', { d: 'M 148 40 L 148 170 L 252 170 L 252 40', fill: 'none', stroke: '#7d93a0', 'stroke-width': 3 }));
  svg.append(s('rect', { x: 192, y: 4, width: 16, height: 30, rx: 4, fill: '#cfd8dc', stroke: '#7d93a0' }));
  const dropEl = s('circle', { cx: 200, cy: 44, r: 0, fill: '#9bb' });
  svg.append(dropEl);
  const count = s('text', { x: 300, y: 100, class: 'lab-t' });
  svg.append(count);
  const status = h('p', { class: 'lab-status', 'aria-live': 'polite' });
  const btnMode = h('button', { class: 'btn small ghost', type: 'button', onclick: () => { base = !base; n = 0; draw(); } });
  function draw() {
    const idx = base ? n : MIX.length - 1 - n;
    liquid.setAttribute('fill', MIX[idx]);
    count.textContent = `넣은 양: ${n}번`;
    btnMode.textContent = base ? '🔄 반대로: 수산화 나트륨 용액에 염산 넣기' : '🔄 반대로: 염산에 수산화 나트륨 용액 넣기';
    const first = base ? '묽은 염산' : '묽은 수산화 나트륨 용액';
    const add = base ? '묽은 수산화 나트륨 용액' : '묽은 염산';
    status.textContent = n === 0
      ? `붉은 양배추 지시약을 넣은 ${first}이에요. [넣기]를 눌러 ${add}을 조금씩 넣어 보세요.`
      : n < MIX.length - 1
        ? `${add}을 넣을수록 색깔이 조금씩 변해요.`
        : `${add}을 많이 넣었더니 처음과 반대 성질의 용액 색깔이 되었어요.`;
  }
  draw();
  return fig('🧪 섞으면 어떻게 될까? (가상 실험)', svg,
    h('div', { class: 'lab-controls' },
      h('button', { class: 'btn small', type: 'button', onclick: () => { if (n < MIX.length - 1) { n++; dropEl.setAttribute('r', '6'); setTimeout(() => dropEl.setAttribute('r', '0'), 250); draw(); } } }, '💧 넣기'),
      h('button', { class: 'btn small ghost', type: 'button', onclick: () => { n = 0; draw(); } }, '처음으로'),
      btnMode),
    status, note('색 변화는 이해를 돕는 예시예요.'));
}

// ───────────── 📍 위치 변화 (좌표판) ─────────────
export type TrackData = { title?: string; w: number; h: number; times: string[]; items: { label: string; emoji: string; pos: [number, number][] }[] };
export function trackLab(d: TrackData) {
  const C = 34, PADL = 34, PADB = 28;
  const W = PADL + d.w * C + 16, H = d.h * C + PADB + 14;
  let t = 0;
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'lab-svg', role: 'img', 'aria-label': '좌표판' });
  svg.append(s('rect', { x: 0, y: 0, width: W, height: H, fill: '#fbfaf5' }));
  const X = (x: number) => PADL + x * C, Y = (y: number) => 10 + (d.h - y) * C;
  for (let x = 0; x <= d.w; x++) {
    svg.append(s('line', { x1: X(x), y1: Y(0), x2: X(x), y2: Y(d.h), stroke: '#dcd6c6' }));
    svg.append(s('text', { x: X(x), y: Y(0) + 18, 'text-anchor': 'middle', class: 'lab-t' }, String(x)));
  }
  for (let y = 0; y <= d.h; y++) {
    svg.append(s('line', { x1: X(0), y1: Y(y), x2: X(d.w), y2: Y(y), stroke: '#dcd6c6' }));
    svg.append(s('text', { x: X(0) - 10, y: Y(y) + 4, 'text-anchor': 'end', class: 'lab-t' }, String(y)));
  }
  const trails = s('g'), marks = s('g');
  svg.append(trails, marks);
  const slider = h('input', { type: 'range', min: 0, max: d.times.length - 1, step: 1, value: 0, class: 'sun-range', 'aria-label': '시간' }) as HTMLInputElement;
  const read = h('div', { class: 'lab-read col' });
  function draw() {
    t = Number(slider.value);
    trails.replaceChildren(); marks.replaceChildren();
    d.items.forEach((it, k) => {
      const color = ['#2f6fb3', '#d6453d', '#2e8b57', '#b8860b'][k % 4];
      const pts = it.pos.slice(0, t + 1).map(([x, y]) => `${X(x)},${Y(y)}`).join(' ');
      if (t > 0) trails.append(s('polyline', { points: pts, fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-dasharray': '5 4' }));
      const [x0, y0] = it.pos[0];
      marks.append(s('circle', { cx: X(x0), cy: Y(y0), r: 5, fill: '#fff', stroke: color, 'stroke-width': 2 }));
      const [x, y] = it.pos[t];
      marks.append(s('text', { x: X(x), y: Y(y) + 8, 'text-anchor': 'middle', style: 'font-size:22px' }, it.emoji));
    });
    read.replaceChildren(h('div', null, '🕒 ', h('b', null, d.times[t])),
      ...d.items.map((it) => h('div', null, `${it.emoji} ${it.label}: 처음 (${it.pos[0].join(', ')}) → 지금 (${it.pos[t].join(', ')})`)));
  }
  slider.addEventListener('input', draw);
  draw();
  return fig(d.title ?? '📍 시간에 따라 위치가 어떻게 변할까요?', svg, h('label', { class: 'lab-controls' }, '시간 ', slider), read, note('(가로, 세로) 순서로 위치를 읽어요. ○는 처음 위치예요.'));
}

// ───────────── 🏃 달리기 경주 (속력) ─────────────
export type RaceData = { title?: string; unit?: string; items: { label: string; emoji: string; dist: number; time: number }[] };
export function raceLab(d: RaceData) {
  const unit = d.unit ?? 'm';
  const maxD = Math.max(...d.items.map((x) => x.dist));
  const maxT = Math.max(...d.items.map((x) => x.time));
  const LW = 300, X0 = 70;
  const svg = s('svg', { viewBox: `0 0 400 ${d.items.length * 40 + 20}`, class: 'lab-svg', role: 'img', 'aria-label': '경주' });
  svg.append(s('rect', { x: 0, y: 0, width: 400, height: d.items.length * 40 + 20, fill: '#e9f3e1' }));
  const runners: SVGElement[] = [];
  d.items.forEach((it, k) => {
    const y = 10 + k * 40;
    svg.append(s('rect', { x: X0, y, width: LW, height: 34, fill: '#d98e5a', opacity: 0.35, rx: 4 }));
    svg.append(s('text', { x: 6, y: y + 22, class: 'lab-t' }, it.label));
    const end = X0 + (it.dist / maxD) * LW;
    svg.append(s('line', { x1: end, y1: y, x2: end, y2: y + 34, stroke: '#333', 'stroke-width': 2, 'stroke-dasharray': '3 3' }));
    const r = s('text', { x: X0, y: y + 26, 'text-anchor': 'middle', style: 'font-size:22px; transform-box: fill-box; transform-origin: center; transform: scaleX(-1)' }, it.emoji);
    runners.push(r); svg.append(r);
  });
  const clock = h('b', null, '0초');
  const rows = h('tbody');
  let raf = 0;
  function reset() {
    cancelAnimationFrame(raf);
    runners.forEach((r) => r.setAttribute('x', String(X0)));
    clock.textContent = '0초';
  }
  function go() {
    reset();
    const DUR = 4000; // 가장 오래 걸린 사람이 도착하는 데 걸리는 화면 시간
    const t0 = performance.now();
    const step = (now: number) => {
      const real = Math.min(maxT, ((now - t0) / DUR) * maxT);
      clock.textContent = `${Math.round(real * 10) / 10}초`;
      d.items.forEach((it, k) => {
        const f = Math.min(1, real / it.time);
        runners[k].setAttribute('x', String(X0 + f * (it.dist / maxD) * LW));
      });
      if (real < maxT) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  rows.append(...d.items.map((it) => h('tr', null, h('td', null, `${it.emoji} ${it.label}`), h('td', null, `${it.dist} ${unit}`), h('td', null, `${it.time}초`))));
  return fig(d.title ?? '🏃 누가 더 빠를까요?', svg,
    h('div', { class: 'lab-controls' }, h('button', { class: 'btn small', type: 'button', onclick: go }, '▶ 출발'), h('button', { class: 'btn small ghost', type: 'button', onclick: reset }, '처음으로'), h('span', null, '⏱ ', clock)),
    h('table', { class: 'tbl lab-tbl' }, h('thead', null, h('tr', null, h('th', null, '선수'), h('th', null, '이동 거리'), h('th', null, '걸린 시간'))), rows),
    note('점선은 각자 도착한 곳이에요. 화면 속 시간은 빠르게 줄여 보여 줘요.'));
}

// ───────────── 🔬 현미경으로 본 양파 표피 세포 ─────────────
export function microscopeLab() {
  let mag = 40, names = false;
  const svg = s('svg', { viewBox: '0 0 240 240', class: 'lab-svg lab-round', role: 'img', 'aria-label': '현미경으로 본 양파 표피 세포' });
  const view = s('g'); const lbl = s('g');
  svg.append(s('circle', { cx: 120, cy: 120, r: 118, fill: '#fbf3dd' }), view, lbl, s('circle', { cx: 120, cy: 120, r: 118, fill: 'none', stroke: '#333', 'stroke-width': 4 }));
  const clip = s('clipPath', { id: 'mc-clip' }); clip.append(s('circle', { cx: 120, cy: 120, r: 116 }));
  svg.append(clip); view.setAttribute('clip-path', 'url(#mc-clip)');
  const read = h('p', { class: 'lab-status', 'aria-live': 'polite' });
  const ctrls = h('div', { class: 'lab-controls' });
  function draw() {
    view.replaceChildren(); lbl.replaceChildren();
    const k = mag === 40 ? 0.35 : mag === 100 ? 0.8 : 2.4; // 배율에 따른 크기
    const cw = 70 * k, ch = 26 * k;
    for (let r = -Math.ceil(130 / ch) - 1; r <= Math.ceil(130 / ch) + 1; r++) {
      const off = (r % 2 ? cw / 2 : 0) - 20;
      for (let c = -Math.ceil(130 / cw) - 1; c <= Math.ceil(130 / cw) + 1; c++) {
        const x = 120 + c * cw + off, y = 120 + r * ch;
        view.append(s('rect', { x, y, width: cw, height: ch, fill: '#f6e7bf', stroke: '#a8782a', 'stroke-width': Math.max(1, k * 1.6) }));
        if (k > 0.5) view.append(s('rect', { x: x + 2 * k, y: y + 2 * k, width: cw - 4 * k, height: ch - 4 * k, fill: 'none', stroke: '#d2b06a', 'stroke-width': 0.8 }));
        view.append(s('ellipse', { cx: x + cw * 0.45, cy: y + ch / 2, rx: Math.max(1.2, 5 * k), ry: Math.max(1, 4 * k), fill: '#7a4a12' }));
      }
    }
    if (names && mag === 400) {
      // 가운데 세포 하나에 이름 붙이기
      const x = 120 - 20, y = 120; // 행 0, 열 0
      const L = (tx: number, ty: number, px: number, py: number, t: string) => { lbl.append(s('line', { x1: tx, y1: ty, x2: px, y2: py, stroke: '#111', 'stroke-width': 1.5 }), s('rect', { x: tx - 26, y: ty - 13, width: 52, height: 18, rx: 6, fill: '#fff', stroke: '#111' }), s('text', { x: tx, y: ty, 'text-anchor': 'middle', class: 'lab-t' }, t)); };
      L(150, 100, x + 70 * 2.4 * 0.45, y + 26 * 2.4 / 2 - 6, '핵');
      L(180, 205, x + 168, y + 40, '세포벽');
      L(70, 200, x + 6, y + 48, '세포막');
    }
    read.textContent = mag === 40 ? '40배: 작은 칸들이 빽빽하게 모여 있어요.' : mag === 100 ? '100배: 벽돌처럼 쌓인 세포와 진한 점이 보여요.' : '400배: 세포 하나하나의 테두리와 둥근 핵이 또렷하게 보여요.';
    ctrls.replaceChildren(
      ...[40, 100, 400].map((m) => h('button', { class: 'btn small' + (m === mag ? ' primary' : ' ghost'), type: 'button', onclick: () => { mag = m; names = false; draw(); } }, `${m}배`)),
      h('button', { class: 'btn small ghost', type: 'button', disabled: mag !== 400, onclick: () => { names = !names; draw(); } }, names ? '이름 숨기기' : '🏷️ 이름 보기 (400배)'),
    );
  }
  draw();
  return fig('🔬 현미경으로 본 양파 표피 세포 (아이오딘 용액으로 물들임 예시)', h('div', { class: 'lab-scope' }, svg), ctrls, read, note('식물 세포는 세포벽이 있어 모양이 일정해요. 세포막은 세포벽 바로 안쪽에 붙어 있어요.'));
}

// ───────────── 🌄 남쪽 하늘에서 태양·별의 위치 변화 ─────────────
export function skyLab(kind: 'sun' | 'star') {
  const hours = kind === 'sun' ? [7, 9, 11, 12.5, 14, 16, 18] : [20, 21, 22, 23, 24, 25, 26];
  let i = 0;
  const night = kind === 'star';
  const svg = s('svg', { viewBox: '0 0 400 220', class: 'lab-svg', role: 'img', 'aria-label': '남쪽 하늘' });
  svg.append(s('rect', { x: 0, y: 0, width: 400, height: 180, fill: night ? '#18233f' : '#dff0fb' }), s('rect', { x: 0, y: 180, width: 400, height: 40, fill: night ? '#2d3b2a' : '#c9e3a9' }));
  if (night) for (let k = 0; k < 40; k++) svg.append(s('circle', { cx: (k * 97) % 400, cy: (k * 53) % 170, r: 0.9, fill: '#cfd8ff', opacity: 0.6 }));
  svg.append(s('path', { d: 'M 20 180 A 180 150 0 0 1 380 180', fill: 'none', stroke: night ? '#8fa3d9' : '#f2c14e', 'stroke-dasharray': '4 5', 'stroke-width': 1.5 }));
  ['동', '남', '서'].forEach((t, k) => svg.append(s('text', { x: [16, 200, 384][k], y: 215, 'text-anchor': 'middle', class: 'lab-t', fill: night ? '#fff' : undefined, style: night ? 'fill:#fff' : '' }, t)));
  svg.append(s('text', { x: 200, y: 197, 'text-anchor': 'middle', style: 'font-size:15px' }, '🧍'));
  const body = s('g'); svg.append(body);
  const slider = h('input', { type: 'range', min: 0, max: hours.length - 1, step: 1, value: 0, class: 'sun-range', 'aria-label': '시각' }) as HTMLInputElement;
  const read = h('p', { class: 'lab-status', 'aria-live': 'polite' });
  const fmt = (x: number) => { const hh = Math.floor(x) % 24, mm = Math.round((x % 1) * 60); return `${hh < 12 ? '오전' : '오후'} ${hh % 12 === 0 ? 12 : hh % 12}시${mm ? ` ${mm}분` : ''}`; };
  function draw() {
    i = Number(slider.value);
    const f = i / (hours.length - 1);
    const ang = Math.PI * (1 - (0.08 + f * 0.84));
    const x = 200 + Math.cos(ang) * 180, y = 180 - Math.sin(ang) * 150;
    body.replaceChildren();
    if (!night) body.append(s('circle', { cx: x, cy: y, r: 15, fill: '#ffcf3f', stroke: '#f2a516', 'stroke-width': 3 }));
    else {
      // 오리온자리 모양 (예시) — 모양은 그대로, 전체가 동→서로 움직여요
      const P = [[-14, -22], [14, -20], [-5, 0], [0, -1], [5, -2], [-12, 22], [13, 20]];
      P.forEach(([dx, dy]) => body.append(s('circle', { cx: x + dx, cy: y + dy, r: 2.6, fill: '#fff' })));
      body.append(s('polyline', { points: [P[0], P[2], P[5]].map(([dx, dy]) => `${x + dx},${y + dy}`).join(' '), fill: 'none', stroke: '#9fb4ff', 'stroke-width': 0.8 }));
      body.append(s('polyline', { points: [P[1], P[4], P[6]].map(([dx, dy]) => `${x + dx},${y + dy}`).join(' '), fill: 'none', stroke: '#9fb4ff', 'stroke-width': 0.8 }));
      body.append(s('line', { x1: x + P[0][0], y1: y + P[0][1], x2: x + P[1][0], y2: y + P[1][1], stroke: '#9fb4ff', 'stroke-width': 0.8 }), s('line', { x1: x + P[5][0], y1: y + P[5][1], x2: x + P[6][0], y2: y + P[6][1], stroke: '#9fb4ff', 'stroke-width': 0.8 }));
    }
    const where = f < 0.34 ? '동쪽' : f < 0.67 ? '남쪽' : '서쪽';
    read.textContent = `${fmt(hours[i])} — ${night ? '별자리' : '태양'}가 ${where} 하늘에 있어요.`;
  }
  slider.addEventListener('input', draw);
  draw();
  return fig(night ? '🌌 밤하늘 관찰 — 남쪽을 보고 시각을 바꿔 보세요' : '☀️ 하루 동안 태양 관찰 — 남쪽을 보고 시각을 바꿔 보세요', svg,
    h('label', { class: 'lab-controls' }, '시각 ', slider), read, note('남쪽을 바라보면 왼쪽이 동쪽, 오른쪽이 서쪽이에요. 위치는 이해를 돕는 예시예요.'));
}

// ───────────── 🌏 지구의 자전과 낮·밤 (북극 위에서 내려다본 모습) ─────────────
export function rotationLab() {
  let deg = 0; // 우리나라의 각도 (0 = 태양 반대쪽, 한밤)
  let spinning = false;
  let raf = 0;
  const svg = s('svg', { viewBox: '0 0 400 230', class: 'lab-svg', role: 'img', 'aria-label': '자전 모형' });
  svg.append(s('rect', { x: 0, y: 0, width: 400, height: 230, fill: '#101a33' }));
  // 태양과 햇빛 (왼쪽)
  svg.append(s('circle', { cx: -30, cy: 115, r: 70, fill: '#ffcf3f' }), s('text', { x: 14, y: 120, class: 'lab-t dark' }, '태양'));
  for (let k = 0; k < 5; k++) svg.append(s('line', { x1: 60, y1: 55 + k * 30, x2: 150, y2: 55 + k * 30, stroke: '#ffe58a', 'stroke-width': 2, 'stroke-dasharray': '6 6' }));
  const cx = 250, cy = 115, R = 80;
  svg.append(s('circle', { cx, cy, r: R, fill: '#3d8fd6' }));
  svg.append(s('path', { d: `M ${cx} ${cy - R} A ${R} ${R} 0 0 1 ${cx} ${cy + R} Z`, fill: '#0b1226', opacity: 0.72 }));
  svg.append(s('text', { x: cx - 52, y: cy + R + 18, 'text-anchor': 'middle', class: 'lab-t', style: 'fill:#ffe58a' }, '낮'), s('text', { x: cx + 52, y: cy + R + 18, 'text-anchor': 'middle', class: 'lab-t', style: 'fill:#9fb4ff' }, '밤'));
  svg.append(s('circle', { cx, cy, r: 4, fill: '#fff' }), s('text', { x: cx + 8, y: cy - 6, class: 'lab-t', style: 'fill:#fff' }, '북극'));
  // 도는 방향 화살표 (시계 반대 방향 = 서→동)
  svg.append(s('path', { d: `M ${cx + R + 12} ${cy + 30} A ${R + 12} ${R + 12} 0 0 0 ${cx + R + 12} ${cy - 30}`, fill: 'none', stroke: '#fff', 'stroke-width': 2, 'marker-end': 'url(#rot-arrow)' }));
  const defs = s('defs'); const mk = s('marker', { id: 'rot-arrow', viewBox: '0 0 10 10', refX: 5, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' });
  mk.append(s('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#fff' })); defs.append(mk); svg.append(defs);
  const me = s('g'); svg.append(me);
  const read = h('p', { class: 'lab-status', 'aria-live': 'polite' });
  const btnSpin = h('button', { class: 'btn small', type: 'button', onclick: () => { spinning = !spinning; btnSpin.textContent = spinning ? '⏸ 멈추기' : '▶ 계속 돌리기'; if (spinning) loop(); else cancelAnimationFrame(raf); } }, '▶ 계속 돌리기');
  function draw() {
    const a = (deg * Math.PI) / 180;
    const x = cx + Math.cos(a) * R, y = cy - Math.sin(a) * R;
    me.replaceChildren(s('circle', { cx: x, cy: y, r: 7, fill: '#ff5d5d', stroke: '#fff', 'stroke-width': 2 }), s('text', { x: x + (Math.cos(a) >= 0 ? 10 : -10), y: y - 8, 'text-anchor': Math.cos(a) >= 0 ? 'start' : 'end', class: 'lab-t', style: 'fill:#fff' }, '우리나라'));
    const d = ((deg % 360) + 360) % 360;
    const hour = Math.round((d / 360) * 24) % 24;
    const phase = d < 80 || d > 280 ? '밤 🌙' : d < 100 ? '해가 뜰 무렵 🌅' : d <= 260 ? '낮 ☀️' : '해가 질 무렵 🌇';
    read.textContent = `우리나라는 지금 ${phase} (약 ${hour}시)`;
  }
  function loop() { deg = (deg + 1.2) % 360; draw(); if (spinning) raf = requestAnimationFrame(loop); }
  draw();
  return fig('🌏 지구의 자전 — 북극 위에서 내려다본 모습', svg,
    h('div', { class: 'lab-controls' },
      h('button', { class: 'btn small', type: 'button', onclick: () => { deg = (deg + 90) % 360; draw(); } }, '↺ 6시간만큼 돌리기'),
      btnSpin),
    read, note('지구는 자전축을 중심으로 서쪽에서 동쪽으로 하루에 한 바퀴 돌아요. 실제 자전축은 기울어져 있어요.'));
}

// ───────────── ✨ 지구의 공전과 계절별 별자리 ─────────────
const CONS: Record<string, { name: string; season: string; pts: [number, number][]; lines: [number, number][] }> = {
  top: { name: '사자자리', season: '봄', pts: [[0, 0], [8, -8], [18, -6], [20, 4], [12, 10], [-26, 6], [-30, -2]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 0]] },
  left: { name: '거문고자리', season: '여름', pts: [[0, -14], [-4, -4], [4, -2], [-6, 10], [2, 12]], lines: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 4]] },
  bottom: { name: '페가수스자리', season: '가을', pts: [[-12, -12], [12, -12], [12, 12], [-12, 12], [-26, -20]], lines: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4]] },
  right: { name: '오리온자리', season: '겨울', pts: [[-10, -16], [10, -15], [-4, 0], [0, -1], [4, -2], [-9, 16], [10, 15]], lines: [[0, 2], [2, 5], [1, 4], [4, 6], [2, 3], [3, 4]] },
};
export function starSeasonLab() {
  const POS: Record<string, { x: number; y: number; m: string }> = { top: { x: 200, y: 52, m: '봄(3월 무렵)' }, left: { x: 110, y: 115, m: '여름(6월 무렵)' }, bottom: { x: 200, y: 178, m: '가을(9월 무렵)' }, right: { x: 290, y: 115, m: '겨울(12월 무렵)' } };
  const FAR: Record<string, { x: number; y: number }> = { top: { x: 200, y: 16 }, left: { x: 40, y: 115 }, bottom: { x: 200, y: 214 }, right: { x: 360, y: 115 } };
  let at = ''; // 처음에는 아무 계절도 고르지 않은 상태
  const svg = s('svg', { viewBox: '0 0 400 230', class: 'lab-svg', role: 'img', 'aria-label': '계절별 별자리 모형' });
  svg.append(s('rect', { x: 0, y: 0, width: 400, height: 230, fill: '#0f1830' }), s('ellipse', { cx: 200, cy: 115, rx: 90, ry: 63, fill: 'none', stroke: '#6b7fa8', 'stroke-dasharray': '4 5' }));
  svg.append(s('circle', { cx: 200, cy: 115, r: 18, fill: '#ffcf3f' }), s('text', { x: 200, y: 119, 'text-anchor': 'middle', class: 'lab-t dark' }, '태양'));
  const consG = s('g'), earthG = s('g');
  svg.append(consG, earthG);
  const read = h('p', { class: 'lab-status', 'aria-live': 'polite' });
  const ctrls = h('div', { class: 'lab-months' });
  function draw() {
    consG.replaceChildren(); earthG.replaceChildren();
    const opp = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as Record<string, string>;
    for (const [k, c] of Object.entries(CONS)) {
      const f = FAR[k];
      const on = k === at, hidden = k === opp[at];
      const col = on ? '#ffe58a' : hidden ? '#3a4766' : '#9fb4ff';
      c.lines.forEach(([a, b]) => consG.append(s('line', { x1: f.x + c.pts[a][0], y1: f.y + c.pts[a][1], x2: f.x + c.pts[b][0], y2: f.y + c.pts[b][1], stroke: col, 'stroke-width': on ? 1.6 : 0.8 })));
      c.pts.forEach(([dx, dy]) => consG.append(s('circle', { cx: f.x + dx, cy: f.y + dy, r: on ? 2.6 : 1.8, fill: col })));
      const tx = k === 'left' ? f.x : k === 'right' ? f.x : f.x + 48;
      const ty = k === 'left' || k === 'right' ? f.y + 34 : f.y + 4;
      consG.append(s('text', { x: tx, y: ty, 'text-anchor': 'middle', class: 'lab-t', style: `fill:${col}` }, c.name));
    }
    for (const [k, p] of Object.entries(POS)) {
      const g = s('g', { style: 'cursor:pointer', role: 'button', 'aria-label': p.m, onclick: () => { at = k; draw(); } });
      g.append(s('circle', { cx: p.x, cy: p.y, r: 11, fill: '#3d8fd6', stroke: k === at ? '#fff' : 'none', 'stroke-width': 2 }));
      // 밤인 쪽(태양 반대쪽)을 어둡게
      const ang = Math.atan2(p.y - 115, p.x - 200);
      const nx = Math.cos(ang), ny = Math.sin(ang);
      const ax = p.x - ny * 11, ay = p.y + nx * 11, bx = p.x + ny * 11, by = p.y - nx * 11;
      g.append(s('path', { d: `M ${ax} ${ay} A 11 11 0 0 0 ${bx} ${by} Z`, fill: '#0b1226', opacity: 0.75 }));
      earthG.append(g);
    }
    ctrls.replaceChildren(...Object.entries(POS).map(([k, p]) => h('button', { class: 'btn small' + (k === at ? ' primary' : ' ghost'), type: 'button', onclick: () => { at = k; draw(); } }, p.m)));
    if (!at) { read.textContent = '계절 버튼이나 지구를 눌러 보세요.'; return; }
    const c = CONS[at], hid = CONS[opp[at]];
    read.textContent = `${POS[at].m}: 밤에 지구의 밤인 쪽이 향하는 ${c.name}가 잘 보여요. 태양과 같은 쪽에 있는 ${hid.name}는 낮에 떠 있어서 보이지 않아요.`;
  }
  draw();
  return fig('✨ 지구의 공전과 계절별 별자리 — 지구를 눌러 보세요', svg, ctrls, read, note('별자리는 계절의 대표 별자리를 간단히 그린 예시예요. 실제 거리와 크기는 아주 달라요.'));
}
