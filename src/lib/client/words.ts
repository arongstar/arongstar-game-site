// 단어 외우기: 낱말 카드 → 짝 맞추기 → 철자. 잘 모르는 낱말은 복습 상자에 남아 다시 나와요.
import { h, readJSON, shuffle } from './dom';
import * as store from './store';
import type { Tier, StepResult } from './store';
import { playLines, stopAudio, speakerButton, spellView } from './english';
import { TIERS, readTier, topBar, coinPop, confetti, record, resultBox } from './fun';

export function startWords() {
  const data = readJSON<any>('game-data');
  const app = document.getElementById('app')!;
  let tier: Tier = readTier(data.id);
  const back = new URLSearchParams(location.search).get('from');
  const bag = store.getBag();
  const box = () => (bag.box[data.unitId] ??= {});
  const level = (w: string) => box()[w] ?? 1;
  const setLevel = (w: string, v: number) => { box()[w] = Math.max(1, Math.min(3, v)); store.saveBag(); };
  const words = () => data.words.filter((w: any) => tier === 'A' || (tier === 'B' ? w.lv !== 'A' : w.lv === 'C'));
  // 복습 상자 순서: 잘 모르는 낱말부터
  const byNeed = () => shuffle(words()).sort((a: any, b: any) => level(a.word) - level(b.word));

  function menu() {
    stopAudio();
    const list = words();
    const known = list.filter((w: any) => level(w.word) >= 3).length;
    const { el: bar } = topBar(data, tier, (t) => { tier = t; menu(); });
    app.replaceChildren(h('div', { class: 'fun-panel' }, bar,
      h('p', null, data.story),
      h('div', { class: 'word-progress' },
        h('div', { class: 'wp-bar' }, h('span', { style: { width: `${(known / list.length) * 100}%` } })),
        h('span', null, `⭐ 외운 낱말 ${known} / ${list.length}`)),
      h('div', { class: 'word-modes' },
        modeCard('📇', '낱말 카드', '그림·소리·뜻을 보며 익혀요', learn),
        modeCard('🃏', '짝 맞추기', tier === 'A' ? '낱말과 우리말 뜻의 짝을 찾아요' : '낱말과 그림의 짝을 찾아요', match),
        modeCard('✍️', '철자 맞히기', '소리를 듣고 철자를 맞혀요', spell)),
      h('details', { class: 'lab-more' }, h('summary', null, '📦 나의 복습 상자 보기'),
        h('div', { class: 'box-cols' }, ...[1, 2, 3].map((lv) => h('div', { class: 'box-col' },
          h('b', null, lv === 1 ? '🤔 다시 보기' : lv === 2 ? '🙂 거의 알아요' : '⭐ 외웠어요'),
          ...list.filter((w: any) => level(w.word) === lv).map((w: any) => h('span', { class: 'word-chip' }, `${w.emoji} ${w.word}`)))))),
      back ? h('p', null, h('a', { class: 'btn', href: back }, '🗺️ 지도로 돌아가기')) : null));
  }
  function modeCard(emoji: string, title: string, desc: string, go: () => void) {
    return h('button', { class: 'mode-card', type: 'button', onclick: go }, h('span', { class: 'mode-emoji', 'aria-hidden': 'true' }, emoji), h('b', null, title), h('small', null, desc));
  }
  const header = (title: string) => h('div', { class: 'fun-top' }, h('button', { class: 'btn small ghost', type: 'button', onclick: menu }, '← 단어 외우기'), h('h1', { class: 'fun-title' }, title), h('span', { class: 'tier-pill on tier-' + tier }, `${TIERS[tier].emoji} ${TIERS[tier].name}`));

  // ───── 낱말 카드 ─────
  function learn() {
    const list = byNeed();
    let i = 0;
    const wrap = h('div', { class: 'fun-panel' });
    app.replaceChildren(wrap);
    function show() {
      if (i >= list.length) { confetti(); return menu(); }
      const w = list[i];
      let flipped = false;
      const card = h('button', { class: 'flash', type: 'button', 'aria-label': '카드 뒤집기' });
      const face = () => card.replaceChildren(...(flipped
        ? [h('div', { class: 'flash-ko' }, w.ko), w.sentence ? h('p', { class: 'flash-sent', lang: 'en' }, w.sentence) : null, h('small', null, '다시 누르면 앞면')]
        : [h('div', { class: 'flash-emoji', 'aria-hidden': 'true' }, w.emoji), h('div', { class: 'flash-word', lang: 'en' }, w.word), h('small', null, '눌러서 뜻 보기')]));
      card.onclick = () => { flipped = !flipped; card.classList.toggle('back', flipped); face(); if (flipped && w.sentenceAudio) playLines([w.sentenceAudio]); else playLines([w.audio]); };
      face();
      wrap.replaceChildren(header('📇 낱말 카드'), h('p', { class: 'muted center' }, `${i + 1} / ${list.length}`), card,
        h('div', { class: 'lab-controls center' }, speakerButton(w.audio, '🔊 낱말'), w.sentenceAudio ? speakerButton(w.sentenceAudio, '🔊 예문') : null),
        h('div', { class: 'note-actions center' },
          h('button', { class: 'btn', type: 'button', onclick: () => { setLevel(w.word, 1); i++; show(); } }, '🤔 다시 볼래요'),
          h('button', { class: 'btn primary', type: 'button', onclick: () => { setLevel(w.word, level(w.word) + 1); i++; show(); } }, '😊 알아요')));
      playLines([w.audio]);
    }
    show();
  }

  // ───── 짝 맞추기 ─────
  function match() {
    const n = tier === 'C' ? 4 : 6;
    const pick = byNeed().slice(0, n);
    const cards = shuffle(pick.flatMap((w: any) => [{ w, side: 'word' }, { w, side: tier === 'A' ? 'ko' : 'pic' }]));
    const missed = new Set<string>();
    const found = new Set<string>();
    let open: { el: HTMLElement; c: any }[] = [];
    let lock = false;
    const { el: bar, coins } = topBar(data, tier, (t) => { tier = t; match(); });
    const grid = h('div', { class: 'memory-grid n' + cards.length });
    const status = h('p', { class: 'lab-status center' }, '카드를 두 장씩 뒤집어 짝을 찾아요.');
    for (const c of cards) {
      const el = h('button', { class: 'mem-card', type: 'button', 'aria-label': '카드' }, h('span', { class: 'mem-back' }, '❓'));
      el.onclick = () => {
        if (lock || found.has(c.w.word) || open.some((o) => o.el === el)) return;
        el.classList.add('open');
        el.replaceChildren(c.side === 'word' ? h('span', { class: 'mem-word', lang: 'en' }, c.w.word) : c.side === 'pic' ? h('span', { class: 'mem-pic' }, c.w.emoji) : h('span', { class: 'mem-ko' }, c.w.ko));
        if (c.side === 'word') playLines([c.w.audio]);
        open.push({ el, c });
        if (open.length < 2) return;
        const [a, b] = open;
        if (a.c.w.word === b.c.w.word) {
          found.add(a.c.w.word);
          a.el.classList.add('found'); b.el.classList.add('found');
          playLines([a.c.w.audio]);
          const ok = !missed.has(a.c.w.word);
          setLevel(a.c.w.word, ok ? level(a.c.w.word) + 1 : 1);
          if (ok) { store.addCoins(3); coins.refresh(); coinPop(a.el, 3); }
          open = [];
          if (found.size === pick.length) setTimeout(finish, 700);
        } else {
          missed.add(a.c.w.word); missed.add(b.c.w.word);
          lock = true;
          setTimeout(() => { for (const o of [a, b]) { o.el.classList.remove('open'); o.el.replaceChildren(h('span', { class: 'mem-back' }, '❓')); } open = []; lock = false; }, 900);
        }
      };
      grid.append(el);
    }
    function finish() {
      const results: StepResult[] = pick.map((w: any) => ({ key: `match-${w.word}`, std: data.std.meaning, cat: '지식·이해', lv: tier, ok: !missed.has(w.word), hint: false }));
      const r = record(data.unitId, data.id, tier, 'match', results);
      if (r.stars === 3) confetti();
      app.replaceChildren(h('div', { class: 'fun-panel' }, resultBox('🃏 짝을 모두 찾았어요!', r, match, data.unitUrl, h('p', null, h('button', { class: 'btn', type: 'button', onclick: menu }, '← 단어 외우기')))));
    }
    app.replaceChildren(h('div', { class: 'fun-panel wide' }, bar, h('p', null, h('button', { class: 'btn small ghost', type: 'button', onclick: menu }, '← 단어 외우기')), status, grid));
  }

  // ───── 철자 맞히기 ─────
  function spell() {
    const list = byNeed().slice(0, tier === 'C' ? 4 : 6);
    const results: StepResult[] = [];
    let i = 0;
    const wrap = h('div', { class: 'fun-panel' });
    app.replaceChildren(wrap);
    function show() {
      if (i >= list.length) return finish();
      const w = list[i];
      const letters = 'abcdefghijklmnoprstuwy'.split('').filter((c) => !w.word.includes(c));
      const extra = shuffle(letters).slice(0, tier === 'C' ? 1 : 2).join('');
      const visual = h('div', { class: 'spell-visual' });
      const panel = h('div', { class: 'step-panel' });
      const actions = h('div', { class: 'step-actions' });
      const fb = h('div', { class: 'feedback', 'aria-live': 'polite' });
      let done = false;
      let tries = 0;
      const judge = (ok: boolean, onRetry: () => void, onReveal: () => void) => {
        if (done) return;
        tries++;
        if (ok || tries >= 2) {
          done = true;
          if (!ok) onReveal();
          const first = ok && tries === 1;
          results.push({ key: `spell-${w.word}`, std: data.std.spell, cat: '과정·기능', lv: tier, ok: first, hint: false });
          setLevel(w.word, first ? level(w.word) + 1 : 1);
          if (first) { store.addCoins(5); coinPop(panel, 5); }
          fb.replaceChildren(h('div', { class: 'fb ' + (ok ? 'fb-ok' : 'fb-reveal') }, h('strong', null, ok ? '🎉 맞았어요!' : '💡 정답을 확인해요'), h('p', { lang: 'en' }, `${w.emoji} ${w.word} — ${w.ko}`)));
          playLines([w.audio]);
          actions.replaceChildren(h('button', { class: 'btn primary big', type: 'button', onclick: () => { i++; show(); } }, '다음 ▶'));
        } else { onRetry(); fb.replaceChildren(h('div', { class: 'fb fb-retry' }, '🤔 다시 들어 볼까요?')); }
      };
      panel.append(h('p', { class: 'q' }, tier === 'C' ? `「${w.ko}」을/를 뜻하는 낱말의 철자를 맞혀요.` : '소리를 듣고 철자를 맞혀요.'));
      spellView({ word: w.word, extra, emoji: w.emoji, wordAudio: w.audio }, visual, panel, actions, judge, () => done);
      panel.append(fb, actions);
      wrap.replaceChildren(header('✍️ 철자 맞히기'), h('p', { class: 'muted center' }, `${i + 1} / ${list.length}`), h('div', { class: 'step with-visual' }, visual, panel));
      playLines([w.audio]);
    }
    function finish() {
      const r = record(data.unitId, data.id, tier, 'spell', results);
      if (r.stars === 3) confetti();
      wrap.replaceChildren(resultBox('✍️ 철자 맞히기 끝!', r, spell, data.unitUrl, h('p', null, h('button', { class: 'btn', type: 'button', onclick: menu }, '← 단어 외우기'))));
    }
    show();
  }
  menu();
}
