// 기후 맞춤 집·옷 그림 (고른 보기의 look 값으로 그림을 조립해요)
import { s } from './dom';

type Scene = '열대' | '건조' | '온대' | '냉대' | '한대' | '고산' | undefined;

const SKY: Record<string, [string, string]> = {
  열대: ['#bfe8ff', '#e9f8ff'],
  건조: ['#ffd9a0', '#fff1d6'],
  온대: ['#cfe7ff', '#eef6ff'],
  냉대: ['#d7e3f0', '#f2f6fa'],
  한대: ['#c9d6e6', '#eef3f8'],
  고산: ['#bcd7f5', '#eaf3ff'],
};
const GROUND: Record<string, string> = { 열대: '#79b85b', 건조: '#e7c389', 온대: '#8cc06b', 냉대: '#e9eef3', 한대: '#f4f8fb', 고산: '#a7b98a' };

function scenery(scene: Scene) {
  const g = s('g');
  const sc = scene ?? '온대';
  const [a, b] = SKY[sc];
  g.append(s('rect', { x: 0, y: 0, width: 260, height: 220, fill: b }));
  g.append(s('rect', { x: 0, y: 0, width: 260, height: 90, fill: a, opacity: 0.6 }));
  if (sc === '건조' || sc === '열대' || sc === '고산') g.append(s('circle', { cx: 222, cy: 34, r: 16, fill: '#ffcf3f' }));
  if (sc === '고산') {
    g.append(s('polygon', { points: '0,170 60,70 120,170', fill: '#9aa9b7' }));
    g.append(s('polygon', { points: '60,70 45,95 75,95', fill: '#fff' }));
    g.append(s('polygon', { points: '150,170 215,85 260,150 260,170', fill: '#8797a6' }));
  }
  if (sc === '건조') g.append(s('path', { d: 'M0 175 Q 60 150 120 172 T 260 168 V 220 H 0 Z', fill: '#f0d29e' }));
  g.append(s('rect', { x: 0, y: 175, width: 260, height: 45, fill: GROUND[sc] }));
  if (sc === '열대') {
    for (const x of [22, 236]) {
      g.append(s('rect', { x: x - 3, y: 110, width: 6, height: 66, fill: '#8a5a2b' }));
      g.append(s('ellipse', { cx: x, cy: 108, rx: 22, ry: 9, fill: '#3e9a4f' }));
      g.append(s('ellipse', { cx: x, cy: 108, rx: 9, ry: 20, fill: '#2f8a43' }));
    }
  }
  if (sc === '건조') {
    g.append(s('rect', { x: 226, y: 132, width: 10, height: 44, rx: 5, fill: '#5c9a4a' }));
    g.append(s('rect', { x: 216, y: 146, width: 10, height: 6, rx: 3, fill: '#5c9a4a' }));
    g.append(s('rect', { x: 212, y: 136, width: 6, height: 16, rx: 3, fill: '#5c9a4a' }));
  }
  if (sc === '온대') {
    g.append(s('rect', { x: 225, y: 130, width: 6, height: 46, fill: '#7a4f2a' }));
    g.append(s('circle', { cx: 228, cy: 122, r: 18, fill: '#5daa4a' }));
  }
  if (sc === '냉대' || sc === '한대') {
    const pine = (x: number, snow: boolean) => {
      g.append(s('rect', { x: x - 2, y: 160, width: 4, height: 16, fill: '#6b4a2a' }));
      g.append(s('polygon', { points: `${x},112 ${x - 14},162 ${x + 14},162`, fill: '#2f6b47' }));
      if (snow) g.append(s('polygon', { points: `${x},112 ${x - 6},132 ${x + 6},132`, fill: '#fff' }));
    };
    if (sc === '냉대') { pine(20, true); pine(236, true); pine(214, true); }
    for (let i = 0; i < 14; i++) g.append(s('circle', { cx: (i * 37) % 260, cy: 20 + ((i * 53) % 140), r: 2, fill: '#fff' }));
  }
  return g;
}

const has = (looks: string[], k: string) => looks.includes(k);

export function houseArt(looks: string[], scene: Scene) {
  const svg = s('svg', { viewBox: '0 0 260 220', class: 'art-svg', role: 'img', 'aria-label': '내가 꾸민 집' });
  svg.append(scenery(scene));
  const raised = has(looks, 'floor-raised');
  const base = raised ? 150 : 176; // 집 바닥 높이
  const wallH = 58;
  const top = base - wallH;
  const x0 = 70;
  const w = 120;
  // 기둥
  if (raised) for (const x of [x0 + 6, x0 + w / 2, x0 + w - 6]) svg.append(s('rect', { x: x - 4, y: base, width: 8, height: 176 - base, fill: '#7a5230' }));
  if (raised) svg.append(s('rect', { x: x0 + w - 2, y: base - 2, width: 16, height: 5, fill: '#8a5a2b', transform: `rotate(28 ${x0 + w} ${base})` }));
  // 벽
  const wall = looks.find((l) => l.startsWith('wall-')) ?? 'wall-plain';
  const wallFill: Record<string, string> = {
    'wall-thin': '#d9b77a',
    'wall-mud': '#c98e5a',
    'wall-log': '#8a5a2b',
    'wall-stone': '#d8d2c4',
    'wall-snow': '#f4f8fb',
    'wall-plain': '#e9e2d0',
  };
  const thick = wall === 'wall-mud' || wall === 'wall-stone' || wall === 'wall-log' || wall === 'wall-snow';
  svg.append(s('rect', { x: x0, y: top, width: w, height: wallH, fill: wallFill[wall], stroke: '#5a4630', 'stroke-width': thick ? 5 : 2 }));
  if (wall === 'wall-thin') for (let x = x0 + 10; x < x0 + w; x += 12) svg.append(s('line', { x1: x, x2: x, y1: top + 2, y2: base - 2, stroke: '#b8925a', 'stroke-width': 2 }));
  if (wall === 'wall-log') for (let y = top + 10; y < base; y += 11) svg.append(s('line', { x1: x0, x2: x0 + w, y1: y, y2: y, stroke: '#6b4321', 'stroke-width': 3 }));
  if (wall === 'wall-stone') for (let y = top + 12; y < base; y += 14) svg.append(s('line', { x1: x0, x2: x0 + w, y1: y, y2: y, stroke: '#b9b1a0', 'stroke-width': 1.5 }));
  // 문
  svg.append(s('rect', { x: x0 + w / 2 - 11, y: base - 32, width: 22, height: 32, fill: '#6b4321', rx: 2 }));
  // 창문
  const small = has(looks, 'window-small');
  const big = has(looks, 'window-big');
  const ww = small ? 12 : big ? 30 : 20;
  for (const cx of [x0 + 24, x0 + w - 24]) {
    svg.append(s('rect', { x: cx - ww / 2, y: top + 14, width: ww, height: small ? 10 : 18, fill: '#bfe3f5', stroke: '#5a4630', 'stroke-width': 2 }));
  }
  // 지붕
  const roof = looks.find((l) => l.startsWith('roof-')) ?? 'roof-gentle';
  const over = 12;
  if (roof === 'roof-flat') {
    svg.append(s('rect', { x: x0 - 4, y: top - 8, width: w + 8, height: 10, fill: '#b07a48' }));
  } else if (roof === 'roof-dome') {
    svg.append(s('path', { d: `M ${x0} ${top} Q ${x0 + w / 2} ${top - 60} ${x0 + w} ${top} Z`, fill: '#f4f8fb', stroke: '#9fb3c8', 'stroke-width': 3 }));
  } else {
    const hgt = roof === 'roof-steep' || roof === 'roof-thatch' ? 52 : 26;
    const fill = roof === 'roof-thatch' ? '#c9a25a' : roof === 'roof-snow' ? '#7a5a4a' : '#b5523b';
    svg.append(s('polygon', { points: `${x0 - over},${top} ${x0 + w / 2},${top - hgt} ${x0 + w + over},${top}`, fill, stroke: '#5a3a2a', 'stroke-width': 2 }));
    if (roof === 'roof-thatch') for (let i = 1; i < 6; i++) svg.append(s('line', { x1: x0 - over + i * 6, y1: top - 2, x2: x0 + w / 2, y2: top - hgt + 4, stroke: '#a88343', 'stroke-width': 1.2 }));
    if (scene === '냉대' || scene === '한대') {
      if (roof === 'roof-steep' || roof === 'roof-snow') svg.append(s('polygon', { points: `${x0 + w / 2 - 14},${top - hgt + 9} ${x0 + w / 2},${top - hgt} ${x0 + w / 2 + 14},${top - hgt + 9}`, fill: '#fff' }));
      else svg.append(s('path', { d: `M ${x0 - over} ${top} L ${x0 + w / 2} ${top - hgt} L ${x0 + w + over} ${top} L ${x0 + w + over} ${top - 6} Q ${x0 + w / 2} ${top - hgt - 16} ${x0 - over} ${top - 6} Z`, fill: '#fff' }));
    }
  }
  if (roof === 'roof-flat' && (scene === '냉대' || scene === '한대')) svg.append(s('rect', { x: x0 - 4, y: top - 22, width: w + 8, height: 14, rx: 6, fill: '#fff' }));
  return svg;
}

export function clothesArt(looks: string[], scene: Scene) {
  const svg = s('svg', { viewBox: '0 0 260 220', class: 'art-svg', role: 'img', 'aria-label': '내가 고른 옷차림' });
  svg.append(scenery(scene));
  const cx = 130;
  const skin = '#e9b98f';
  // 다리
  svg.append(s('rect', { x: cx - 14, y: 150, width: 10, height: 30, fill: '#4b4b5a' }));
  svg.append(s('rect', { x: cx + 4, y: 150, width: 10, height: 30, fill: '#4b4b5a' }));
  // 몸 (옷)
  const body = looks.find((l) => l.startsWith('body-')) ?? 'body-thin';
  if (body === 'body-thin') {
    svg.append(s('path', { d: `M ${cx - 26} 104 L ${cx + 26} 104 L ${cx + 22} 154 L ${cx - 22} 154 Z`, fill: '#f6f1e3', stroke: '#c9b98f', 'stroke-width': 2 }));
    svg.append(s('rect', { x: cx - 40, y: 104, width: 14, height: 22, rx: 5, fill: '#f6f1e3', stroke: '#c9b98f' }));
    svg.append(s('rect', { x: cx + 26, y: 104, width: 14, height: 22, rx: 5, fill: '#f6f1e3', stroke: '#c9b98f' }));
    svg.append(s('rect', { x: cx - 38, y: 126, width: 10, height: 20, rx: 4, fill: skin }));
    svg.append(s('rect', { x: cx + 28, y: 126, width: 10, height: 20, rx: 4, fill: skin }));
  } else if (body === 'body-robe') {
    svg.append(s('path', { d: `M ${cx - 28} 104 L ${cx + 28} 104 L ${cx + 40} 182 L ${cx - 40} 182 Z`, fill: '#f8f5ee', stroke: '#c9c1ad', 'stroke-width': 2 }));
    svg.append(s('path', { d: `M ${cx - 28} 106 L ${cx - 48} 150 L ${cx - 36} 152 L ${cx - 22} 120 Z`, fill: '#f8f5ee', stroke: '#c9c1ad' }));
    svg.append(s('path', { d: `M ${cx + 28} 106 L ${cx + 48} 150 L ${cx + 36} 152 L ${cx + 22} 120 Z`, fill: '#f8f5ee', stroke: '#c9c1ad' }));
  } else if (body === 'body-fur') {
    svg.append(s('rect', { x: cx - 34, y: 100, width: 68, height: 62, rx: 20, fill: '#a9825a', stroke: '#7b5a3a', 'stroke-width': 3 }));
    svg.append(s('rect', { x: cx - 34, y: 150, width: 68, height: 10, rx: 5, fill: '#f2ead8' }));
    svg.append(s('rect', { x: cx - 48, y: 104, width: 16, height: 46, rx: 8, fill: '#a9825a', stroke: '#7b5a3a', 'stroke-width': 2 }));
    svg.append(s('rect', { x: cx + 32, y: 104, width: 16, height: 46, rx: 8, fill: '#a9825a', stroke: '#7b5a3a', 'stroke-width': 2 }));
    svg.append(s('rect', { x: cx - 18, y: 172, width: 14, height: 10, rx: 4, fill: '#7b5a3a' }));
    svg.append(s('rect', { x: cx + 4, y: 172, width: 14, height: 10, rx: 4, fill: '#7b5a3a' }));
  } else if (body === 'body-poncho') {
    svg.append(s('rect', { x: cx - 20, y: 104, width: 40, height: 48, fill: '#3e6fa8' }));
    svg.append(s('polygon', { points: `${cx - 46},146 ${cx},100 ${cx + 46},146`, fill: '#c0392b' }));
    for (const [y, c] of [[124, '#f2c14e'], [134, '#2f8f5b'], [142, '#f2c14e']] as const) svg.append(s('line', { x1: cx - 34 + (146 - y), x2: cx + 34 - (146 - y), y1: y, y2: y, stroke: c, 'stroke-width': 3 }));
  } else if (body === 'body-coat') {
    svg.append(s('rect', { x: cx - 30, y: 100, width: 60, height: 68, rx: 10, fill: '#36506b', stroke: '#22374c', 'stroke-width': 3 }));
    svg.append(s('rect', { x: cx - 44, y: 104, width: 14, height: 46, rx: 7, fill: '#36506b' }));
    svg.append(s('rect', { x: cx + 30, y: 104, width: 14, height: 46, rx: 7, fill: '#36506b' }));
    svg.append(s('rect', { x: cx - 24, y: 100, width: 48, height: 10, rx: 5, fill: '#c0392b' }));
  }
  // 머리
  svg.append(s('circle', { cx, cy: 84, r: 18, fill: skin }));
  svg.append(s('circle', { cx: cx - 6, cy: 82, r: 2, fill: '#333' }));
  svg.append(s('circle', { cx: cx + 6, cy: 82, r: 2, fill: '#333' }));
  const head = looks.find((l) => l.startsWith('head-')) ?? 'head-none';
  if (head === 'head-veil') {
    svg.append(s('path', { d: `M ${cx - 22} 86 Q ${cx} 50 ${cx + 22} 86 L ${cx + 22} 98 L ${cx - 22} 98 Z`, fill: '#2f4f8f', opacity: 0.95 }));
    svg.append(s('rect', { x: cx - 16, y: 78, width: 32, height: 8, fill: skin }));
    svg.append(s('circle', { cx: cx - 6, cy: 82, r: 2, fill: '#333' }));
    svg.append(s('circle', { cx: cx + 6, cy: 82, r: 2, fill: '#333' }));
  } else if (head === 'head-hood') {
    svg.append(s('path', { d: `M ${cx - 26} 96 Q ${cx - 30} 54 ${cx} 56 Q ${cx + 30} 54 ${cx + 26} 96 L ${cx + 18} 96 Q ${cx + 20} 68 ${cx} 68 Q ${cx - 20} 68 ${cx - 18} 96 Z`, fill: '#a9825a', stroke: '#f2ead8', 'stroke-width': 5 }));
  } else if (head === 'head-knit') {
    svg.append(s('path', { d: `M ${cx - 19} 80 Q ${cx} 52 ${cx + 19} 80 Z`, fill: '#c0392b' }));
    svg.append(s('rect', { x: cx - 20, y: 76, width: 40, height: 6, fill: '#f2c14e' }));
    svg.append(s('rect', { x: cx - 22, y: 80, width: 6, height: 16, fill: '#c0392b' }));
    svg.append(s('rect', { x: cx + 16, y: 80, width: 6, height: 16, fill: '#c0392b' }));
  } else if (head === 'head-sunhat') {
    svg.append(s('ellipse', { cx, cy: 70, rx: 36, ry: 7, fill: '#d9b77a' }));
    svg.append(s('path', { d: `M ${cx - 16} 70 Q ${cx} 46 ${cx + 16} 70 Z`, fill: '#d9b77a' }));
  }
  return svg;
}
