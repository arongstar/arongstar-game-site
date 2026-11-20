// 과학 가상 실험실: 태양 고도 관측, 공전 모형, 촛불 실험, 전자석, 전기 회로
import { h, s } from './dom';

// ───────────── ☀️ 하루 동안 태양 고도·그림자·기온 ─────────────
export function sunDayLab(d: { rows: { time: string; alt: number; shadow: number; temp: number }[] }) {
  let i = Math.floor(d.rows.length / 2);
  const svg = s('svg', { viewBox: '0 0 400 230', class: 'lab-svg', role: 'img', 'aria-label': '막대와 그림자' });
  const sky = s('rect', { x: 0, y: 0, width: 400, height: 180, fill: '#dff0fb' });
  const ground = s('rect', { x: 0, y: 180, width: 400, height: 50, fill: '#c9e3a9' });
  const arc = s('path', { d: 'M 30 180 A 170 150 0 0 1 370 180', fill: 'none', stroke: '#f2c14e', 'stroke-dasharray': '4 5', 'stroke-width': 2 });
  const sun = s('circle', { r: 15, fill: '#ffcf3f', stroke: '#f2a516', 'stroke-width': 3 });
  const ray = s('line', { stroke: '#f2a516', 'stroke-width': 1.5, 'stroke-dasharray': '3 4' });
  const stick = s('rect', { x: 196, y: 120, width: 8, height: 60, fill: '#8a5a2b', rx: 2 });
  const shadow = s('rect', { y: 178, height: 6, fill: '#55626a', opacity: 0.7, rx: 3 });
  const angle = s('path', { fill: 'rgb(242 165 22 / 0.25)', stroke: '#e08a3c' });
  svg.append(sky, ground, arc, ray, shadow, stick, angle, sun);
  svg.append(s('text', { x: 10, y: 222, class: 'lab-t' }, '동'), s('text', { x: 380, y: 222, class: 'lab-t' }, '서'));
  const out = { time: h('b'), alt: h('b'), shadow: h('b'), temp: h('b') };
  const slider = h('input', { type: 'range', min: 0, max: d.rows.length - 1, step: 1, value: i, class: 'sun-range', 'aria-label': '시각' }) as HTMLInputElement;
  function draw() {
    i = Number(slider.value);
    const r = d.rows[i];
    // 해의 위치: 시각 순서대로 동→서, 높이는 태양 고도
    const t = d.rows.length > 1 ? i / (d.rows.length - 1) : 0.5;
    const sx = 50 + t * 300;
    const sy = 180 - Math.sin((r.alt * Math.PI) / 180) * 160;
    sun.setAttribute('cx', String(sx));
    sun.setAttribute('cy', String(sy));
    // 막대 꼭대기에서 그림자 끝으로 이어지는 햇빛, 그림자는 해 반대쪽
    const len = Math.min(180, r.shadow * 7);
    const dir = sx < 200 ? 1 : -1;
    const sx0 = dir > 0 ? 200 : 200 - len;
    shadow.setAttribute('x', String(sx0));
    shadow.setAttribute('width', String(len));
    const tipX = 200 + dir * len;
    ray.setAttribute('x1', String(sx)); ray.setAttribute('y1', String(sy));
    ray.setAttribute('x2', String(tipX)); ray.setAttribute('y2', '180');
    const a0 = Math.atan2(sy - 180, sx - tipX);
    const rr = 26;
    const ex = tipX + Math.cos(a0) * rr;
    const ey = 180 + Math.sin(a0) * rr;
    angle.setAttribute('d', `M ${tipX} 180 L ${tipX - dir * rr} 180 A ${rr} ${rr} 0 0 ${dir > 0 ? 1 : 0} ${ex} ${ey} Z`);
    out.time.textContent = r.time;
    out.alt.textContent = `${r.alt}°`;
    out.shadow.textContent = `${r.shadow}cm`;
    out.temp.textContent = `${r.temp}℃`;
  }
  slider.addEventListener('input', draw);
  draw();
  const tbl = h('table', { class: 'tbl lab-tbl' },
    h('thead', null, h('tr', null, h('th', null, '시각'), h('th', null, '태양 고도'), h('th', null, '그림자 길이'), h('th', null, '기온'))),
    h('tbody', null, d.rows.map((r) => h('tr', null, h('td', null, r.time), h('td', null, `${r.alt}°`), h('td', null, `${r.shadow}cm`), h('td', null, `${r.temp}℃`)))),
  );
  return h('figure', { class: 'lab' },
    h('figcaption', { class: 'chart-title' }, '☀️ 태양 고도 관측소 — 시각을 바꿔 보세요'),
    svg,
    h('label', { class: 'sun-control' }, '시각 ', slider),
    h('div', { class: 'lab-read' }, h('span', null, '🕒 ', out.time), h('span', null, '📐 태양 고도 ', out.alt), h('span', null, '🌑 그림자 ', out.shadow), h('span', null, '🌡️ 기온 ', out.temp)),
    h('details', { class: 'lab-more' }, h('summary', null, '📋 측정 결과 표 보기'), h('div', { class: 'tbl-scroll' }, tbl)),
    h('small', { class: 'ph-credit' }, '길이 10cm 막대, 서울 추분 무렵 낮 기준 계산값 (기온은 예시)'),
  );
}

// ───────────── 🌍 공전 모형: 자전축 기울기에 따른 남중 고도 ─────────────
export function orbitLab(init: { tilt?: boolean } = {}) {
  let tilted = init.tilt ?? true;
  let pos = 0; // 0: 6월, 1: 9월, 2: 12월, 3: 3월
  const LAT = 37.5;
  const names = ['6월 (여름)', '9월 (가을)', '12월 (겨울)', '3월 (봄)'];
  const svg = s('svg', { viewBox: '0 0 400 250', class: 'lab-svg', role: 'img', 'aria-label': '지구의 공전 모형' });
  svg.append(s('rect', { x: 0, y: 0, width: 400, height: 250, fill: '#0f2533' }));
  for (let k = 0; k < 30; k++) svg.append(s('circle', { cx: (k * 71) % 400, cy: (k * 37) % 250, r: 1, fill: '#fff', opacity: 0.6 }));
  svg.append(s('ellipse', { cx: 200, cy: 125, rx: 150, ry: 70, fill: 'none', stroke: '#5b7d8f', 'stroke-dasharray': '4 5' }));
  svg.append(s('circle', { cx: 200, cy: 125, r: 24, fill: '#ffcf3f' }));
  svg.append(s('text', { x: 200, y: 130, 'text-anchor': 'middle', class: 'lab-t dark' }, '태양'));
  // 공전 위치: 6월(왼쪽), 9월(아래), 12월(오른쪽), 3월(위)
  const P = [[50, 125], [200, 195], [350, 125], [200, 55]];
  const earths: SVGElement[] = [];
  P.forEach(([x, y], k) => {
    const g = s('g', { transform: `translate(${x} ${y})`, class: 'orbit-earth', role: 'button', tabindex: 0, 'aria-label': names[k] });
    g.append(s('circle', { r: 15, fill: '#3d8fd1', stroke: '#9fd0f5', 'stroke-width': 2 }));
    const axis = s('line', { x1: 0, y1: -24, x2: 0, y2: 24, stroke: '#fff', 'stroke-width': 2 });
    g.append(axis);
    g.append(s('text', { y: 36, 'text-anchor': 'middle', class: 'lab-t light' }, names[k].split(' ')[0]));
    g.addEventListener('click', () => { pos = k; draw(); });
    earths.push(g);
    svg.append(g);
  });
  const gauge = s('svg', { viewBox: '0 0 160 110', class: 'lab-gauge', role: 'img', 'aria-label': '낮 12시 무렵 태양의 높이' });
  gauge.append(s('rect', { x: 0, y: 92, width: 160, height: 18, fill: '#c9e3a9' }));
  const gRay = s('line', { x1: 20, y1: 92, stroke: '#f2a516', 'stroke-width': 3 });
  const gSun = s('circle', { r: 9, fill: '#ffcf3f' });
  gauge.append(gRay, gSun);
  const altOut = h('b');
  const energyFill = h('span', { class: 'sun-power-fill' });
  const tiltBtn = h('button', { class: 'btn small', type: 'button', onclick: () => { tilted = !tilted; draw(); } });
  function draw() {
    const tilt = tilted ? 23.5 : 0;
    earths.forEach((g, k) => {
      g.classList.toggle('on', k === pos);
      const axis = g.querySelector('line')!;
      // 자전축은 늘 같은 방향(오른쪽 위)으로 기울어져 있어요
      axis.setAttribute('transform', `rotate(${tilted ? 23.5 : 0})`);
    });
    const decl = [tilt, 0, -tilt, 0][pos];
    const alt = Math.round(90 - LAT + decl);
    const a = (alt * Math.PI) / 180;
    const sx = 20 + Math.cos(a) * 110;
    const sy = 92 - Math.sin(a) * 82;
    gRay.setAttribute('x2', String(sx)); gRay.setAttribute('y2', String(sy));
    gSun.setAttribute('cx', String(sx)); gSun.setAttribute('cy', String(sy));
    altOut.textContent = `${alt}°`;
    const e = Math.round(Math.sin(a) * 100);
    energyFill.style.width = e + '%';
    energyFill.style.background = e > 85 ? '#e4572e' : e > 65 ? '#f2a516' : '#5a9ad6';
    tiltBtn.textContent = tilted ? '자전축 기울기: 23.5° (켜짐) — 눌러서 끄기' : '자전축 기울기: 0° (꺼짐) — 눌러서 켜기';
    tiltBtn.classList.toggle('primary', tilted);
  }
  draw();
  return h('figure', { class: 'lab' },
    h('figcaption', { class: 'chart-title' }, '🌍 공전 모형 실험실 — 지구를 눌러 계절을 바꿔 보세요'),
    svg,
    h('div', { class: 'lab-controls' }, tiltBtn, h('div', { class: 'lab-months' }, names.map((n, k) => h('button', { class: 'btn small ghost', type: 'button', onclick: () => { pos = k; draw(); } }, n)))),
    h('div', { class: 'lab-split' },
      gauge,
      h('div', { class: 'lab-read col' },
        h('span', null, '우리나라 낮 12시 무렵 태양의 높이(남중 고도): ', altOut),
        h('span', { class: 'sun-power' }, '땅이 받는 태양 에너지: ', h('span', { class: 'sun-power-bar' }, energyFill)),
      ),
    ),
    h('small', { class: 'ph-credit' }, '북위 37.5° 기준 모형이에요. 실제 공전 궤도는 원에 가까워요.'),
  );
}

// ───────────── 🕯️ 비커 덮기 실험 ─────────────
export function candleLab() {
  const TIMES: Record<string, number> = { small: 9, big: 22 };
  let timer: number | null = null;
  const flame = h('div', { class: 'flame' });
  const jar = h('div', { class: 'jar' });
  const status = h('p', { class: 'lab-status', 'aria-live': 'polite' }, '실험 방법을 골라 보세요.');
  const clock = h('b', { class: 'lab-clock' }, '0초');
  function run(kind: 'none' | 'small' | 'big') {
    if (timer) clearInterval(timer);
    flame.className = 'flame burning';
    jar.className = 'jar ' + kind;
    let t = 0;
    clock.textContent = '0초';
    status.textContent = kind === 'none' ? '덮지 않은 촛불은 계속 타요.' : '비커로 덮었어요. 촛불을 지켜보세요…';
    timer = window.setInterval(() => {
      t++;
      clock.textContent = `${t}초`;
      if (kind === 'none') {
        if (t >= 30) { clearInterval(timer!); status.textContent = '30초가 지나도 촛불이 계속 타요. 공기(산소)가 계속 들어오기 때문이에요.'; }
        return;
      }
      const left = TIMES[kind] - t;
      flame.style.transform = `scale(${Math.max(0.25, left / TIMES[kind])})`;
      if (left <= 0) {
        clearInterval(timer!);
        flame.className = 'flame out';
        status.textContent = `${kind === 'small' ? '작은' : '큰'} 비커 속 촛불이 약 ${TIMES[kind]}초 만에 꺼졌어요.`;
      }
    }, 450);
  }
  return h('figure', { class: 'lab' },
    h('figcaption', { class: 'chart-title' }, '🕯️ 비커 덮기 실험 (가상 실험)'),
    h('div', { class: 'candle-stage' }, jar, h('div', { class: 'candle' }, flame, h('div', { class: 'wax' })), h('div', { class: 'lab-clock-box' }, '⏱ ', clock)),
    h('div', { class: 'lab-controls' },
      h('button', { class: 'btn small ghost', type: 'button', onclick: () => run('none') }, '덮지 않기'),
      h('button', { class: 'btn small', type: 'button', onclick: () => run('small') }, '작은 비커로 덮기'),
      h('button', { class: 'btn small', type: 'button', onclick: () => run('big') }, '큰 비커로 덮기'),
    ),
    status,
    h('small', { class: 'ph-credit' }, '시간은 빠르게 줄여 보여 주는 예시예요. 실제 실험에서는 비커 크기와 초에 따라 달라요.'),
  );
}

// ───────────── 🧲 전자석 ─────────────
export function magnetLab() {
  let cells = 1;
  let flipped = false;
  let on = true;
  const svg = s('svg', { viewBox: '0 0 400 200', class: 'lab-svg', role: 'img', 'aria-label': '전자석 실험' });
  svg.append(s('rect', { x: 0, y: 0, width: 400, height: 200, fill: '#f6f3ea' }));
  // 못과 코일
  svg.append(s('rect', { x: 120, y: 70, width: 170, height: 16, rx: 3, fill: '#9aa3a8' }));
  svg.append(s('polygon', { points: '290,70 312,78 290,86', fill: '#9aa3a8' }));
  for (let x = 135; x < 280; x += 9) svg.append(s('ellipse', { cx: x, cy: 78, rx: 4, ry: 14, fill: 'none', stroke: '#c97a2b', 'stroke-width': 3 }));
  const cellG = s('g');
  svg.append(cellG);
  const wire = s('path', { fill: 'none', stroke: '#333', 'stroke-width': 2 });
  svg.append(wire);
  const sw = s('line', { stroke: '#333', 'stroke-width': 3 });
  svg.append(s('circle', { cx: 250, cy: 160, r: 3, fill: '#333' }), s('circle', { cx: 274, cy: 160, r: 3, fill: '#333' }), sw);
  const clipsG = s('g');
  svg.append(clipsG);
  const compass = s('g', { transform: 'translate(350 78)' });
  compass.append(s('circle', { r: 26, fill: '#fff', stroke: '#888', 'stroke-width': 2 }));
  const needle = s('g');
  needle.append(s('polygon', { points: '0,-20 6,0 -6,0', fill: '#d6452f' }), s('polygon', { points: '0,20 6,0 -6,0', fill: '#5a9ad6' }));
  compass.append(needle);
  svg.append(compass);
  const leftPole = s('text', { x: 108, y: 84, class: 'lab-t pole', 'text-anchor': 'middle' });
  const rightPole = s('text', { x: 322, y: 70, class: 'lab-t pole', 'text-anchor': 'middle' });
  svg.append(leftPole, rightPole);
  const read = { count: h('b'), pole: h('b') };
  const btnCells = h('button', { class: 'btn small', type: 'button', onclick: () => { cells = cells === 1 ? 2 : 1; draw(); } });
  const btnFlip = h('button', { class: 'btn small', type: 'button', onclick: () => { flipped = !flipped; draw(); } }, '🔄 전지 방향 바꾸기');
  const btnOn = h('button', { class: 'btn small', type: 'button', onclick: () => { on = !on; draw(); } });
  function draw() {
    cellG.replaceChildren();
    for (let k = 0; k < cells; k++) {
      const x = (flipped ? 150 : 145) + k * 50;
      cellG.append(s('rect', { x, y: 148, width: 44, height: 24, rx: 4, fill: '#2f6fb3' }), s('rect', { x: flipped ? x - 5 : x + 44, y: 155, width: 5, height: 10, fill: '#2f6fb3' }));
      cellG.append(s('text', { x: x + 22, y: 165, 'text-anchor': 'middle', class: 'lab-t light' }, flipped ? '− ＋' : '＋ −'));
    }
    // 볼트 왼쪽 끝 → 전지 → 스위치 → 볼트 오른쪽 끝으로 이어지는 한 바퀴 회로
    wire.setAttribute('d', `M 135 92 L 135 160 L 145 160 M ${145 + cells * 50} 160 L 250 160 M 274 160 L 280 160 L 280 92`);
    sw.setAttribute('x1', '250'); sw.setAttribute('y1', '160');
    sw.setAttribute('x2', on ? '274' : '270'); sw.setAttribute('y2', on ? '160' : '142');
    const n = on ? cells * 4 : 0;
    clipsG.replaceChildren();
    for (let k = 0; k < (on ? n : 4); k++) {
      const hang = on;
      const x = 300 + (k % 4) * 8 - 6;
      const y = hang ? 92 + Math.floor(k / 4) * 18 : 186;
      clipsG.append(s('rect', { x, y, width: 6, height: 14, rx: 3, fill: 'none', stroke: '#6b7378', 'stroke-width': 2, transform: hang ? '' : `rotate(80 ${x} ${y})` }));
    }
    const nEnd = flipped ? 'S' : 'N';
    rightPole.textContent = on ? nEnd : '';
    leftPole.textContent = on ? (nEnd === 'N' ? 'S' : 'N') : '';
    // 나침반 바늘의 N극(빨강)은 전자석 끝의 S극 쪽을 가리켜요
    needle.setAttribute('transform', on ? `rotate(${nEnd === 'N' ? 90 : -90})` : 'rotate(0)');
    read.count.textContent = on ? `${n}개` : '0개 (모두 떨어짐)';
    read.pole.textContent = on ? `${nEnd}극` : '자석의 성질 없음';
    btnCells.textContent = cells === 1 ? '🔋 전지 2개로 바꾸기' : '🔋 전지 1개로 바꾸기';
    btnOn.textContent = on ? '⏻ 스위치 끄기' : '⏻ 스위치 켜기';
  }
  draw();
  return h('figure', { class: 'lab' },
    h('figcaption', { class: 'chart-title' }, '🧲 전자석 연구소 (가상 실험)'),
    svg,
    h('div', { class: 'lab-controls' }, btnCells, btnFlip, btnOn),
    h('div', { class: 'lab-read' }, h('span', null, '📎 붙은 클립: ', read.count), h('span', null, '🧭 못 끝(오른쪽)의 극: ', read.pole)),
    h('small', { class: 'ph-credit' }, '클립 수는 이해를 돕는 예시 값이에요.'),
  );
}

// ───────────── 💡 전기 회로 (문제 종류) ─────────────
export interface CircuitState { cells: number; on: boolean; material: number }
export function circuitView(st: any, onChange: (s: CircuitState) => void) {
  const state: CircuitState = { cells: st.start?.cells ?? 1, on: st.start?.on ?? false, material: st.start?.material ?? 0 };
  const svg = s('svg', { viewBox: '0 0 400 230', class: 'lab-svg', role: 'img', 'aria-label': '전기 회로' });
  const glow = s('circle', { cx: 300, cy: 60, r: 0, fill: '#ffe066', opacity: 0.6 });
  const bulb = s('circle', { cx: 300, cy: 60, r: 18, fill: '#eee', stroke: '#888', 'stroke-width': 2 });
  const swLine = s('line', { stroke: '#333', 'stroke-width': 4, 'stroke-linecap': 'round' });
  const cellG = s('g');
  const matG = s('g');
  svg.append(s('rect', { x: 0, y: 0, width: 400, height: 230, fill: '#f6f3ea' }));
  // 전선 (왼쪽 전지 → 위 → 스위치 → 전구 → 아래 → 물체 → 전지)
  svg.append(s('path', { d: 'M 70 190 L 70 60 L 150 60 M 190 60 L 282 60 M 318 60 L 360 60 L 360 190 L 250 190 M 170 190 L 70 190', fill: 'none', stroke: '#333', 'stroke-width': 3 }));
  svg.append(s('circle', { cx: 150, cy: 60, r: 4, fill: '#333' }), s('circle', { cx: 190, cy: 60, r: 4, fill: '#333' }));
  svg.append(s('text', { x: 170, y: 44, 'text-anchor': 'middle', class: 'lab-t' }, '스위치'));
  svg.append(s('rect', { x: 292, y: 76, width: 16, height: 14, fill: '#999' }));
  svg.append(glow, bulb, swLine, cellG, matG);
  svg.append(s('text', { x: 300, y: 112, 'text-anchor': 'middle', class: 'lab-t' }, '전구'));
  const mats = st.materials as { text: string; conductor: boolean; emoji?: string }[];
  const controls = h('div', { class: 'lab-controls' });
  function draw() {
    cellG.replaceChildren();
    for (let k = 0; k < state.cells; k++) {
      const y = 150 + k * 20 - (state.cells - 1) * 10;
      cellG.append(s('rect', { x: 52, y: y - 2, width: 36, height: 18, rx: 4, fill: '#2f6fb3' }), s('rect', { x: 66, y: y - 7, width: 8, height: 5, fill: '#2f6fb3' }));
      cellG.append(s('text', { x: 70, y: y + 11, 'text-anchor': 'middle', class: 'lab-t light' }, '전지'));
    }
    swLine.setAttribute('x1', '150'); swLine.setAttribute('y1', '60');
    swLine.setAttribute('x2', state.on ? '190' : '182'); swLine.setAttribute('y2', state.on ? '60' : '34');
    const m = mats[state.material];
    matG.replaceChildren(
      s('rect', { x: 170, y: 176, width: 80, height: 28, rx: 6, fill: m.conductor ? '#cfd8dc' : '#e8d3b0', stroke: '#666' }),
      s('text', { x: 210, y: 195, 'text-anchor': 'middle', class: 'lab-t' }, `${m.emoji ?? ''} ${m.text}`),
    );
    const lit = state.on && m.conductor;
    const level = lit ? state.cells : 0;
    bulb.setAttribute('fill', level === 0 ? '#eee' : level === 1 ? '#ffe680' : '#fff36b');
    glow.setAttribute('r', String(level === 0 ? 0 : level === 1 ? 30 : 46));
    controls.replaceChildren(
      st.allowCells !== false ? h('button', { class: 'btn small', type: 'button', onclick: () => { state.cells = state.cells === 1 ? 2 : 1; draw(); } }, state.cells === 1 ? '🔋 전지 2개 직렬로 연결' : '🔋 전지 1개로 바꾸기') : null,
      h('button', { class: 'btn small' + (state.on ? ' primary' : ''), type: 'button', onclick: () => { state.on = !state.on; draw(); } }, state.on ? '⏻ 스위치 닫힘 (켜짐)' : '⏻ 스위치 열림 (꺼짐)'),
      h('div', { class: 'lab-mats' }, h('span', null, '빈 곳에 연결할 물체: '), mats.map((mm, k) => h('button', { class: 'btn small ghost' + (k === state.material ? ' on' : ''), type: 'button', onclick: () => { state.material = k; draw(); } }, `${mm.emoji ?? ''} ${mm.text}`))),
    );
    onChange({ ...state });
  }
  draw();
  return {
    el: h('figure', { class: 'lab' }, h('figcaption', { class: 'chart-title' }, '💡 회로 설계실'), svg, controls),
    state: () => ({ ...state }),
    brightness: () => (state.on && mats[state.material].conductor ? state.cells : 0),
    lock: () => controls.querySelectorAll('button').forEach((b) => ((b as HTMLButtonElement).disabled = true)),
  };
}
