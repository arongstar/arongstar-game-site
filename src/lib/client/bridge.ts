// Word Bridge: 낱말 블록을 문장 순서대로 놓아 다리를 만들고 강을 건너요.
import { h, readJSON, shuffle } from './dom';
import * as store from './store';
import type { Tier, StepResult } from './store';
import { playLines, stopAudio, speakerButton, tokenize } from './english';
import { TIERS, readTier, topBar, avatarImg, coinPop, confetti, record, resultBox } from './fun';

export function startBridge() {
  const data = readJSON<any>('game-data');
  const app = document.getElementById('app')!;
  let tier: Tier = readTier(data.id);
  const back = new URLSearchParams(location.search).get('from');

  function intro() {
    stopAudio();
    const { el: bar } = topBar(data, tier, (t) => { tier = t; intro(); });
    const how = tier === 'C' ? '우리말 뜻과 🔊 소리를 들으며 놓아요.' : tier === 'B' ? '우리말 뜻을 보고 놓아요. 대문자와 문장 부호에 주의해요.' : '🔊 소리만 듣고 놓아요. 헷갈리는 블록이 섞여 있어요.';
    app.replaceChildren(h('div', { class: 'fun-panel' }, bar,
      h('div', { class: 'jump-hero', 'aria-hidden': 'true' }, '🌉'),
      h('p', null, data.story),
      h('ul', { class: 'guide-list' }, h('li', null, '낱말 블록을 문장 순서대로 눌러 다리를 놓아요.'), h('li', null, `${TIERS[tier].emoji} ${how}`), h('li', null, '틀린 블록을 누르면 다리가 흔들려요. 한 번도 안 흔들리고 건너면 ⭐!')),
      h('div', { class: 'note-actions' }, h('button', { class: 'btn primary big', type: 'button', onclick: run }, '▶ 시작!'), back ? h('a', { class: 'btn', href: back }, '🗺️ 지도로') : null)));
  }

  function run() {
    const list = data.sentences.filter((s: any) => s.lv === tier);
    const results: StepResult[] = [];
    let i = 0;
    const { el: bar, coins } = topBar(data, tier, (t) => { tier = t; intro(); });
    const wrap = h('div', { class: 'fun-panel wide' });
    app.replaceChildren(wrap);

    function next() {
      if (i >= list.length) return finish();
      const s = list[i];
      const want = tokenize(s.text);
      let k = 0;
      let mistakes = 0;
      const scene = h('div', { class: 'bridge-scene' });
      const planks = want.map(() => h('div', { class: 'plank' }));
      const deck = h('div', { class: 'bridge-deck', style: { gridTemplateColumns: `repeat(${want.length}, 1fr)` } }, ...planks);
      const me = avatarImg(data.avatars, 'sprite bridge-me');
      const goal = h('div', { class: 'bridge-goal', 'aria-hidden': 'true' }, '🏁');
      scene.append(h('div', { class: 'bank left' }), h('div', { class: 'river' }), h('div', { class: 'bank right' }), deck, goal, me);
      const setPos = (f: number) => (me.style.left = `${6 + f * 82}%`);
      setPos(0);
      const tray = h('div', { class: 'tray sent-tray bridge-tray' });
      const tiles = shuffle([...want.map((t, n) => ({ t, n })), ...s.extra.map((t: string, n: number) => ({ t, n: 100 + n }))]);
      const used = new Set<number>();
      function render() {
        tray.replaceChildren(...tiles.map((x) => h('button', { class: 'sort-card word', type: 'button', disabled: used.has(x.n), onclick: (e: Event) => pick(x, e.currentTarget as HTMLElement) }, x.t)));
      }
      function pick(x: { t: string; n: number }, el: HTMLElement) {
        if (x.t === want[k]) {
          // 같은 낱말이 두 번 나오면 아무 블록이나 맞게 쳐요
          used.add(x.n);
          planks[k].textContent = x.t;
          planks[k].classList.add('on');
          k++;
          setPos(k / want.length);
          me.classList.remove('hop'); void me.offsetWidth; me.classList.add('hop');
          render();
          if (k === want.length) done();
        } else {
          mistakes++;
          el.classList.add('shake');
          deck.classList.remove('wobble'); void deck.offsetWidth; deck.classList.add('wobble');
          setTimeout(() => el.classList.remove('shake'), 500);
          if (mistakes >= 3) tip.textContent = `💡 다음 낱말은 「${want[k]}」예요.`;
        }
      }
      const tip = h('p', { class: 'q-sub' });
      function done() {
        const ok = mistakes === 0;
        results.push({ key: `bridge-${i}`, std: data.std, cat: '과정·기능', lv: tier, ok, hint: mistakes >= 3 });
        const c = ok ? 10 : 4;
        store.addCoins(c); coins.refresh(); coinPop(me, c);
        playLines([s.audio]);
        setPos(1.08);
        goal.classList.add('reached');
        tray.replaceChildren(h('div', { class: 'fb ' + (ok ? 'fb-ok' : 'fb-reveal') }, h('strong', null, ok ? '🎉 한 번에 건넜어요!' : '👍 건넜어요!'), h('p', { lang: 'en' }, s.text)),
          h('div', { class: 'note-actions' }, h('button', { class: 'btn primary big', type: 'button', onclick: () => { stopAudio(); i++; next(); } }, i + 1 < list.length ? '다음 다리 ▶' : '결과 보기 ▶')));
      }
      const audioBtn = tier !== 'B' ? speakerButton(s.audio, '🔊 문장 듣기') : null;
      wrap.replaceChildren(bar,
        h('div', { class: 'jump-hud' }, h('span', null, `🌉 ${i + 1} / ${list.length}`), tier !== 'A' && s.ko ? h('span', { class: 'bridge-ko' }, `뜻: ${s.ko}`) : h('span', null, '🔊를 듣고 문장을 만들어요')),
        scene, h('div', { class: 'lab-controls center' }, audioBtn), tray, tip);
      render();
      if (tier === 'A') playLines([s.audio]);
    }
    function finish() {
      const r = record(data.unitId, data.id, tier, 'bridge', results);
      if (r.stars === 3) confetti();
      wrap.replaceChildren(resultBox('🌉 모든 다리를 건넜어요!', r, run, data.unitUrl, back ? h('p', null, h('a', { class: 'btn', href: back }, '🗺️ 지도로 돌아가기')) : null));
    }
    next();
  }
  intro();
}
