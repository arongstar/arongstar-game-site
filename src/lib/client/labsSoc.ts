// 사회 가상 실험실: 지구본과 세계지도 비교
// 지도 자료(d3-geo, world-atlas)는 이 실험실이 열릴 때만 불러와요. 다른 게임은 가볍게 유지돼요.
import { h, s } from './dom';

const GL = 'GL'; // 그린란드
const AU = 'AU'; // 오스트레일리아
const IDS: Record<string, string> = { '304': GL, '036': AU };

export function globeLab() {
  const status = h('p', { class: 'lab-status', 'aria-live': 'polite' }, '지구본과 세계지도를 불러오는 중이에요…');
  const globeSvg = s('svg', { viewBox: '0 0 300 300', class: 'lab-svg', role: 'img', 'aria-label': '지구본' });
  const mapSvg = s('svg', { viewBox: '0 0 600 300', class: 'lab-svg', role: 'img', 'aria-label': '세계지도' });
  let compare = false;
  let rot: [number, number] = [-127, -20];
  let redraw: () => void = () => {};
  const btnCompare = h('button', { class: 'btn small', type: 'button', onclick: () => { compare = !compare; btnCompare.textContent = compare ? '비교 끄기' : '🔍 그린란드와 오스트레일리아 비교하기'; redraw(); } }, '🔍 그린란드와 오스트레일리아 비교하기');
  const spin = (d: number) => { rot = [rot[0] + d, rot[1]]; redraw(); };
  const ctrls = h('div', { class: 'lab-controls' },
    h('button', { class: 'btn small ghost', type: 'button', onclick: () => spin(-40) }, '⟲ 지구본 돌리기'),
    h('button', { class: 'btn small ghost', type: 'button', onclick: () => spin(40) }, '⟳ 반대로 돌리기'),
    btnCompare);

  (async () => {
    const [d3, topo, world] = await Promise.all([
      import('d3-geo'),
      import('topojson-client'),
      import('world-atlas/countries-110m.json'),
    ]);
    const w: any = (world as any).default ?? world;
    const countries: any = (topo as any).feature(w, w.objects.countries);
    const grat = d3.geoGraticule().step([30, 30])();
    const ortho = d3.geoOrthographic().scale(140).translate([150, 150]).clipAngle(90);
    const equi = d3.geoEquirectangular().scale(600 / (2 * Math.PI)).translate([300, 150]);
    const pathO = d3.geoPath(ortho);
    const pathE = d3.geoPath(equi);
    const line = (coords: [number, number][]) => ({ type: 'LineString', coordinates: coords }) as any;
    const equator = line(Array.from({ length: 73 }, (_, i) => [-180 + i * 5, 0] as [number, number]));
    const prime = line(Array.from({ length: 37 }, (_, i) => [0, -90 + i * 5] as [number, number]));
    const fill = (f: any) => {
      const k = IDS[String(f.id).padStart(3, '0')];
      if (compare && k === GL) return '#e05d5d';
      if (compare && k === AU) return '#f2a516';
      return '#9fcf8e';
    };
    function draw(svg: SVGElement, path: any, isGlobe: boolean) {
      svg.replaceChildren();
      if (isGlobe) svg.append(s('circle', { cx: 150, cy: 150, r: 140, fill: '#cfe8f7', stroke: '#5a7d91', 'stroke-width': 1.5 }));
      else svg.append(s('rect', { x: 0, y: 0, width: 600, height: 300, fill: '#cfe8f7' }));
      svg.append(s('path', { d: path(grat) ?? '', fill: 'none', stroke: '#8fb3c7', 'stroke-width': 0.6 }));
      for (const f of countries.features) svg.append(s('path', { d: path(f) ?? '', fill: fill(f), stroke: '#6f9a63', 'stroke-width': 0.3 }));
      svg.append(s('path', { d: path(equator) ?? '', fill: 'none', stroke: '#d6453d', 'stroke-width': 1.4 }));
      svg.append(s('path', { d: path(prime) ?? '', fill: 'none', stroke: '#2f6fb3', 'stroke-width': 1.4 }));
    }
    redraw = () => {
      ortho.rotate(rot);
      draw(globeSvg, pathO, true);
      draw(mapSvg, pathE, false);
      mapSvg.append(s('text', { x: 6, y: 146, class: 'lab-t', style: 'fill:#d6453d' }, '적도'), s('text', { x: 304, y: 14, class: 'lab-t', style: 'fill:#2f6fb3' }, '본초 자오선'));
      status.textContent = compare
        ? '세계지도에서는 그린란드(빨강)가 오스트레일리아(주황)만큼 커 보이지만, 지구본에서는 오스트레일리아가 훨씬 커요. 실제 면적은 오스트레일리아가 그린란드의 약 3.5배예요.'
        : '빨간 선은 적도, 파란 선은 본초 자오선이에요. 지구본을 돌려 보며 세계지도와 비교해 보세요.';
    };
    // 지구본을 손가락이나 마우스로 끌어서 돌리기
    let drag: { x: number; y: number; r: [number, number] } | null = null;
    globeSvg.addEventListener('pointerdown', (e: any) => { drag = { x: e.clientX, y: e.clientY, r: [...rot] as [number, number] }; (globeSvg as any).setPointerCapture?.(e.pointerId); });
    globeSvg.addEventListener('pointermove', (e: any) => {
      if (!drag) return;
      rot = [drag.r[0] + (e.clientX - drag.x) * 0.5, Math.max(-80, Math.min(80, drag.r[1] - (e.clientY - drag.y) * 0.5))];
      ortho.rotate(rot); draw(globeSvg, pathO, true);
    });
    const end = () => { drag = null; };
    globeSvg.addEventListener('pointerup', end); globeSvg.addEventListener('pointercancel', end);
    (globeSvg as any).style.touchAction = 'none';
    redraw();
  })().catch(() => { status.textContent = '지도 자료를 불러오지 못했어요. 새로 고침 해 보세요.'; });

  return h('figure', { class: 'lab' },
    h('figcaption', { class: 'chart-title' }, '🌐 지구본과 세계지도 비교하기 — 지구본을 끌어서 돌려 보세요'),
    h('div', { class: 'lab-globe' }, h('div', null, h('b', null, '지구본'), globeSvg), h('div', null, h('b', null, '세계지도'), mapSvg)),
    ctrls, status,
    h('small', { class: 'ph-credit' }, '지도: Natural Earth (world-atlas). 세계지도는 위도와 경도를 곧은 선으로 펼친 지도예요.'));
}
