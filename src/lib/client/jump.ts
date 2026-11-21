// Listen & Jump: 들은 말이 적힌 길을 눌러 캐릭터를 점프시켜요.
import { h, readJSON, shuffle } from './dom';
import * as store from './store';
import type { Tier, StepResult } from './store';
import { playLines, stopAudio } from './english';
import { TIERS, readTier, topBar, avatarImg, coinPop, confetti, record, resultBox } from './fun';

export function startJump() {
  const data = readJSON<any>('game-data');
  const app = document.getElementById('app')!;
  let tier: Tier = readTier(data.id);
  const back = new URLSearchParams(location.search).get('from');
  // 키보드: ↑↓ 또는 W·S 로 길 바꾸기, 1·2·3 으로 바로 고르기
  let onKey: ((e: KeyboardEvent) => void) | null = null;
  window.addEventListener('keydown', (e) => onKey?.(e));

  function intro() {
    onKey = null;
    stopAudio();
    const { el: bar } = topBar(data, tier, (t) => { tier = t; intro(); });
    const how = tier === 'C' ? '길이 두 개예요. 그림과 낱말을 보고 골라요.' : tier === 'B' ? '길이 두 개예요. 낱말만 보고 골라요.' : '길이 세 개예요. 문장을 듣고 알맞은 낱말을 골라요. 더 빨라요!';
    app.replaceChildren(h('div', { class: 'fun-panel' }, bar,
      h('div', { class: 'jump-hero', 'aria-hidden': 'true' }, '🏃💨'),
      h('p', null, data.story),
      h('ul', { class: 'guide-list' }, h('li', null, '🔊 영어를 잘 듣고, 들은 말이 적힌 길을 눌러요.'), h('li', null, `${TIERS[tier].emoji} ${how}`), h('li', null, '⌨️ 키보드: ↑↓ 방향키(또는 W·S)로 길을 바꿔요.'), h('li', null, '🔁 「다시 듣기」를 눌러도 괜찮아요.')),
      h('div', { class: 'note-actions' }, h('button', { class: 'btn primary big', type: 'button', onclick: run }, '▶ 출발!'), back ? h('a', { class: 'btn', href: back }, '🗺️ 지도로') : null)));
  }

  function run() {
    const lanes = tier === 'A' ? 3 : 2;
    const travel = tier === 'C' ? 7000 : tier === 'B' ? 6000 : 5200;
    const order = shuffle(data.items).slice(0, Math.min(data.rounds, data.items.length));
    const results: StepResult[] = [];
    let i = 0;
    let lane = Math.floor(lanes / 2);
    let raf = 0;
    const scene = h('div', { class: `jump-scene lanes-${lanes}` });
    const ground = h('div', { class: 'jump-ground' });
    const runner = h('div', { class: 'jump-runner' }, avatarRunner());
    const gate = h('div', { class: 'jump-gate' });
    const hud = h('div', { class: 'jump-hud' });
    const replay = h('button', { class: 'btn small', type: 'button' }, '🔊 다시 듣기');
    scene.append(h('div', { class: 'jump-sky' }), ground, gate, runner);
    const { el: bar, coins } = topBar(data, tier, (t) => { cancelAnimationFrame(raf); tier = t; intro(); });
    app.replaceChildren(h('div', { class: 'fun-panel wide' }, bar, hud, scene, h('div', { class: 'lab-controls center' }, replay)));

    function laneTop(k: number) { return ((k + 0.5) / lanes) * 100; }
    function moveRunner(k: number) { lane = k; runner.style.top = `${laneTop(k)}%`; runner.classList.remove('hop'); void runner.offsetWidth; runner.classList.add('hop'); }
    moveRunner(lane);
    onKey = (e) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowup' || k === 'w') { moveRunner(Math.max(0, lane - 1)); e.preventDefault(); }
      else if (k === 'arrowdown' || k === 's') { moveRunner(Math.min(lanes - 1, lane + 1)); e.preventDefault(); }
      else if (/^[1-3]$/.test(k) && +k <= lanes) moveRunner(+k - 1);
    };

    function round() {
      if (i >= order.length) return finish();
      const it = order[i];
      const others = shuffle(data.items.filter((x: any) => x.word !== it.word)).slice(0, lanes - 1);
      const choices = shuffle([it, ...others]);
      const audio = tier === 'A' ? it.sentenceAudio : it.wordAudio;
      replay.onclick = () => playLines([audio]);
      hud.replaceChildren(h('span', null, `${i + 1} / ${order.length}`), h('span', null, '🔊 잘 듣고 길을 골라요!'));
      gate.replaceChildren(...choices.map((c: any, k: number) => h('button', { class: 'jump-sign', type: 'button', style: { top: `${laneTop(k)}%` }, onclick: () => moveRunner(k) },
        tier === 'C' ? h('span', { class: 'sign-emoji', 'aria-hidden': 'true' }, c.emoji) : null, h('span', { lang: 'en' }, c.word))));
      gate.classList.remove('passed');
      playLines([audio]);
      const t0 = performance.now();
      const step = (now: number) => {
        const f = Math.min(1, (now - t0) / travel);
        gate.style.left = `${100 - f * 78}%`;
        if (f < 1) { raf = requestAnimationFrame(step); return; }
        const ok = choices[lane]?.word === it.word;
        results.push({ key: `run-${i}`, std: data.std, cat: '과정·기능', lv: tier, ok, hint: false });
        const signs = gate.querySelectorAll('.jump-sign');
        signs.forEach((s, k) => s.classList.add(choices[k].word === it.word ? 'right' : 'dim'));
        if (ok) { store.addCoins(5); coins.refresh(); coinPop(runner, 5); runner.classList.add('yay'); }
        else { runner.classList.add('oops'); hud.replaceChildren(h('span', { class: 'jump-answer', lang: 'en' }, `정답: ${it.emoji} ${it.word}`), tier === 'A' ? h('span', { lang: 'en' }, `“${it.sentence}”`) : ''); }
        gate.classList.add('passed');
        setTimeout(() => { runner.classList.remove('yay', 'oops'); i++; round(); }, ok ? 900 : 1900);
      };
      raf = requestAnimationFrame(step);
    }
    function finish() {
      onKey = null;
      stopAudio();
      const r = record(data.unitId, data.id, tier, 'run', results);
      if (r.stars === 3) confetti();
      app.replaceChildren(h('div', { class: 'fun-panel' }, resultBox('🏁 결승선 도착!', r, run, data.unitUrl, back ? h('p', null, h('a', { class: 'btn', href: back }, '🗺️ 지도로 돌아가기')) : null)));
    }
    round();
  }

  function avatarRunner() {
    return avatarImg(data.avatars, 'sprite runner');
  }

  intro();
}
