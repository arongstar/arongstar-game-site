// 전자칠판용 모둠 대항 퀴즈쇼
import { h, readJSON, photoFigure } from './dom';
import { climateChart } from './chart';
import { playLines } from './english';

const TEAM_COLORS = ['#e4572e', '#2f6fb3', '#2f8f5b', '#b5651d', '#7b4bb3', '#d1397a'];
const TEAM_EMOJI = ['🦊', '🐳', '🐢', '🦁', '🦉', '🐙'];
const POINTS = { C: 100, B: 200, A: 300 } as const;
const TIER_NAME = { C: '🧭 살펴보기', B: '🔎 조사하기', A: '🏅 분석하기' } as const;

interface State {
  teams: { name: string; score: number }[];
  used: Record<string, number | -1>; // 칸 → 맞힌 모둠 번호 (-1: 아무도)
  goal: number;
  seconds: number;
  history: { tile: string; team: number; pts: number }[];
}

export function startBoard() {
  const data = readJSON<any>('game-data');
  const KEY = 'class-games:board:' + data.id;
  const app = document.getElementById('board')!;
  let st: State | null = load();

  function load(): State | null {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(st));
    } catch {}
  }

  const totalPoints = data.categories.reduce((a: number, c: any) => a + c.items.reduce((b: number, it: any) => b + POINTS[it.lv as 'C'], 0), 0);

  // ── 준비 화면 ──
  function setup() {
    let n = st?.teams.length ?? 4;
    let seconds = st?.seconds ?? 30;
    const teamRow = h('div', { class: 'bd-choices' });
    const secRow = h('div', { class: 'bd-choices' });
    const goalOut = h('b');
    const draw = () => {
      teamRow.replaceChildren(...[2, 3, 4, 5, 6].map((k) => h('button', { class: 'bd-choice' + (k === n ? ' on' : ''), onclick: () => { n = k; draw(); } }, `${k}모둠`)));
      secRow.replaceChildren(...[20, 30, 45, 60].map((k) => h('button', { class: 'bd-choice' + (k === seconds ? ' on' : ''), onclick: () => { seconds = k; draw(); } }, `${k}초`)));
      goalOut.textContent = `${goalFor(n).toLocaleString()}점`;
    };
    draw();
    app.replaceChildren(
      h('div', { class: 'bd-setup' },
        h('div', { class: 'bd-logo', 'aria-hidden': 'true' }, data.emoji),
        h('h1', null, data.title),
        h('p', null, '모둠이 차례로 칸을 골라 문제를 풀어요. 100점 🧭 살펴보기 · 200점 🔎 조사하기 · 300점 🏅 분석하기'),
        h('h2', null, '모둠 수'), teamRow,
        h('h2', null, '생각할 시간'), secRow,
        h('p', { class: 'bd-goal-note' }, '🎯 반 전체 목표: 모든 모둠 점수를 더해 ', goalOut, ' 넘기기'),
        h('div', { class: 'bd-setup-actions' },
          st ? h('button', { class: 'btn big', onclick: () => main() }, '이어서 하기') : null,
          h('button', { class: 'btn primary big', onclick: () => {
            st = { teams: Array.from({ length: n }, (_, i) => ({ name: `${i + 1}모둠`, score: 0 })), used: {}, goal: goalFor(n), seconds, history: [] };
            save();
            main();
          } }, st ? '새로 시작' : '시작하기'),
        ),
        h('a', { class: 'bd-back', href: data.unitUrl }, '← 탐험 지도로'),
      ),
    );
  }
  // 반 전체 목표: 전체 점수의 60%
  const goalFor = (_n: number) => Math.round((totalPoints * 0.6) / 100) * 100;

  // ── 퀴즈판 ──
  function main() {
    const s = st!;
    const total = s.teams.reduce((a, t) => a + t.score, 0);
    const pct = Math.min(100, Math.round((total / s.goal) * 100));
    const grid = h('div', { class: 'bd-grid', style: { gridTemplateColumns: `repeat(${data.categories.length}, 1fr)` } });
    data.categories.forEach((c: any) => grid.append(h('div', { class: 'bd-cat' }, h('span', { 'aria-hidden': 'true' }, c.emoji), c.name)));
    for (const lv of ['C', 'B', 'A'] as const) {
      data.categories.forEach((c: any, ci: number) => {
        const idx = c.items.findIndex((it: any) => it.lv === lv);
        if (idx < 0) return grid.append(h('div'));
        const key = `${ci}-${idx}`;
        const used = key in s.used;
        const who = s.used[key];
        grid.append(
          h('button', {
            class: `bd-tile lv-${lv}` + (used ? ' used' : ''),
            style: used && who >= 0 ? { background: TEAM_COLORS[who as number] } : undefined,
            onclick: () => ask(ci, idx),
            'aria-label': `${c.name} ${POINTS[lv]}점`,
          },
          used ? (who >= 0 ? `${TEAM_EMOJI[who as number]} ${s.teams[who as number].name}` : '—') : `${POINTS[lv]}`),
        );
      });
    }

    const teams = h('div', { class: 'bd-teams' },
      s.teams.map((t, i) => h('div', { class: 'bd-team', style: { borderColor: TEAM_COLORS[i] } },
        h('span', { class: 'bd-team-name', style: { color: TEAM_COLORS[i] } }, TEAM_EMOJI[i], ' ', t.name),
        h('span', { class: 'bd-team-score' }, t.score.toLocaleString()),
      )),
    );
    const gauge = h('div', { class: 'bd-gauge', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': s.goal, 'aria-valuenow': total },
      h('div', { class: 'bd-gauge-fill' + (pct >= 100 ? ' full' : ''), style: { width: pct + '%' } }),
      h('span', { class: 'bd-gauge-text' }, pct >= 100 ? `🎉 반 전체 목표 달성! ${total.toLocaleString()}점` : `🎯 반 전체 목표 ${total.toLocaleString()} / ${s.goal.toLocaleString()}점`),
    );

    app.replaceChildren(
      h('div', { class: 'bd-main' },
        h('header', { class: 'bd-head' },
          h('h1', null, data.emoji, ' ', data.title),
          h('div', { class: 'bd-tools' },
            s.history.length ? h('button', { class: 'btn small ghost', onclick: undo }, '↩ 되돌리기') : null,
            h('button', { class: 'btn small ghost', onclick: fullscreen }, '⛶ 전체 화면'),
            h('button', { class: 'btn small ghost', onclick: setup }, '⚙ 처음 설정'),
          ),
        ),
        grid,
        gauge,
        teams,
      ),
    );
  }

  function undo() {
    const s = st!;
    const last = s.history.pop();
    if (!last) return;
    delete s.used[last.tile];
    if (last.team >= 0) s.teams[last.team].score -= last.pts;
    save();
    main();
  }

  function fullscreen() {
    const d = document as any;
    if (!d.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else d.exitFullscreen?.();
  }

  // ── 문제 창 ──
  function ask(ci: number, idx: number) {
    const s = st!;
    const c = data.categories[ci];
    const it = c.items[idx];
    const key = `${ci}-${idx}`;
    const pts = POINTS[it.lv as 'C'];
    let timer: number | null = null;
    let left = s.seconds;

    const timeEl = h('span', { class: 'bd-time' }, String(left));
    const timeBtn = h('button', { class: 'btn big', onclick: () => toggleTimer() }, '⏱ 시작');
    function toggleTimer() {
      if (timer) {
        clearInterval(timer);
        timer = null;
        timeBtn.textContent = '⏱ 계속';
        return;
      }
      if (left <= 0) left = s.seconds;
      timeBtn.textContent = '⏸ 멈춤';
      timer = window.setInterval(() => {
        left--;
        timeEl.textContent = String(Math.max(0, left));
        timeEl.classList.toggle('low', left <= 5);
        if (left <= 0) {
          clearInterval(timer!);
          timer = null;
          timeBtn.textContent = '⏱ 다시';
          timeEl.textContent = '끝!';
        }
      }, 1000);
    }

    const answerBox = h('div', { class: 'bd-answer', hidden: true },
      h('div', { class: 'bd-answer-label' }, '정답'),
      h('div', { class: 'bd-answer-text' }, it.answer),
      it.explain ? h('p', null, it.explain) : null,
      h('div', { class: 'bd-award' },
        h('span', null, '맞힌 모둠은?'),
        s.teams.map((t, i) => h('button', { class: 'bd-award-btn', style: { background: TEAM_COLORS[i] }, onclick: () => award(i) }, `${TEAM_EMOJI[i]} ${t.name} +${pts}`)),
        h('button', { class: 'bd-award-btn none', onclick: () => award(-1) }, '아무도 못 맞혔어요'),
      ),
    );
    const reveal = h('button', { class: 'btn primary big', onclick: () => { answerBox.hidden = false; reveal.remove(); if (timer) toggleTimer(); } }, '정답 보기');

    let visual: HTMLElement | null = null;
    if (it.photo) visual = photoFigure(it.photo);
    if (it.chart) {
      const city = data.climate[it.chart];
      visual = climateChart(city, { title: it.hideChartName ? '어느 도시일까요?' : `${city.name} (${city.country})` });
    }

    const overlay = h('div', { class: 'bd-overlay', role: 'dialog', 'aria-modal': 'true' },
      h('div', { class: 'bd-q-box lv-' + it.lv + (visual ? ' has-visual' : '') },
        h('button', { class: 'bd-close', 'aria-label': '닫기', onclick: close }, '✕'),
        h('div', { class: 'bd-q-meta' }, c.emoji, ' ', c.name, ' · ', `${pts}점`, ' · ', TIER_NAME[it.lv as 'C']),
        h('div', { class: 'bd-q-body' },
          visual ? h('div', { class: 'bd-q-visual' }, visual) : null,
          h('div', { class: 'bd-q-main' },
            h('p', { class: 'bd-q' }, it.q),
            it.sayAudio ? h('div', { class: 'bd-q-actions' }, h('button', { class: 'btn primary big', onclick: () => playLines([it.sayAudio]) }, '🔊 듣기'), h('button', { class: 'btn big ghost', onclick: () => playLines([it.sayAudio], 0.75) }, '🐢 천천히')) : null,
            h('div', { class: 'bd-q-actions' }, timeEl, timeBtn, reveal),
            answerBox,
          ),
        ),
      ),
    );
    function close() {
      if (timer) clearInterval(timer);
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    function award(team: number) {
      s.used[key] = team;
      if (team >= 0) s.teams[team].score += pts;
      s.history.push({ tile: key, team, pts });
      save();
      close();
      main();
      if (team >= 0) celebrate(TEAM_COLORS[team]);
    }
    document.addEventListener('keydown', onKey);
    document.body.append(overlay);
  }

  function celebrate(color: string) {
    const layer = h('div', { class: 'confetti', 'aria-hidden': 'true' });
    for (let i = 0; i < 40; i++) {
      layer.append(h('i', { style: { left: Math.random() * 100 + '%', background: i % 2 ? color : '#f2a516', animationDelay: Math.random() * 0.4 + 's', transform: `rotate(${Math.random() * 360}deg)` } }));
    }
    document.body.append(layer);
    setTimeout(() => layer.remove(), 1800);
  }

  if (st) main();
  else setup();
}
