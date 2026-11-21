// 탐험 빙고: 전자칠판(설명 보여 주기)과 학생 태블릿(빙고판)
import { h, readJSON, shuffle } from './dom';
import { playLines } from './english';

// ───────────── 전자칠판: 설명을 하나씩 보여 주고 정답 공개 ─────────────
export function startBingoBoard() {
  const data = readJSON<any>('game-data');
  const KEY = 'class-games:board:' + data.id;
  const app = document.getElementById('board')!;
  type S = { order: number[]; idx: number; revealed: boolean; seconds: number };
  let st: S | null = null;
  try { st = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} };
  let timer: number | null = null;

  function setup() {
    let seconds = st?.seconds ?? 15;
    const row = h('div', { class: 'bd-choices' });
    const draw = () => row.replaceChildren(...[10, 15, 20, 30].map((k) => h('button', { class: 'bd-choice' + (k === seconds ? ' on' : ''), onclick: () => { seconds = k; draw(); } }, `${k}초`)));
    draw();
    app.replaceChildren(
      h('div', { class: 'bd-setup' },
        h('div', { class: 'bd-logo' }, data.emoji),
        h('h1', null, data.title),
        h('ol', { class: 'bg-howto' },
          h('li', null, '학생은 태블릿에서 ', h('b', null, '「내 빙고판」'), '을 열고 낱말 ', String(data.size * data.size), '개로 빙고판을 채워요.'),
          h('li', null, '선생님이 설명을 보여 주면, 학생은 어떤 낱말인지 생각해요.'),
          h('li', null, '정답을 공개하면, 그 낱말이 내 빙고판에 있는 학생만 표시해요.'),
          h('li', null, '가로·세로·대각선 한 줄이 모두 표시되면 「빙고!」'),
        ),
        h('h2', null, '생각할 시간'), row,
        h('div', { class: 'bd-setup-actions' },
          st && st.idx < st.order.length ? h('button', { class: 'btn big', onclick: () => main() }, '이어서 하기') : null,
          h('button', { class: 'btn primary big', onclick: () => {
            st = { order: shuffle(data.words.map((_: any, i: number) => i)), idx: 0, revealed: false, seconds };
            save();
            main();
          } }, '시작하기'),
        ),
        h('p', { class: 'muted' }, '학생용 주소: ', h('b', null, location.origin + data.cardUrl)),
        h('a', { class: 'bd-back', href: data.unitUrl }, '← 탐험 지도로'),
      ),
    );
  }

  function main() {
    const s0 = st!;
    if (timer) clearInterval(timer);
    const w = data.words[s0.order[s0.idx]];
    const called = s0.order.slice(0, s0.idx + (s0.revealed ? 1 : 0)).map((i) => data.words[i].word);
    let left = s0.seconds;
    const time = h('span', { class: 'bd-time' }, String(left));
    if (!s0.revealed) {
      timer = window.setInterval(() => {
        left--;
        time.textContent = left > 0 ? String(left) : '끝!';
        time.classList.toggle('low', left <= 3);
        if (left <= 0 && timer) clearInterval(timer);
      }, 1000);
    }
    const last = s0.idx >= s0.order.length - 1;
    app.replaceChildren(
      h('div', { class: 'bd-main' },
        h('header', { class: 'bd-head' },
          h('h1', null, data.emoji, ' ', data.title),
          h('div', { class: 'bd-tools' },
            h('button', { class: 'btn small ghost', onclick: () => document.documentElement.requestFullscreen?.().catch(() => {}) }, '⛶ 전체 화면'),
            h('button', { class: 'btn small ghost', onclick: () => { if (timer) clearInterval(timer); setup(); } }, '⚙ 처음 설정'),
          ),
        ),
        h('div', { class: 'bg-stage' },
          h('div', { class: 'bg-clue-box' },
            h('div', { class: 'bg-no' }, `설명 ${s0.idx + 1} / ${s0.order.length}`),
            w.audio
              ? h('div', { class: 'bg-listen' },
                  h('button', { class: 'btn primary big', onclick: () => playLines([w.audio]) }, '🔊 듣기'),
                  h('button', { class: 'btn big ghost', onclick: () => playLines([w.audio], 0.75) }, '🐢 천천히'),
                  s0.revealed ? h('p', { class: 'bg-clue', lang: 'en' }, w.clue) : h('p', { class: 'bg-clue muted' }, '잘 듣고 알맞은 낱말을 찾아보세요.'))
              : h('p', { class: 'bg-clue' }, w.clue),
            s0.revealed
              ? h('div', { class: 'bg-word' }, w.word)
              : h('div', { class: 'bd-q-actions' }, time, h('button', { class: 'btn primary big', onclick: () => { s0.revealed = true; save(); main(); } }, '정답 공개')),
            s0.revealed
              ? h('div', { class: 'bd-q-actions' },
                  h('p', { class: 'bg-tip' }, '내 빙고판에 이 낱말이 있으면 눌러서 표시해요!'),
                  last ? h('button', { class: 'btn big', onclick: setup }, '처음으로') : h('button', { class: 'btn primary big', onclick: () => { s0.idx++; s0.revealed = false; save(); main(); } }, '다음 설명 ▶'))
              : null,
          ),
          h('aside', { class: 'bg-called' },
            h('h2', null, `나온 낱말 ${called.length}개`),
            h('p', { class: 'muted' }, '"빙고!"를 외친 학생의 빙고판과 맞춰 보세요.'),
            h('ul', null, called.map((c) => h('li', null, c))),
          ),
        ),
      ),
    );
  }

  if (st && st.idx < st.order.length) main();
  else setup();
}

// ───────────── 학생 태블릿: 내 빙고판 ─────────────
export function startBingoCard() {
  const data = readJSON<any>('game-data');
  const KEY = 'class-games:bingo:' + data.id;
  const app = document.getElementById('app')!;
  const N = data.size;
  const words: string[] = data.words.map((w: any) => w.word);
  type S = { cells: (string | null)[]; marked: boolean[]; playing: boolean; lines: number };
  let st: S;
  try { st = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { st = null as any; }
  if (!st || st.cells?.length !== N * N) st = { cells: Array(N * N).fill(null), marked: Array(N * N).fill(false), playing: false, lines: 0 };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} };

  function countLines() {
    const m = st.marked;
    let n = 0;
    for (let r = 0; r < N; r++) if ([...Array(N)].every((_, c) => m[r * N + c])) n++;
    for (let c = 0; c < N; c++) if ([...Array(N)].every((_, r) => m[r * N + c])) n++;
    if ([...Array(N)].every((_, i) => m[i * N + i])) n++;
    if ([...Array(N)].every((_, i) => m[i * N + (N - 1 - i)])) n++;
    return n;
  }

  function fill() {
    const filled = st.cells.filter(Boolean).length;
    const bank = h('div', { class: 'bg-bank' },
      words.map((w) => {
        const used = st.cells.includes(w);
        return h('button', { class: 'bg-chip' + (used ? ' used' : ''), disabled: used || filled >= N * N, onclick: () => {
          const i = st.cells.indexOf(null);
          if (i < 0) return;
          st.cells[i] = w;
          save();
          fill();
        } }, w);
      }),
    );
    const grid = h('div', { class: 'bg-grid', style: { gridTemplateColumns: `repeat(${N}, 1fr)` } },
      st.cells.map((c, i) => h('button', { class: 'bg-cell' + (c ? ' filled' : ''), 'aria-label': c ? `${c} 빼기` : '빈칸', onclick: () => { if (c) { st.cells[i] = null; save(); fill(); } } }, c ?? '')),
    );
    app.replaceChildren(
      h('div', { class: 'bg-card' },
        h('h1', { class: 'mh-title' }, data.emoji, ' 내 빙고판 만들기'),
        h('p', { class: 'muted' }, `아래 낱말을 눌러 빙고판 ${N * N}칸을 채워요. 잘못 넣은 칸은 다시 누르면 빠져요. (${filled} / ${N * N})`),
        grid,
        h('div', { class: 'r-actions' },
          h('button', { class: 'btn ghost', onclick: () => { st.cells = Array(N * N).fill(null); save(); fill(); } }, '모두 지우기'),
          h('button', { class: 'btn', onclick: () => {
            const rest = shuffle(words.filter((w) => !st.cells.includes(w)));
            st.cells = st.cells.map((c) => c ?? rest.shift() ?? null);
            save();
            fill();
          } }, '🎲 남은 칸 자동으로 채우기'),
          h('button', { class: 'btn primary', disabled: filled < N * N, onclick: () => { st.playing = true; st.marked = Array(N * N).fill(false); st.lines = 0; save(); play(); } }, '완성! 빙고 시작'),
        ),
        h('h2', { class: 'sec-title' }, '낱말 고르기'),
        bank,
      ),
    );
  }

  function play() {
    const lines = countLines();
    const grid = h('div', { class: 'bg-grid play', style: { gridTemplateColumns: `repeat(${N}, 1fr)` } },
      st.cells.map((c, i) => h('button', {
        class: 'bg-cell filled' + (st.marked[i] ? ' marked' : ''),
        'aria-pressed': String(st.marked[i]),
        onclick: () => {
          st.marked[i] = !st.marked[i];
          const before = st.lines;
          st.lines = countLines();
          save();
          play();
          if (st.lines > before) cheer(st.lines);
        },
      }, c)),
    );
    app.replaceChildren(
      h('div', { class: 'bg-card' },
        h('h1', { class: 'mh-title' }, data.emoji, ' 내 빙고판'),
        h('p', { class: 'bg-lines' }, lines ? `🎉 빙고 ${lines}줄!` : '전자칠판에서 정답이 공개되면, 그 낱말을 눌러 표시해요.'),
        grid,
        h('div', { class: 'r-actions' },
          h('button', { class: 'btn ghost', onclick: () => { st.playing = false; save(); fill(); } }, '빙고판 다시 만들기'),
          h('a', { class: 'btn ghost', href: data.unitUrl }, '🗺️ 탐험 지도로'),
        ),
      ),
    );
  }

  function cheer(n: number) {
    const el = h('div', { class: 'bg-cheer', role: 'status' }, `빙고! ${n}줄 🎉`);
    document.body.append(el);
    setTimeout(() => el.remove(), 1600);
  }

  st.playing ? play() : fill();
}
