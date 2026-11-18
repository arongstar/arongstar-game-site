// 기후 그래프: 막대 = 강수량(mm, 오른쪽 눈금), 꺾은선 = 평균 기온(℃, 왼쪽 눈금)
// 여러 그래프를 나란히 비교할 수 있게 눈금 범위를 모든 도시에 똑같이 씁니다.
import { s, h } from './dom';

const T_MIN = -20;
const T_MAX = 40;
const R_MAX = 450;
const W = 380;
const H = 282;
const PAD = { l: 40, r: 44, t: 30, b: 34 };
const IW = W - PAD.l - PAD.r;
const IH = H - PAD.t - PAD.b;

export interface ChartOpts {
  title: string;
  sub?: string;
  pickable?: boolean;
  onPick?: (month: number, el: SVGElement) => void;
}

export function climateChart(city: { temp: number[]; rain: number[] }, opts: ChartOpts) {
  const ty = (t: number) => PAD.t + IH - ((t - T_MIN) / (T_MAX - T_MIN)) * IH;
  const ry = (r: number) => PAD.t + IH - (Math.min(r, R_MAX) / R_MAX) * IH;
  const bw = IW / 12;
  const svg = s('svg', {
    viewBox: `0 0 ${W} ${H}`,
    class: 'chart-svg',
    role: 'img',
    'aria-label': `${opts.title} 기후 그래프`,
  });

  // 눈금선과 기온 눈금(왼쪽)
  for (let t = T_MIN; t <= T_MAX; t += 10) {
    const y = ty(t);
    svg.append(s('line', { x1: PAD.l, x2: W - PAD.r, y1: y, y2: y, class: t === 0 ? 'grid zero' : 'grid' }));
    svg.append(s('text', { x: PAD.l - 6, y: y + 4, class: 'tick t-temp', 'text-anchor': 'end' }, `${t}`));
  }
  // 강수량 눈금(오른쪽)
  for (let r = 0; r <= R_MAX; r += 150) {
    svg.append(s('text', { x: W - PAD.r + 6, y: ry(r) + 4, class: 'tick t-rain' }, `${r}`));
  }
  svg.append(s('text', { x: 4, y: 12, class: 'unit t-temp' }, '기온(℃)'));
  svg.append(s('text', { x: W - 4, y: 12, class: 'unit t-rain', 'text-anchor': 'end' }, '강수량(mm)'));

  // 막대(강수량)
  city.rain.forEach((r, i) => {
    const x = PAD.l + i * bw + bw * 0.18;
    const y = ry(r);
    svg.append(s('rect', { x, y, width: bw * 0.64, height: PAD.t + IH - y, class: 'bar', 'data-m': i + 1 }));
  });
  // 꺾은선(기온)
  const pts = city.temp.map((t, i) => `${PAD.l + i * bw + bw / 2},${ty(t)}`).join(' ');
  svg.append(s('polyline', { points: pts, class: 'line' }));
  city.temp.forEach((t, i) => svg.append(s('circle', { cx: PAD.l + i * bw + bw / 2, cy: ty(t), r: 3.6, class: 'dot' })));

  // 달 이름
  for (let i = 0; i < 12; i++) {
    svg.append(s('text', { x: PAD.l + i * bw + bw / 2, y: H - 14, class: 'month', 'text-anchor': 'middle' }, `${i + 1}`));
  }
  svg.append(s('text', { x: PAD.l + IW / 2, y: H - 1, class: 'month-label', 'text-anchor': 'middle' }, '(월)'));

  // 달 고르기 영역
  if (opts.pickable) {
    for (let i = 0; i < 12; i++) {
      const hit = s('rect', {
        x: PAD.l + i * bw,
        y: PAD.t,
        width: bw,
        height: IH + 22,
        class: 'hit',
        tabindex: 0,
        role: 'button',
        'aria-label': `${i + 1}월`,
        'data-m': i + 1,
      });
      const pick = () => opts.onPick?.(i + 1, hit);
      hit.addEventListener('click', pick);
      hit.addEventListener('keydown', (e: any) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          pick();
        }
      });
      svg.append(hit);
    }
  }

  const avg = city.temp.reduce((a, b) => a + b, 0) / 12;
  const sum = city.rain.reduce((a, b) => a + b, 0);
  return h(
    'figure',
    { class: 'chart' + (opts.pickable ? ' pickable' : '') },
    h('figcaption', { class: 'chart-title' }, opts.title, opts.sub ? h('span', { class: 'chart-sub' }, opts.sub) : null),
    svg,
    h(
      'div',
      { class: 'chart-legend' },
      h('span', { class: 'lg lg-line' }, '평균 기온'),
      h('span', { class: 'lg lg-bar' }, '강수량'),
      h('span', { class: 'lg-sum' }, `연평균 ${avg.toFixed(1)}℃ · 연 강수량 ${Math.round(sum).toLocaleString()}mm`),
    ),
  );
}

export function markMonth(svg: Element, month: number, cls: string) {
  svg.querySelectorAll(`[data-m="${month}"]`).forEach((el) => el.classList.add(cls));
}
