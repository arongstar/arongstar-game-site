// 개인 태블릿용 미션 게임 (지형 도감 · 이 마을에 살려면? · 기후 그래프 탐정)
import { h, s, shuffle, readJSON, photoFigure } from './dom';
import { climateChart, markMonth } from './chart';
import { sunSim } from './sun';
import { houseArt, clothesArt } from './art';
import * as store from './store';
import type { Tier, StepResult } from './store';

const TIERS: Record<Tier, { emoji: string; name: string; desc: string }> = {
  C: { emoji: '🧭', name: '살펴보기', desc: '사진·지도·그래프를 살펴보고 특징을 찾아요' },
  B: { emoji: '🔎', name: '조사하기', desc: '자료를 조사해 생활 모습과 그 까닭을 설명해요' },
  A: { emoji: '🏅', name: '분석하기', desc: '여러 자료를 비교·분석하고 새로운 곳에 적용해요' },
};
const LABELS = ['가', '나', '다', '라'];

type Data = ReturnType<typeof readData>;
function readData() {
  return readJSON<any>('game-data');
}

export function startMission() {
  const data = readData();
  const app = document.getElementById('app')!;
  const params = new URLSearchParams(location.search);
  let tier: Tier = (params.get('tier') as Tier) || store.getLastTier(data.id) || 'C';
  if (!TIERS[tier]) tier = 'C';
  const focusStage = params.get('stage');

  const go = (el: HTMLElement) => {
    app.replaceChildren(el);
    window.scrollTo({ top: 0 });
  };

  // ───────────── 첫 화면 ─────────────
  function home() {
    const stageIds = data.stages.map((x: any) => x.id);
    const wrap = h('div', { class: 'mission-home' });

    wrap.append(
      h(
        'header',
        { class: 'mh-head' },
        h('div', { class: 'mh-emoji', 'aria-hidden': 'true' }, data.emoji),
        h('div', null, h('h1', { class: 'mh-title' }, data.title), h('p', { class: 'mh-story' }, data.story)),
      ),
    );

    // 단계 고르기
    const tierBox = h('section', { class: 'tier-pick', 'aria-label': '탐험 단계 고르기' });
    const prog = store.tierProgress(data.unitId, data.id, stageIds);
    const recommended: Tier = prog.C === 0 ? 'C' : prog.B === 0 ? 'B' : 'A';
    tierBox.append(h('h2', { class: 'sec-title' }, '탐험 단계를 골라요'));
    const row = h('div', { class: 'tier-row' });
    for (const t of store.TIER_ORDER) {
      const btn = h(
        'button',
        {
          class: `tier-card tier-${t}` + (t === tier ? ' on' : ''),
          'aria-pressed': t === tier ? 'true' : 'false',
          onclick: () => {
            tier = t;
            store.setLastTier(data.id, t);
            go(home());
          },
        },
        h('span', { class: 'tc-emoji' }, TIERS[t].emoji),
        h('span', { class: 'tc-name' }, TIERS[t].name),
        h('span', { class: 'tc-desc' }, TIERS[t].desc),
        h('span', { class: 'tc-prog' }, `${prog[t]} / ${stageIds.length} 완료`),
        t === recommended ? h('span', { class: 'tc-reco' }, '추천') : null,
      );
      row.append(btn);
    }
    tierBox.append(row);
    wrap.append(tierBox);

    // 스테이지 목록
    const list = h('section', { class: 'stage-list' }, h('h2', { class: 'sec-title' }, data.stages.length > 1 ? '탐험할 곳을 골라요' : '탐험 시작'));
    for (const st of data.stages) {
      const steps = st.steps.filter((x: any) => x.lv === tier);
      const run = store.getRun(data.unitId, data.id, tier, st.id);
      const card = h(
        'button',
        {
          class: 'stage-card' + (focusStage === st.id ? ' focus' : '') + (run ? ' done' : ''),
          onclick: () => play(st),
          disabled: steps.length === 0,
        },
        h('span', { class: 'sc-emoji', 'aria-hidden': 'true' }, st.emoji),
        h(
          'span',
          { class: 'sc-body' },
          st.lesson ? h('span', { class: 'sc-lesson' }, `${st.lesson}차시`) : null,
          h('span', { class: 'sc-title' }, st.title),
          st.intro ? h('span', { class: 'sc-intro' }, st.intro) : null,
          h('span', { class: 'sc-meta' }, `${TIERS[tier].emoji} ${TIERS[tier].name} · 문제 ${steps.length}개`),
        ),
        h('span', { class: 'sc-stars', 'aria-label': run ? `별 ${run.best}개` : '아직 안 함' }, run ? stars(run.best) : '▶'),
      );
      list.append(card);
    }
    wrap.append(list);

    if (data.style === 'dex') wrap.append(dexGrid());

    wrap.append(
      h(
        'nav',
        { class: 'mh-foot' },
        h('a', { class: 'btn ghost', href: data.unitUrl }, '🗺️ 탐험 지도로'),
        h('a', { class: 'btn ghost', href: data.unitUrl + 'notebook/' }, '📓 탐험 질문 수첩'),
        h('a', { class: 'btn ghost', href: data.unitUrl + 'report/' }, '📋 탐험 리포트'),
      ),
    );

    if (focusStage) {
      requestAnimationFrame(() => wrap.querySelector('.stage-card.focus')?.scrollIntoView({ block: 'center' }));
    }
    return wrap;
  }

  // 지형 도감 카드 모음
  function dexGrid() {
    const have = new Set(store.getCards(data.unitId));
    const ids = Object.keys(data.atlas);
    const sec = h(
      'section',
      { class: 'dex' },
      h('h2', { class: 'sec-title' }, `🗂️ 나의 지형 도감 `, h('span', { class: 'dex-count' }, `${have.size} / ${ids.length}`)),
    );
    const grid = h('div', { class: 'dex-grid' });
    for (const id of ids) {
      const a = data.atlas[id];
      const got = have.has(id);
      grid.append(
        h(
          'button',
          {
            class: 'dex-card t-' + a.type + (got ? ' got' : ''),
            onclick: () => got && openCard(a),
            'aria-label': got ? `${a.name} 카드 보기` : '아직 모으지 못한 카드',
          },
          got && a.photo ? h('img', { src: a.photo.src, alt: '', loading: 'lazy' }) : h('span', { class: 'dex-q' }, '?'),
          h('span', { class: 'dex-type' }, a.type),
          h('span', { class: 'dex-name' }, got ? a.name : '???'),
        ),
      );
    }
    sec.append(grid);
    return sec;
  }

  function openCard(a: any) {
    const dlg = h(
      'div',
      { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': a.name },
      h(
        'div',
        { class: 'modal-box card-detail t-' + a.type },
        h('button', { class: 'modal-x', 'aria-label': '닫기', onclick: () => dlg.remove() }, '✕'),
        photoFigure(a.photo, { label: a.name }),
        h('div', { class: 'cd-body' },
          h('div', { class: 'cd-type' }, a.type),
          h('h3', null, a.name),
          h('p', { class: 'cd-country' }, '📍 ', a.country),
          h('h4', null, '지형의 특징'),
          h('p', null, a.feature),
          h('h4', null, '사람들의 생활 모습'),
          h('p', null, a.life),
        ),
      ),
    );
    dlg.addEventListener('click', (e) => e.target === dlg && dlg.remove());
    document.body.append(dlg);
    (dlg.querySelector('.modal-x') as HTMLElement).focus();
  }

  // ───────────── 문제 풀기 ─────────────
  function play(stage: any) {
    const steps = stage.steps.filter((x: any) => x.lv === tier);
    const results: StepResult[] = [];
    const newCards: string[] = [];
    let idx = 0;

    const screen = h('div', { class: 'play' });
    const top = h('div', { class: 'play-top' });
    const body = h('div', { class: 'play-body' });
    screen.append(top, body);

    function renderTop() {
      top.replaceChildren(
        h('button', { class: 'btn ghost small', onclick: () => go(home()), 'aria-label': '그만하고 처음 화면으로' }, '← 그만하기'),
        h('div', { class: 'pt-title' }, stage.emoji, ' ', stage.title, h('span', { class: `chip tier-${tier}` }, TIERS[tier].emoji, ' ', TIERS[tier].name)),
        h(
          'div',
          { class: 'dots', 'aria-label': `${steps.length}문제 중 ${idx + 1}번째` },
          steps.map((_: any, i: number) =>
            h('span', { class: 'dot' + (i < idx ? (results[i]?.ok ? ' ok' : ' miss') : i === idx ? ' now' : '') }),
          ),
        ),
      );
    }

    function next() {
      idx++;
      if (idx >= steps.length) return finish();
      renderStep();
    }

    function renderStep() {
      renderTop();
      const st = steps[idx];
      body.replaceChildren(stepView(st, (ok, hinted) => {
        results[idx] = { key: st.key, std: st.std, cat: st.cat, lv: st.lv, ok, hint: hinted };
        if (st.collect?.length) {
          const added = store.addCards(data.unitId, st.collect);
          newCards.push(...added);
          return added;
        }
        return [];
      }, next));
    }

    function finish() {
      const run = store.saveRun(data.unitId, data.id, tier, stage.id, results);
      go(resultView(stage, run, newCards));
    }

    go(screen);
    renderStep();
  }

  // 문제 하나
  function stepView(st: any, record: (ok: boolean, hinted: boolean) => string[], next: () => void) {
    let tries = 0;
    let hinted = false;
    let done = false;

    // 그래프·사진이 3개면 자료를 위에 넓게, 문제를 아래에 둡니다.
    const wideVisual = (st.charts?.length ?? 0) >= 3 || (st.photos?.length ?? 0) >= 3;
    const wrap = h('div', { class: 'step' + (hasVisual(st) ? (wideVisual ? ' wide-visual' : ' with-visual') : '') });
    const visual = h('div', { class: 'step-visual' });
    const panel = h('div', { class: 'step-panel' });
    const fb = h('div', { class: 'feedback', 'aria-live': 'polite' });
    const hintBox = h('div', { class: 'hint-box', hidden: true }, h('strong', null, '📒 탐험 노트 '), st.hint || '');
    const actions = h('div', { class: 'step-actions' });

    if (hasVisual(st)) wrap.append(visual);
    wrap.append(panel);
    panel.append(h('p', { class: 'q' }, st.q));

    const showHint = () => {
      if (!st.hint) return;
      hinted = true;
      hintBox.hidden = false;
    };
    const hintBtn = st.hint
      ? h('button', { class: 'btn ghost small hint-btn', onclick: () => { showHint(); hintBtn!.remove(); } }, '📒 탐험 노트 보기')
      : null;

    // 답 처리: correct=true/false. 처음 틀리면 한 번 더 기회, 두 번째도 틀리면 정답 공개
    function judge(correct: boolean, onRetry: () => void, onReveal: () => void) {
      if (done) return;
      tries++;
      if (correct) {
        finishStep(tries === 1, true);
      } else if (tries === 1) {
        fb.replaceChildren(h('div', { class: 'fb fb-retry' }, '🤔 다시 생각해 볼까요?', st.hint ? ' 탐험 노트를 펼쳐 두었어요.' : ''));
        showHint();
        hintBtn?.remove();
        wrap.classList.remove('shake');
        void wrap.offsetWidth;
        wrap.classList.add('shake');
        onRetry();
      } else {
        onReveal();
        finishStep(false, false);
      }
    }

    function finishStep(firstOk: boolean, correct: boolean) {
      done = true;
      const added = record(firstOk, hinted);
      wrap.classList.add('is-done');
      const title = correct ? (firstOk ? '🎉 정답이에요!' : '👍 맞았어요!') : '💡 정답을 확인해 보세요';
      fb.replaceChildren(
        h(
          'div',
          { class: 'fb ' + (correct ? 'fb-ok' : 'fb-reveal') },
          h('strong', null, title),
          !correct ? h('p', { class: 'fb-answer' }, '정답: ', answerText(st)) : null,
          st.explain ? h('p', null, st.explain) : null,
          added.length
            ? h('p', { class: 'fb-card' }, '🃏 새 지형 카드: ', added.map((id) => data.atlas[id]?.name).join(', '))
            : null,
        ),
      );
      actions.replaceChildren(h('button', { class: 'btn primary big', onclick: next }, '다음 ▶'));
      (actions.firstChild as HTMLElement).focus({ preventScroll: true });
      fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    // 자료 보여 주기
    if (st.sun) visual.append(sunSim());
    if (st.photo) visual.append(photoFigure(st.photo));
    if (st.photos) {
      const g = h('div', { class: 'ph-grid n' + st.photos.length });
      st.photos.forEach((p: any) => g.append(photoFigure(p, { label: p.label })));
      visual.append(g);
    }
    let chartSvgs: SVGElement[] = [];
    if (st.chart && st.type !== 'pickmonth') visual.append(chartFor(st.chart, st.hideChartName ? '어느 도시일까요?' : undefined));
    if (st.charts) {
      const g = h('div', { class: 'chart-grid n' + st.charts.length });
      st.charts.forEach((c: string, i: number) =>
        g.append(chartFor(c, st.hideChartName ? `그래프 ${LABELS[i]}` : undefined)),
      );
      visual.append(g);
    }

    // ── 문제 종류별 ──
    if (st.type === 'choice') {
      const keepOrder = st.options.every((o: any) => /^그래프 /.test(o.text)) || st.options.length <= 2;
      const opts = keepOrder ? st.options : shuffle(st.options);
      const box = h('div', { class: 'options' + (opts.some((o: any) => o.photo) ? ' with-photo' : '') + (opts.every((o: any) => o.text.length <= 14) ? ' short' : '') });
      for (const o of opts) {
        const b = h(
          'button',
          {
            class: 'opt',
            onclick: () =>
              judge(
                o.text === st.answer,
                () => {
                  b.classList.add('wrong');
                  b.setAttribute('disabled', '');
                },
                () => {
                  b.classList.add('wrong');
                  box.querySelectorAll('.opt').forEach((x) => {
                    if (x.getAttribute('data-t') === st.answer) x.classList.add('right');
                  });
                },
              ),
            'data-t': o.text,
          },
          o.photo ? photoFigure(o.photo, { small: true }) : null,
          h('span', null, o.text),
        );
        b.addEventListener('click', () => {
          if (o.text === st.answer) b.classList.add('right');
          if (done) box.querySelectorAll('.opt').forEach((x) => x.setAttribute('disabled', ''));
        });
        box.append(b);
      }
      panel.append(box);
    }

    if (st.type === 'multi') {
      panel.append(h('p', { class: 'q-sub' }, '알맞은 것을 모두 골라 [확인]을 눌러요.'));
      const sel = new Set<string>();
      const box = h('div', { class: 'options multi' });
      const btns: HTMLButtonElement[] = [];
      for (const o of shuffle(st.options)) {
        const b = h(
          'button',
          {
            class: 'opt check',
            'aria-pressed': 'false',
            onclick: () => {
              if (done) return;
              sel.has(o.text) ? sel.delete(o.text) : sel.add(o.text);
              b.classList.toggle('on', sel.has(o.text));
              b.setAttribute('aria-pressed', String(sel.has(o.text)));
              confirm.disabled = sel.size === 0;
            },
            'data-t': o.text,
          },
          h('span', { class: 'box', 'aria-hidden': 'true' }),
          h('span', null, o.text),
        ) as HTMLButtonElement;
        btns.push(b);
        box.append(b);
      }
      const answers = new Set<string>(st.answers);
      const confirm = h('button', { class: 'btn primary', disabled: true }, '확인') as HTMLButtonElement;
      confirm.onclick = () => {
        const ok = sel.size === answers.size && [...sel].every((x) => answers.has(x));
        const missing = [...answers].filter((x) => !sel.has(x)).length;
        const extra = [...sel].filter((x) => !answers.has(x)).length;
        judge(
          ok,
          () => {
            fb.append(h('p', { class: 'fb-detail' }, extra ? `고른 것 중 ${extra}개는 알맞지 않아요. ` : '', missing ? `알맞은 것을 ${missing}개 더 찾아보세요.` : ''));
          },
          () => {
            btns.forEach((b) => {
              const t = b.getAttribute('data-t')!;
              if (answers.has(t)) b.classList.add('right');
              else if (sel.has(t)) b.classList.add('wrong');
            });
          },
        );
        if (done) {
          if (ok) btns.forEach((b) => answers.has(b.getAttribute('data-t')!) && b.classList.add('right'));
          btns.forEach((b) => (b.disabled = true));
          confirm.remove();
        }
      };
      panel.append(box);
      actions.append(confirm);
    }

    if (st.type === 'sort') sortView(st, panel, actions, judge, () => done);

    if (st.type === 'pickmonth') {
      const c = data.climate[st.chart];
      let picked = false;
      const fig = climateChart(c, {
        title: `${c.name} (${c.country})`,
        pickable: true,
        onPick: (m) => {
          if (done || picked) return;
          const svg = fig.querySelector('svg')!;
          const ok = st.answer.includes(m);
          judge(
            ok,
            () => markMonth(svg, m, 'm-wrong'),
            () => {
              markMonth(svg, m, 'm-wrong');
              st.answer.forEach((a: number) => markMonth(svg, a, 'm-right'));
            },
          );
          if (ok) markMonth(svg, m, 'm-right');
          if (done) picked = true;
        },
      });
      chartSvgs.push(fig.querySelector('svg')!);
      visual.append(fig);
      panel.append(h('p', { class: 'q-sub' }, '👆 그래프에서 달을 눌러요.'));
    }

    if (st.type === 'pin') pinView(st, visual, panel, judge);

    if (st.type === 'build') buildView(st, visual, panel, actions, fb, judge, () => done);

    if (st.type === 'shop') shopView(st, panel, actions, fb, judge, () => done);

    panel.append(hintBtn ?? '', hintBox, fb, actions);
    return wrap;
  }

  function answerText(st: any): string {
    if (st.type === 'choice') return st.answer;
    if (st.type === 'multi') return st.answers.join(' / ');
    if (st.type === 'pickmonth') return st.answer.map((m: number) => `${m}월`).join(', ');
    if (st.type === 'pin') return (data.atlas[st.answer] ?? data.climate[st.answer])?.name ?? '';
    if (st.type === 'build') return st.parts.map((p: any) => `${p.label} — ${p.options.filter((o: any) => o.fit).map((o: any) => o.text).join(' 또는 ')}`).join(' / ');
    if (st.type === 'shop') return st.features.filter((f: any) => f.fit).map((f: any) => f.text).join(' / ');
    return '바구니에 바르게 옮겨 둔 카드를 확인해 보세요';
  }

  function hasVisual(st: any) {
    return !!(st.photo || st.photos || st.chart || st.charts || st.sun || st.type === 'pin' || st.type === 'build');
  }

  function chartFor(id: string, hiddenTitle?: string) {
    const c = data.climate[id];
    return climateChart(c, { title: hiddenTitle ?? `${c.name} (${c.country})` });
  }

  // 바구니에 나누어 담기 — 카드를 누른 뒤 바구니를 눌러요
  function sortView(st: any, panel: HTMLElement, actions: HTMLElement, judge: any, isDone: () => boolean) {
    panel.append(h('p', { class: 'q-sub' }, '카드를 누른 다음 알맞은 바구니를 눌러요.'));
    const place = new Map<number, string>(); // 카드 번호 → 바구니
    const locked = new Set<number>();
    let selected: number | null = null;
    const items = shuffle(st.items.map((it: any, i: number) => ({ ...it, i })));
    const tray = h('div', { class: 'tray', 'aria-label': '아직 담지 않은 카드' });
    const bins = h('div', { class: 'bins n' + st.bins.length });
    const binEls: Record<string, HTMLElement> = {};
    const cardEls: Record<number, HTMLElement> = {};

    for (const it of items) {
      cardEls[it.i] = h(
        'button',
        {
          class: 'sort-card' + (it.photo ? ' has-ph' : ''),
          onclick: (e: Event) => {
            e.stopPropagation();
            if (isDone()) return;
            // 다른 카드를 고른 채로 바구니 안의 카드를 누르면 그 바구니에 담기
            if (selected !== null && selected !== it.i && place.has(it.i)) return drop(place.get(it.i)!);
            if (locked.has(it.i)) return;
            selected = selected === it.i ? null : it.i;
            render();
          },
        },
        it.photo ? h('img', { src: it.photo.src, alt: '' }) : null,
        h('span', null, it.text),
      );
    }
    for (const b of st.bins) {
      binEls[b] = h('div', {
        class: 'bin',
        role: 'button',
        tabindex: 0,
        'aria-label': `${b} 바구니`,
        onclick: () => drop(b),
        onkeydown: (e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), drop(b)),
      });
    }
    function drop(b: string) {
      if (isDone() || selected === null) return;
      place.set(selected, b);
      selected = null;
      render();
    }
    tray.addEventListener('click', () => {
      if (selected !== null && place.has(selected) && !locked.has(selected)) {
        place.delete(selected);
        selected = null;
        render();
      }
    });
    function render() {
      tray.replaceChildren();
      for (const b of st.bins) binEls[b].replaceChildren(h('div', { class: 'bin-name' }, b));
      for (const it of items) {
        const el = cardEls[it.i];
        el.classList.toggle('sel', selected === it.i);
        const where = place.get(it.i);
        (where ? binEls[where] : tray).append(el);
      }
      for (const b of st.bins) binEls[b].classList.toggle('target', selected !== null);
      if (!tray.childElementCount) tray.append(h('span', { class: 'tray-empty' }, '모두 담았어요! [확인]을 눌러 보세요.'));
      confirm.disabled = place.size !== items.length || isDone();
    }
    const confirm = h('button', { class: 'btn primary', disabled: true }, '확인') as HTMLButtonElement;
    confirm.onclick = () => {
      const wrong = items.filter((it: any) => place.get(it.i) !== it.bin);
      judge(
        wrong.length === 0,
        () => {
          // 맞게 담은 카드는 고정하고, 틀린 카드는 다시 꺼내 둠
          items.forEach((it: any) => {
            if (place.get(it.i) === it.bin) {
              locked.add(it.i);
              cardEls[it.i].classList.add('right');
            }
          });
          wrong.forEach((it: any) => place.delete(it.i));
          render();
        },
        () => {
          wrong.forEach((it: any) => cardEls[it.i].classList.add('wrong'));
          items.forEach((it: any) => place.set(it.i, it.bin));
          render();
          items.forEach((it: any) => !wrong.includes(it) && cardEls[it.i].classList.add('right'));
        },
      );
      if (isDone()) {
        items.forEach((it: any) => (cardEls[it.i] as HTMLButtonElement).disabled = true);
        if (!wrong.length) items.forEach((it: any) => cardEls[it.i].classList.add('right'));
        confirm.remove();
      }
    };
    panel.append(tray, bins);
    st.bins.forEach((b: string) => bins.append(binEls[b]));
    actions.append(confirm);
    render();
  }

  // 기후에 맞는 집·옷 꾸미기
  function buildView(st: any, visual: HTMLElement, panel: HTMLElement, actions: HTMLElement, fb: HTMLElement, judge: any, isDone: () => boolean) {
    const chosen: (number | null)[] = st.parts.map(() => null);
    const locked: boolean[] = st.parts.map(() => false);
    const artBox = h('div', { class: 'art-box' });
    const drawArt = () => {
      const looks = chosen.map((c, i) => (c === null ? '' : st.parts[i].options[c].look ?? '')).filter(Boolean);
      artBox.replaceChildren(st.target === 'house' ? houseArt(looks, st.scene) : clothesArt(looks, st.scene));
    };
    visual.prepend(h('figure', { class: 'art' }, artBox, h('figcaption', { class: 'art-cap' }, st.target === 'house' ? '🏠 내가 꾸민 집' : '👕 내가 고른 옷차림')));
    panel.append(h('p', { class: 'q-sub' }, '부분마다 하나씩 골라 꾸민 뒤 [완성!]을 눌러요.'));
    const rows: HTMLElement[] = [];
    const whyEls: HTMLElement[] = [];
    st.parts.forEach((part: any, pi: number) => {
      const btns = h('div', { class: 'part-opts' });
      const why = h('p', { class: 'part-why', hidden: true });
      whyEls.push(why);
      part.options.forEach((o: any, oi: number) => {
        btns.append(h('button', {
          class: 'part-opt',
          'aria-pressed': 'false',
          'data-oi': oi,
          onclick: () => {
            if (isDone() || locked[pi]) return;
            chosen[pi] = oi;
            btns.querySelectorAll('.part-opt').forEach((b) => {
              const on = Number((b as HTMLElement).dataset.oi) === oi;
              b.classList.toggle('on', on);
              b.setAttribute('aria-pressed', String(on));
              b.classList.remove('wrong');
            });
            why.hidden = true;
            rows[pi].classList.remove('bad');
            drawArt();
            confirm.disabled = chosen.some((c) => c === null);
          },
        }, o.text));
      });
      const row = h('div', { class: 'part-row' }, h('div', { class: 'part-label' }, part.label), btns, why);
      rows.push(row);
      panel.append(row);
    });
    const confirm = h('button', { class: 'btn primary', disabled: true }, '완성!') as HTMLButtonElement;
    const showWhy = (pi: number, cls: string) => {
      const o = st.parts[pi].options[chosen[pi]!];
      whyEls[pi].textContent = (o.fit ? '✔ ' : '✖ ') + o.why;
      whyEls[pi].hidden = false;
      rows[pi].classList.add(cls);
    };
    confirm.onclick = () => {
      const bad = chosen.map((c, i) => (st.parts[i].options[c!].fit ? -1 : i)).filter((i) => i >= 0);
      judge(
        bad.length === 0,
        () => {
          chosen.forEach((_, i) => {
            if (!bad.includes(i)) { locked[i] = true; showWhy(i, 'good'); }
            else {
              showWhy(i, 'bad');
              rows[i].querySelector('.part-opt.on')?.classList.add('wrong');
            }
          });
          fb.append(h('p', { class: 'fb-detail' }, `✖ 표시한 ${bad.length}곳을 다시 골라 보세요.`));
        },
        () => {
          // 알맞은 보기로 바꿔서 보여 주기
          chosen.forEach((c, i) => {
            if (!st.parts[i].options[c!].fit) {
              const fitIdx = st.parts[i].options.findIndex((o: any) => o.fit);
              rows[i].querySelector('.part-opt.on')?.classList.add('wrong');
              chosen[i] = fitIdx;
              rows[i].querySelector(`.part-opt[data-oi="${fitIdx}"]`)?.classList.add('right');
            }
            showWhy(i, 'good');
          });
          drawArt();
        },
      );
      if (isDone()) {
        chosen.forEach((_, i) => { if (whyEls[i].hidden) showWhy(i, 'good'); });
        panel.querySelectorAll('.part-opt').forEach((b) => ((b as HTMLButtonElement).disabled = true));
        confirm.remove();
      }
    };
    actions.append(confirm);
    drawArt();
  }

  // 세계 상점: 손님에게 알맞은 상품 기능 고르기 + 판매 계획
  function shopView(st: any, panel: HTMLElement, actions: HTMLElement, fb: HTMLElement, judge: any, isDone: () => boolean) {
    const c = st.customer;
    panel.append(
      h('div', { class: 'customer' },
        h('div', { class: 'cu-emoji', 'aria-hidden': 'true' }, c.emoji),
        h('div', null, h('div', { class: 'cu-name' }, c.name, h('span', { class: 'cu-place' }, ' 📍 ', c.place)), h('p', { class: 'cu-says' }, '“', c.says, '”')),
      ),
      h('p', { class: 'q-sub' }, '손님에게 알맞은 상품 기능을 모두 골라 [확인]을 눌러요.'),
    );
    const sel = new Set<number>();
    const box = h('div', { class: 'options multi' });
    const btns: HTMLButtonElement[] = [];
    const feats = shuffle(st.features.map((f: any, i: number) => ({ ...f, i })));
    for (const f of feats) {
      const why = h('span', { class: 'opt-why', hidden: true }, f.why);
      const b = h('button', {
        class: 'opt check',
        'aria-pressed': 'false',
        'data-i': f.i,
        onclick: () => {
          if (isDone()) return;
          sel.has(f.i) ? sel.delete(f.i) : sel.add(f.i);
          b.classList.toggle('on', sel.has(f.i));
          b.setAttribute('aria-pressed', String(sel.has(f.i)));
          confirm.disabled = sel.size === 0;
        },
      }, h('span', { class: 'box', 'aria-hidden': 'true' }), h('span', { class: 'opt-body' }, h('span', null, f.text), why)) as HTMLButtonElement;
      btns.push(b);
      box.append(b);
    }
    panel.append(box);
    const fits = new Set<number>(st.features.map((f: any, i: number) => (f.fit ? i : -1)).filter((i: number) => i >= 0));
    const revealWhy = (only?: Set<number>) =>
      btns.forEach((b) => {
        const i = Number(b.dataset.i);
        if (!only || only.has(i)) (b.querySelector('.opt-why') as HTMLElement).hidden = false;
      });
    const confirm = h('button', { class: 'btn primary', disabled: true }, '확인') as HTMLButtonElement;
    confirm.onclick = () => {
      const ok = sel.size === fits.size && [...sel].every((i) => fits.has(i));
      const wrongSel = new Set([...sel].filter((i) => !fits.has(i)));
      judge(
        ok,
        () => {
          revealWhy(wrongSel);
          btns.forEach((b) => wrongSel.has(Number(b.dataset.i)) && b.classList.add('wrong'));
          const missing = [...fits].filter((i) => !sel.has(i)).length;
          fb.append(h('p', { class: 'fb-detail' }, wrongSel.size ? `손님에게 맞지 않는 기능이 ${wrongSel.size}개 있어요. ` : '', missing ? `알맞은 기능을 ${missing}개 더 찾아보세요.` : ''));
        },
        () => {},
      );
      if (isDone()) {
        btns.forEach((b) => {
          const i = Number(b.dataset.i);
          b.classList.remove('wrong');
          if (fits.has(i)) b.classList.add('right');
          else if (sel.has(i)) b.classList.add('wrong');
          b.disabled = true;
        });
        revealWhy();
        confirm.remove();
        if (st.plan) fb.append(planForm(st));
      }
    };
    actions.append(confirm);
  }

  function planForm(st: any) {
    const name = h('input', { type: 'text', maxlength: 30, placeholder: '예) 바람막이 털장갑 「따끈손」' }) as HTMLInputElement;
    const slogan = h('input', { type: 'text', maxlength: 60, placeholder: '예) 영하 20℃ 바닷바람도 끄떡없어요!' }) as HTMLInputElement;
    const when = h('input', { type: 'text', maxlength: 60, placeholder: '예) 10월~4월, 항구 앞 가게에서' }) as HTMLInputElement;
    const saved = h('span', { class: 'note-saved', 'aria-live': 'polite' });
    const feats = st.features.filter((f: any) => f.fit).map((f: any) => f.text);
    return h('div', { class: 'plan-box' },
      h('h3', null, '🛍️ 판매 계획 세우기 (선택)'),
      h('label', null, '상품 이름', name),
      h('label', null, '광고 문구', slogan),
      h('label', null, '언제·어디서 팔까?', when),
      h('div', { class: 'note-actions' },
        h('button', { class: 'btn', type: 'button', onclick: () => {
          if (!name.value.trim()) return name.focus();
          store.addProduct({ unit: data.unitId, customer: `${st.customer.emoji} ${st.customer.name} (${st.customer.place})`, name: name.value.trim(), slogan: slogan.value.trim(), when: when.value.trim(), features: feats });
          saved.textContent = '📦 상품 카드를 저장했어요!';
        } }, '상품 카드 저장'),
        saved,
      ),
    );
  }

  // 세계 지도에서 위치 고르기
  function pinView(st: any, visual: HTMLElement, panel: HTMLElement, judge: any) {
    const order = shuffle(st.pins as string[]);
    const svg = s('svg', { viewBox: data.map.viewBox, class: 'map-svg', role: 'group', 'aria-label': '세계 지도' });
    svg.append(s('rect', { x: 0, y: 0, width: 1000, height: 500, class: 'sea' }));
    svg.append(s('path', { d: data.map.path, class: 'land' }));
    // 적도
    svg.append(s('line', { x1: 0, x2: 1000, y1: 250, y2: 250, class: 'equator' }));
    svg.append(s('text', { x: 6, y: 246, class: 'equator-label' }, '적도'));
    let finished = false;
    const pinEls: Record<string, SVGElement> = {};
    order.forEach((id, n) => {
      const p = data.atlas[id] ?? data.climate[id];
      const g = s('g', { class: 'pin', tabindex: 0, role: 'button', 'aria-label': `${n + 1}번 위치`, transform: `translate(${p.x} ${p.y})` });
      g.append(s('circle', { r: 17, class: 'pin-c' }));
      g.append(s('text', { 'text-anchor': 'middle', y: 6, class: 'pin-t' }, String(n + 1)));
      const label = s('text', { 'text-anchor': 'middle', y: -24, class: 'pin-name' }, p.name);
      g.append(label);
      const pick = () => {
        if (finished) return;
        judge(
          id === st.answer,
          () => g.classList.add('wrong'),
          () => {
            g.classList.add('wrong');
            pinEls[st.answer].classList.add('right');
          },
        );
        if (id === st.answer) g.classList.add('right');
        if (svg.closest('.step')?.classList.contains('is-done')) {
          finished = true;
          svg.classList.add('reveal');
        }
      };
      g.addEventListener('click', pick);
      g.addEventListener('keydown', (e: any) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), pick()));
      pinEls[id] = g;
      svg.append(g);
    });
    visual.append(h('figure', { class: 'map' }, svg, h('small', { class: 'ph-credit' }, '지도: Natural Earth')));
    panel.append(h('p', { class: 'q-sub' }, '👆 지도에서 번호를 눌러요.'));
  }

  // ───────────── 결과 ─────────────
  function resultView(stage: any, run: store.StageRun, newCards: string[]) {
    const wrap = h('div', { class: 'result' });
    const t = TIERS[tier];
    wrap.append(
      h('div', { class: `stamp tier-${tier}`, 'aria-hidden': 'true' }, h('span', { class: 'stamp-e' }, stage.emoji), h('span', { class: 'stamp-t' }, t.name)),
      h('h1', { class: 'r-title' }, `${stage.title} 탐험 완료!`),
      h('p', { class: 'r-stars', 'aria-label': `별 ${run.stars}개` }, stars(run.stars)),
      h('p', { class: 'r-score' }, `처음에 맞힌 문제 ${run.first} / ${run.total}`),
      h('p', { class: 'r-msg' }, message(run, tier)),
    );
    if (newCards.length) {
      wrap.append(h('p', { class: 'r-cards' }, '🃏 새로 모은 지형 카드: ', [...new Set(newCards)].map((id) => data.atlas[id]?.name).join(', ')));
    }

    // 탐험 질문 수첩 (가치·태도: 관심·호기심·탐구하려는 자세)
    const q = h('textarea', { class: 'note-q', rows: 2, maxlength: 200, placeholder: '예) 피오르에 사는 사람들은 겨울에 어떻게 다닐까?' }) as HTMLTextAreaElement;
    const a = tier === 'A'
      ? (h('textarea', { class: 'note-a', rows: 2, maxlength: 300, placeholder: '사회과 부도, 교과서, 검색으로 알아낸 답을 적어요. (나중에 적어도 돼요)' }) as HTMLTextAreaElement)
      : null;
    const saved = h('p', { class: 'note-saved', 'aria-live': 'polite' });
    const saveBtn = h('button', { class: 'btn', onclick: () => {
      if (!q.value.trim()) { q.focus(); return; }
      store.addNote({ unit: data.unitId, game: data.id, stage: stage.id, q: q.value.trim(), a: a?.value.trim() || undefined });
      q.value = '';
      if (a) a.value = '';
      saved.textContent = '📓 질문 수첩에 적었어요!';
    } }, '수첩에 적기');
    wrap.append(
      h(
        'section',
        { class: 'note-box' },
        h('h2', null, '📓 탐험 질문 수첩'),
        h('label', null, '이번 탐험에서 더 알고 싶어진 것은 무엇인가요?', q),
        a ? h('label', null, '🏅 내가 스스로 조사한 답', a) : null,
        h('div', { class: 'note-actions' }, saveBtn, saved),
      ),
    );

    const nextTier: Tier | null = tier === 'C' ? 'B' : tier === 'B' ? 'A' : null;
    wrap.append(
      h(
        'div',
        { class: 'r-actions' },
        h('button', { class: 'btn ghost', onclick: () => go(home()) }, '처음 화면으로'),
        h('button', { class: 'btn', onclick: () => play(stage) }, '🔁 다시 하기'),
        nextTier && run.stars >= 2
          ? h('button', { class: 'btn primary', onclick: () => { tier = nextTier; store.setLastTier(data.id, nextTier); play(stage); } }, `${TIERS[nextTier].emoji} ${TIERS[nextTier].name} 도전!`)
          : null,
      ),
    );
    return wrap;
  }

  go(home());
}

function stars(n: number) {
  return '★'.repeat(n) + '☆'.repeat(3 - n);
}

function message(run: store.StageRun, tier: Tier) {
  const r = run.total ? run.first / run.total : 0;
  if (r >= 0.9) return tier === 'A' ? '여러 자료를 비교하고 분석하는 실력이 대단해요!' : '훌륭해요! 다음 단계에 도전해 보세요.';
  if (r >= 0.6) return '잘했어요! 틀린 문제의 설명을 다시 읽어 보면 더 단단해져요.';
  return '끝까지 탐험한 것이 멋져요. 탐험 노트를 보며 한 번 더 해 볼까요?';
}
