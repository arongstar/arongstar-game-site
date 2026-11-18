// 전자칠판: 줌아웃! 여기는 어디? — 확대된 사진이 점점 넓어지면 모둠이 맞혀요 (빨리 맞힐수록 높은 점수)
import { h, s, readJSON, shuffle } from './dom';

const TEAM_COLORS = ['#e4572e', '#2f6fb3', '#2f8f5b', '#b5651d', '#7b4bb3', '#d1397a'];
const TEAM_EMOJI = ['🦊', '🐳', '🐢', '🦁', '🦉', '🐙'];
const ZOOMS = [6, 3.4, 1.9, 1];
const POINTS = [300, 200, 100, 50];

interface State {
  teams: { name: string; score: number }[];
  order: number[]; // 라운드 순서
  idx: number;
  votes: Record<string, number>; // 가 보고 싶은 사람 수
}

export function startZoomout() {
  const data = readJSON<any>('game-data');
  const KEY = 'class-games:board:' + data.id;
  const app = document.getElementById('board')!;
  let st: State | null = null;
  try {
    st = JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {}
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(st));
    } catch {}
  };

  function setup() {
    let n = st?.teams.length ?? 4;
    let rounds = Math.min(8, data.rounds.length);
    const teamRow = h('div', { class: 'bd-choices' });
    const roundRow = h('div', { class: 'bd-choices' });
    const draw = () => {
      teamRow.replaceChildren(...[2, 3, 4, 5, 6].map((k) => h('button', { class: 'bd-choice' + (k === n ? ' on' : ''), onclick: () => { n = k; draw(); } }, `${k}모둠`)));
      const opts = [...new Set([5, 8, data.rounds.length])].filter((k) => k <= data.rounds.length);
      roundRow.replaceChildren(...opts.map((k) => h('button', { class: 'bd-choice' + (k === rounds ? ' on' : ''), onclick: () => { rounds = k; draw(); } }, k === data.rounds.length ? `전체 ${k}곳` : `${k}곳`)));
    };
    draw();
    app.replaceChildren(
      h('div', { class: 'bd-setup' },
        h('div', { class: 'bd-logo', 'aria-hidden': 'true' }, data.emoji),
        h('h1', null, data.title),
        h('p', null, '아주 크게 확대된 사진에서 시작해요. 한 번씩 넓어질 때마다 점수가 줄어요. 빨리 알아맞힐수록 높은 점수!'),
        h('p', { class: 'zo-points' }, POINTS.map((p, i) => h('span', null, `${i + 1}단계 ${p}점`))),
        h('h2', null, '모둠 수'), teamRow,
        h('h2', null, '몇 곳을 탐험할까요?'), roundRow,
        h('div', { class: 'bd-setup-actions' },
          st && st.idx < st.order.length ? h('button', { class: 'btn big', onclick: () => round() }, '이어서 하기') : null,
          h('button', { class: 'btn primary big', onclick: () => {
            st = {
              teams: Array.from({ length: n }, (_, i) => ({ name: `${i + 1}모둠`, score: 0 })),
              order: shuffle(data.rounds.map((_: any, i: number) => i)).slice(0, rounds),
              idx: 0,
              votes: {},
            };
            save();
            round();
          } }, '탐험 시작'),
        ),
        h('a', { class: 'bd-back', href: data.unitUrl }, '← 탐험 지도로'),
      ),
    );
  }

  function teamBar() {
    return h('div', { class: 'bd-teams' },
      st!.teams.map((t, i) => h('div', { class: 'bd-team', style: { borderColor: TEAM_COLORS[i] } },
        h('span', { class: 'bd-team-name', style: { color: TEAM_COLORS[i] } }, TEAM_EMOJI[i], ' ', t.name),
        h('span', { class: 'bd-team-score' }, t.score.toLocaleString()),
      )),
    );
  }

  function round() {
    const s0 = st!;
    if (s0.idx >= s0.order.length) return finish();
    const r = data.rounds[s0.order[s0.idx]];
    const a = data.atlas[r.atlas];
    let level = 0;
    let revealed = false;

    const img = h('img', { src: a.photo?.src, alt: '확대된 사진', class: 'zo-img' }) as HTMLImageElement;
    img.style.transformOrigin = `${r.focus[0]}% ${r.focus[1]}%`;
    const frame = h('div', { class: 'zo-frame' }, img);
    const levelOut = h('div', { class: 'zo-level' });
    const zoomBtn = h('button', { class: 'btn big', onclick: () => { if (level < ZOOMS.length - 1) { level++; apply(); } } });
    const side = h('div', { class: 'zo-side' });

    function apply() {
      img.style.transform = `scale(${revealed ? 1 : ZOOMS[level]})`;
      levelOut.replaceChildren(
        h('div', { class: 'zo-steps' }, ZOOMS.map((_, i) => h('span', { class: 'zo-step' + (i === level ? ' on' : i < level ? ' past' : '') }, `${POINTS[i]}`))),
        h('div', { class: 'zo-now' }, revealed ? '정답 공개!' : `지금 맞히면 ${POINTS[level]}점`),
      );
      zoomBtn.textContent = level < ZOOMS.length - 1 ? `🔍 더 넓게 보기 (${POINTS[level + 1]}점)` : '사진 전체가 보여요';
      (zoomBtn as HTMLButtonElement).disabled = revealed || level >= ZOOMS.length - 1;
    }

    function reveal() {
      revealed = true;
      apply();
      const pts = POINTS[level];
      const map = s('svg', { viewBox: data.map.viewBox, class: 'map-svg zo-map', 'aria-label': '위치' });
      map.append(s('rect', { x: 0, y: 0, width: 1000, height: 500, class: 'sea' }), s('path', { d: data.map.path, class: 'land' }));
      const pin = s('g', { transform: `translate(${a.x} ${a.y})`, class: 'pin right' });
      pin.append(s('circle', { r: 14, class: 'pin-c' }));
      map.append(pin);
      const voteOut = h('b', null, String(s0.votes[r.atlas] ?? 0));
      const vote = (d: number) => {
        s0.votes[r.atlas] = Math.max(0, (s0.votes[r.atlas] ?? 0) + d);
        voteOut.textContent = String(s0.votes[r.atlas]);
        save();
      };
      const awardRow = h('div', { class: 'bd-award' },
        h('span', null, '맞힌 모둠은?'),
        s0.teams.map((t, i) => h('button', { class: 'bd-award-btn', style: { background: TEAM_COLORS[i] }, onclick: (e: Event) => {
          t.score += pts;
          save();
          awardRow.replaceChildren(h('span', { class: 'zo-awarded' }, `${TEAM_EMOJI[i]} ${t.name} +${pts}점!`));
          bottom.replaceChildren(teamBar());
          (e.target as HTMLElement).blur();
        } }, `${TEAM_EMOJI[i]} ${t.name} +${pts}`)),
        h('button', { class: 'bd-award-btn none', onclick: () => awardRow.replaceChildren(h('span', { class: 'zo-awarded' }, '이번에는 아무도 못 맞혔어요')) }, '아무도 못 맞혔어요'),
      );
      side.replaceChildren(
        h('div', { class: 'zo-answer' },
          h('span', { class: `zo-type t-${a.type}` }, a.type),
          h('h2', null, a.name),
          h('p', { class: 'zo-country' }, '📍 ', a.country),
          map,
          h('p', null, a.feature),
        ),
        awardRow,
        h('div', { class: 'zo-talk' },
          h('div', { class: 'zo-vote' }, '🙋 여기에 가 보고 싶은 사람? ',
            h('button', { class: 'btn small ghost', onclick: () => vote(-1), 'aria-label': '한 명 빼기' }, '－'), voteOut,
            h('button', { class: 'btn small', onclick: () => vote(1), 'aria-label': '한 명 더하기' }, '＋')),
          h('p', null, '💬 ', r.question ?? '이곳에 대해 더 알고 싶은 것을 말해 보세요. 탐험 질문 수첩에 적어 두어요!'),
        ),
        h('button', { class: 'btn primary big', onclick: () => { s0.idx++; save(); round(); } }, s0.idx + 1 >= s0.order.length ? '결과 보기 ▶' : '다음 장소 ▶'),
      );
    }

    side.append(
      h('p', { class: 'zo-ask' }, '여기는 어디일까요? 어떤 지형일까요?'),
      levelOut,
      zoomBtn,
      h('button', { class: 'btn primary big', onclick: reveal }, '정답 공개'),
    );
    const bottom = h('div', null, teamBar());
    app.replaceChildren(
      h('div', { class: 'bd-main' },
        h('header', { class: 'bd-head' },
          h('h1', null, data.emoji, ' ', data.title, h('span', { class: 'zo-round' }, `${s0.idx + 1} / ${s0.order.length}`)),
          h('div', { class: 'bd-tools' },
            h('button', { class: 'btn small ghost', onclick: () => document.documentElement.requestFullscreen?.().catch(() => {}) }, '⛶ 전체 화면'),
            h('button', { class: 'btn small ghost', onclick: setup }, '⚙ 처음 설정'),
          ),
        ),
        h('div', { class: 'zo-stage' }, frame, side),
        bottom,
      ),
    );
    apply();
  }

  function finish() {
    const s0 = st!;
    const ranked = s0.teams.map((t, i) => ({ ...t, i })).sort((a, b) => b.score - a.score);
    const total = s0.teams.reduce((a, t) => a + t.score, 0);
    const top = Object.entries(s0.votes).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
    app.replaceChildren(
      h('div', { class: 'bd-setup zo-final' },
        h('div', { class: 'bd-logo' }, '🏆'),
        h('h1', null, '탐험 완료!'),
        h('p', null, `우리 반이 함께 모은 점수 ${total.toLocaleString()}점`),
        h('ol', { class: 'zo-rank' }, ranked.map((t) => h('li', { style: { borderColor: TEAM_COLORS[t.i] } }, `${TEAM_EMOJI[t.i]} ${t.name}`, h('b', null, `${t.score}점`)))),
        top.length
          ? h('div', null, h('h2', null, '🙋 우리 반이 가장 가 보고 싶은 곳'), h('ol', { class: 'zo-top' }, top.map(([id, v]) => h('li', null, `${data.atlas[id].name} (${v}명)`))))
          : null,
        h('p', { class: 'muted' }, '이 단원에서 이곳들의 지형과 사람들의 생활 모습을 하나씩 탐험해 봐요!'),
        h('div', { class: 'bd-setup-actions' }, h('button', { class: 'btn primary big', onclick: () => { st = null; save(); setup(); } }, '새로 하기')),
        h('a', { class: 'bd-back', href: data.unitUrl }, '← 탐험 지도로'),
      ),
    );
  }

  if (st && st.idx < st.order.length) round();
  else setup();
}
