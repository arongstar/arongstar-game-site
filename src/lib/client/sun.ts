// 위도별 햇볕 시뮬레이터: 같은 굵기의 햇빛 다발이 위도가 높을수록 넓은 땅에 퍼져 약해지는 모습
import { h, s } from './dom';

const R = 120; // 지구 반지름 (그림)
const CX = 250;
const CY = 150;
const BEAM = 26; // 햇빛 다발 굵기

function surfaceX(y: number) {
  // 햇빛을 받는 왼쪽 면
  return CX - Math.sqrt(Math.max(0, R * R - (y - CY) * (y - CY)));
}

export function sunSim(initial = 0) {
  let lat = initial;
  const svg = s('svg', { viewBox: '0 0 400 300', class: 'sun-svg', role: 'img', 'aria-label': '위도별 햇볕 그림' });
  const defs = s('defs');
  defs.append(
    s('linearGradient', { id: 'beamGrad', x1: 0, x2: 1 }, s('stop', { offset: '0', 'stop-color': '#ffd166', 'stop-opacity': '0.15' }), s('stop', { offset: '1', 'stop-color': '#ffb703', 'stop-opacity': '0.85' })),
  );
  svg.append(defs);
  // 해
  svg.append(s('circle', { cx: 26, cy: CY, r: 20, class: 'sun-sun' }));
  svg.append(s('text', { x: 26, y: CY + 40, 'text-anchor': 'middle', class: 'sun-label' }, '햇빛'));
  // 지구
  svg.append(s('circle', { cx: CX, cy: CY, r: R, class: 'sun-earth' }));
  for (const d of [-60, -30, 30, 60]) {
    const y = CY - R * Math.sin((d * Math.PI) / 180);
    const x0 = surfaceX(y);
    svg.append(s('line', { x1: x0, x2: CX + (CX - x0), y1: y, y2: y, class: 'sun-lat' }));
  }
  svg.append(s('line', { x1: CX - R, x2: CX + R, y1: CY, y2: CY, class: 'sun-eq' }));
  svg.append(s('text', { x: CX + R + 6, y: CY + 4, class: 'sun-label' }, '적도'));
  svg.append(s('text', { x: CX, y: CY - R - 8, 'text-anchor': 'middle', class: 'sun-label' }, '북극'));
  const beam = s('polygon', { class: 'sun-beam', fill: 'url(#beamGrad)' });
  const hit = s('path', { class: 'sun-hit' });
  const marker = s('circle', { r: 5, class: 'sun-marker' });
  svg.append(beam, hit, marker);

  const slider = h('input', { type: 'range', min: 0, max: 75, step: 1, value: lat, class: 'sun-range', 'aria-label': '위도' }) as HTMLInputElement;
  const latOut = h('b');
  const areaOut = h('b');
  const powerBar = h('span', { class: 'sun-power-fill' });
  const powerOut = h('b');
  const presets = h('div', { class: 'sun-presets' },
    [['적도 0°', 0], ['30°', 30], ['60°', 60], ['북극 가까이 75°', 75]].map(([t, v]) =>
      h('button', { class: 'btn small ghost', type: 'button', onclick: () => { slider.value = String(v); draw(); } }, t as string),
    ),
  );

  function draw() {
    lat = Number(slider.value);
    const y0 = CY - R * Math.sin((lat * Math.PI) / 180);
    const yA = y0 - BEAM / 2;
    const yB = y0 + BEAM / 2;
    const xA = surfaceX(yA);
    const xB = surfaceX(yB);
    beam.setAttribute('points', `46,${yA} ${xA},${yA} ${xB},${yB} 46,${yB}`);
    hit.setAttribute('d', `M ${xA} ${yA} A ${R} ${R} 0 0 0 ${xB} ${yB}`);
    marker.setAttribute('cx', String(surfaceX(y0)));
    marker.setAttribute('cy', String(y0));
    const ratio = 1 / Math.cos((lat * Math.PI) / 180);
    latOut.textContent = lat === 0 ? '0° (적도)' : `북위 ${lat}°`;
    areaOut.textContent = `적도의 ${ratio.toFixed(1)}배`;
    const power = Math.round(100 / ratio);
    powerOut.textContent = `${power}%`;
    powerBar.style.width = power + '%';
    powerBar.style.background = power > 80 ? '#e4572e' : power > 50 ? '#f2a516' : power > 30 ? '#74aee3' : '#2f6fb3';
  }
  slider.addEventListener('input', draw);
  draw();

  return h('figure', { class: 'sun-sim' },
    h('figcaption', { class: 'chart-title' }, '☀️ 위도에 따라 햇볕은 어떻게 달라질까?'),
    svg,
    h('label', { class: 'sun-control' }, '위도 바꾸기 ', slider),
    presets,
    h('div', { class: 'sun-read' },
      h('div', null, '위도: ', latOut),
      h('div', null, '햇볕이 퍼지는 넓이: ', areaOut),
      h('div', { class: 'sun-power' }, '땅이 받는 햇볕의 세기: ', powerOut, h('span', { class: 'sun-power-bar' }, powerBar)),
    ),
  );
}
