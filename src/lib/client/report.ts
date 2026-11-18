// 탐험 리포트: 성취기준별·범주별로 도달한 탐험 단계를 계산해요.
// 기준: 그 단계(C/B/A) 문제를 3개 이상 풀었고, 처음에 맞힌 비율이 70% 이상이면 '해냈어요'.
import { h, readJSON } from './dom';
import * as store from './store';
import type { Tier } from './store';

const TIERS: Record<Tier, { emoji: string; name: string }> = {
  C: { emoji: '🧭', name: '살펴보기' },
  B: { emoji: '🔎', name: '조사하기' },
  A: { emoji: '🏅', name: '분석하기' },
};
const PASS = 0.7;
const MIN = 3;

type Agg = Record<Tier, { ok: number; total: number }>;
const emptyAgg = (): Agg => ({ C: { ok: 0, total: 0 }, B: { ok: 0, total: 0 }, A: { ok: 0, total: 0 } });
function reached(a: Agg): Tier | null {
  let best: Tier | null = null;
  for (const t of store.TIER_ORDER) if (a[t].total >= MIN && a[t].ok / a[t].total >= PASS) best = t;
  return best;
}
const pct = (x: { ok: number; total: number }) => (x.total ? Math.round((x.ok / x.total) * 100) : 0);

export function renderReport() {
  const unit = readJSON<any>('report-data');
  const root = document.getElementById('report')!;
  const runs = store.runsFor(unit.id);
  const gameTitle = (id: string) => unit.games[id]?.title ?? id;

  // 성취기준별
  const byStd: Record<string, Agg> = {};
  const byCat: Record<string, Agg> = {};
  const evidence: Record<string, { game: string; stage: string; tier: Tier; ok: number; total: number }[]> = {};
  for (const { game, tier, stage, run } of runs) {
    for (const r of run.results) {
      (byStd[r.std] ??= emptyAgg())[r.lv].ok += r.ok ? 1 : 0;
      byStd[r.std][r.lv].total++;
      (byCat[r.cat] ??= emptyAgg())[r.lv].ok += r.ok ? 1 : 0;
      byCat[r.cat][r.lv].total++;
    }
    const stds = new Set(run.results.map((r) => r.std));
    for (const sd of stds) {
      const rs = run.results.filter((r) => r.std === sd);
      (evidence[sd] ??= []).push({ game, stage, tier, ok: rs.filter((r) => r.ok).length, total: rs.length });
    }
  }

  const nick = h('input', { type: 'text', value: store.getNick(), placeholder: '별명 (선택, 인쇄할 때 보여요)', maxlength: 20, style: { maxWidth: '280px' } }) as HTMLInputElement;
  nick.addEventListener('change', () => store.setNick(nick.value.trim()));

  root.replaceChildren(
    h('div', { class: 'no-print', style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' } },
      nick,
      h('button', { class: 'btn', onclick: () => window.print() }, '🖨️ 인쇄·PDF로 저장'),
    ),
    h('p', { class: 'muted' }, '게임 기록은 이 기기 안에만 있어요. 선생님께 보여 드리거나 인쇄해서 탐험 포트폴리오로 쓸 수 있어요.'),
  );

  // 성취기준 카드
  const grid = h('div', { class: 'report-grid' });
  for (const sd of unit.standards) {
    const agg = byStd[sd.code] ?? emptyAgg();
    const t = reached(agg);
    const card = h('section', { class: 'std-card' },
      h('div', { class: 'std-code' }, `[${sd.code}] ${sd.short}`),
      h('div', { class: 'std-reached' },
        t ? h('span', { class: `std-badge tier-${t}` }, `${TIERS[t].emoji} ${TIERS[t].name}`) : h('span', { class: 'std-badge none' }, '🚶 탐험 중'),
        t ? h('span', null, '단계까지 해냈어요!') : h('span', { class: 'muted' }, `한 단계에서 문제를 ${MIN}개 이상 풀고 처음에 ${PASS * 100}% 이상 맞히면 단계가 채워져요.`),
      ),
      t ? h('p', { class: 'std-level-text' }, sd.levels[t], ' ', h('span', { class: 'lvl-ref' }, `(성취수준 ${t} 참고)`)) : null,
    );
    const ev = evidence[sd.code] ?? [];
    if (ev.length) {
      const tbl = h('table', { class: 'evidence' },
        h('thead', null, h('tr', null, h('th', null, '게임'), h('th', null, '단계'), h('th', null, '처음에 맞힘'))),
        h('tbody', null, ev.sort((a, b) => a.game.localeCompare(b.game)).map((e) =>
          h('tr', null,
            h('td', null, gameTitle(e.game), unit.games[e.game]?.stages?.[e.stage] ? ` — ${unit.games[e.game].stages[e.stage]}` : ''),
            h('td', null, `${TIERS[e.tier].emoji} ${TIERS[e.tier].name}`),
            h('td', null, h('span', { class: 'bar-mini', style: { width: `${Math.max(4, (e.ok / e.total) * 80)}px` } }), `${e.ok} / ${e.total}`),
          ),
        )),
      );
      card.append(tbl);
    }
    grid.append(card);
  }
  root.append(h('h2', { class: 'sec-title' }, '🎯 성취기준별 탐험 단계'), grid);

  // 범주별
  const notes = store.getNotes(unit.id);
  const answered = notes.filter((n) => n.a && n.a.trim()).length;
  const valueTier: Tier | null = answered >= 1 ? 'A' : notes.length >= 3 ? 'B' : notes.length >= 1 ? 'C' : null;
  const catGrid = h('div', { class: 'cat-grid' });
  for (const cat of ['지식·이해', '과정·기능', '가치·태도']) {
    const t = cat === '가치·태도' ? valueTier : reached(byCat[cat] ?? emptyAgg());
    const agg = byCat[cat];
    catGrid.append(h('div', { class: 'cat-card' },
      h('h3', null, cat),
      t ? h('span', { class: `std-badge tier-${t}` }, `${TIERS[t].emoji} ${TIERS[t].name}`) : h('span', { class: 'std-badge none' }, '🚶 탐험 중'),
      h('p', { class: 'std-level-text' }, t ? unit.domainLevels[t][cat] : ''),
      cat === '가치·태도'
        ? h('p', { class: 'muted' }, `질문 수첩: 질문 ${notes.length}개 · 스스로 조사한 답 ${answered}개`)
        : agg ? h('p', { class: 'muted' }, store.TIER_ORDER.filter((x) => agg[x].total).map((x) => `${TIERS[x].name} ${pct(agg[x])}%`).join(' · ')) : null,
    ));
  }
  root.append(h('h2', { class: 'sec-title' }, `🧩 영역별 (${unit.domain})`), catGrid);

  // 질문 수첩
  const list = h('ul', { class: 'note-list' });
  if (!notes.length) list.append(h('li', { class: 'empty' }, '아직 적은 질문이 없어요. 게임을 마칠 때 궁금한 것을 적어 보세요.'));
  for (const n of notes) list.append(h('li', { class: 'note-item' }, h('div', { class: 'nq' }, '❓ ', n.q), n.a ? h('div', null, '💡 ', n.a) : null));
  root.append(h('h2', { class: 'sec-title' }, '📓 탐험 질문 수첩'), list);

  root.append(h('p', { class: 'muted', style: { marginTop: '24px', fontSize: '0.85rem' } },
    '※ 탐험 단계는 게임 기록으로 계산한 참고 자료예요. 성취수준은 선생님의 관찰, 발표, 활동지와 함께 판단해요. 가치·태도는 질문 수첩(질문 1개 이상 → 살펴보기, 3개 이상 → 조사하기, 스스로 조사한 답 → 분석하기)으로 보여 줘요.'));
}

// 질문 수첩 페이지
export function renderNotebook() {
  const unit = readJSON<any>('report-data');
  const root = document.getElementById('notebook')!;
  const draw = () => {
    const notes = store.getNotes(unit.id).slice().reverse();
    const q = h('textarea', { rows: 2, maxlength: 200, placeholder: '세계의 자연환경에 대해 궁금한 것을 적어요.' }) as HTMLTextAreaElement;
    const add = h('button', { class: 'btn primary', onclick: () => {
      if (!q.value.trim()) return q.focus();
      store.addNote({ unit: unit.id, q: q.value.trim() });
      draw();
    } }, '질문 적기');
    const list = h('ul', { class: 'note-list' });
    if (!notes.length) list.append(h('li', { class: 'empty' }, '아직 적은 질문이 없어요.'));
    for (const n of notes) {
      const a = h('textarea', { rows: 2, maxlength: 300, placeholder: '스스로 조사한 답 (사회과 부도·교과서·검색)' }) as HTMLTextAreaElement;
      a.value = n.a ?? '';
      const saved = h('span', { class: 'note-saved', 'aria-live': 'polite' });
      list.append(h('li', { class: 'note-item' },
        h('div', { class: 'meta' }, n.game ? `${unit.games[n.game]?.title ?? ''}` : '직접 적은 질문', ' · ', new Date(n.at).toLocaleDateString('ko-KR')),
        h('div', { class: 'nq' }, '❓ ', n.q),
        h('label', null, '💡 내가 조사한 답', a),
        h('div', { class: 'row' }, saved,
          h('button', { class: 'btn small', onclick: () => { store.updateNote(n.id, { a: a.value.trim() }); saved.textContent = '저장했어요!'; } }, '답 저장'),
          h('button', { class: 'btn ghost small', onclick: () => { store.deleteNote(n.id); draw(); } }, '지우기'),
        ),
      ));
    }
    root.replaceChildren(
      h('section', { class: 'note-box' }, h('h2', null, '✏️ 새 질문'), q, h('div', { class: 'note-actions' }, add)),
      h('h2', { class: 'sec-title' }, `내 질문 ${notes.length}개`),
      list,
    );
  };
  draw();
}
