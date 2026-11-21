// 영어 RPG 「Lingo Island 대모험」: 지역(Lesson) 화면
// 맵을 걸어 다니며 주민 퀘스트(차시별)를 해결하고, 낱말 요정(꼬마 몬스터)을 친구로 만들고, 지역 대장(마을 대회)에 도전해요.
import { h, readJSON, shuffle } from './dom';
import * as store from './store';
import type { Tier, StepResult } from './store';
import { playLines, stopAudio, speakerButton, speakView, sentenceView, spellView, writeView } from './english';
import { TIERS, HATS, readTier, avatarImg, coinPop, confetti, toast, record } from './fun';

// ───── 저장 (학생 기기) ─────
export interface RpgSave {
  xp: number;
  regions: Record<string, { q: Record<Tier, string[]>; boss: Record<Tier, boolean> }>;
  monsters: Record<string, number>; // 몬스터 종류별 친구가 된 횟수
}
export function rpgSave(): RpgSave {
  const bag: any = store.getBag();
  bag.rpg ??= { xp: 0, regions: {}, monsters: {} };
  bag.rpg.monsters ??= {};
  return bag.rpg;
}
export function regionSave(id: string) {
  const r = rpgSave();
  return (r.regions[id] ??= { q: { C: [], B: [], A: [] }, boss: { C: false, B: false, A: false } });
}
export const levelOf = (xp: number) => 1 + Math.floor(xp / 100);
export function titleOf(lv: number) {
  return lv >= 12 ? '🏝️ 섬의 영웅' : lv >= 8 ? '🪄 영어 마법사' : lv >= 5 ? '🛡️ 용감한 탐험가' : lv >= 3 ? '🎒 꼬마 탐험가' : '🌱 새싹 탐험가';
}
export function addXp(n: number) {
  const r = rpgSave();
  const before = levelOf(r.xp);
  r.xp += n;
  store.saveBag();
  const after = levelOf(r.xp);
  if (after > before) { confetti(); toast(`⬆️ 레벨 업! Lv.${after} ${titleOf(after)}`); }
}
// 기록 지우기
export function resetRegion(id: string) {
  const r = rpgSave();
  delete r.regions[id];
  const d: any = store.load();
  for (const k of Object.keys(d.runs)) if (k.split('|')[1] === id) delete d.runs[k];
  store.saveBag();
}
export function resetAll() {
  const bag: any = store.getBag();
  bag.rpg = { xp: 0, regions: {}, monsters: {} };
  bag.coins = 0; bag.owned = []; bag.wear = null; bag.avatar = null;
  for (const k of Object.keys(bag.box)) if (k.startsWith('eng-')) delete bag.box[k];
  const d: any = store.load();
  for (const k of Object.keys(d.runs)) if (k.split('|')[1]?.startsWith('rpg-')) delete d.runs[k];
  store.saveBag();
}

export function startRegion() {
  const data = readJSON<any>('game-data');
  const app = document.getElementById('app')!;
  let tier: Tier = readTier(data.id);
  const bag = store.getBag();
  const save = () => regionSave(data.id);
  const npcOf = (name: string) => data.npcs.find((n: any) => n.name === name) ?? data.npcs.find((n: any) => n.id === name);
  const lvOk = (s: any) => !s.lv || s.lv.includes(tier);
  let fairyTimer = 0;

  // 낱말 복습 상자 (단원별): 1 다시 보기 · 2 거의 알아요 · 3 외웠어요
  const boxLv = (w: any) => bag.box[w.unit]?.[w.word] ?? 1;
  const setBox = (w: any, v: number) => { (bag.box[w.unit] ??= {})[w.word] = Math.max(1, Math.min(3, v)); store.saveBag(); };

  function mount() {
    stopAudio();
    clearInterval(fairyTimer);
    if (!bag.avatar) return chooseAvatar();
    const rs = rpgSave();
    const lv = levelOf(rs.xp);
    const coins = h('span', { class: 'coin-badge' }, `🪙 ${bag.coins}`);
    const top = h('div', { class: 'fun-top rpg-top' },
      h('a', { class: 'btn small ghost', href: data.worldUrl }, '🌍 세계 지도'),
      h('h1', { class: 'fun-title' }, `${data.emoji} ${data.area}`),
      h('span', { class: 'lv-badge', title: `경험치 ${rs.xp}` }, `Lv.${lv} ${titleOf(lv)}`, h('span', { class: 'xp-bar' }, h('span', { style: { width: `${rs.xp % 100}%` } }))),
      coins,
      h('div', { class: 'fun-tiers' }, ...(['C', 'B', 'A'] as Tier[]).map((t) => h('button', { class: `tier-pill tier-${t}` + (t === tier ? ' on' : ''), type: 'button', onclick: () => { tier = t; store.setLastTier(data.id, t); mount(); } }, `${TIERS[t].emoji} ${TIERS[t].name}`))),
      h('div', { class: 'fun-tools' },
        h('button', { class: 'btn small ghost', type: 'button', onclick: dex }, '📒 도감'),
        h('button', { class: 'btn small ghost', type: 'button', onclick: shop }, '🛍️ 꾸미기'),
        h('button', { class: 'btn small ghost', type: 'button', onclick: settings }, '⚙️')));
    const map = h('div', { class: 'adv-map', role: 'application', 'aria-label': `${data.area} 지도. 가고 싶은 곳이나 주민을 눌러요.` });
    map.append(h('img', { class: 'adv-bg', src: data.map.src, alt: data.map.alt ?? '', draggable: false }));
    const me = avatarImg(data.avatars, 'sprite me');
    let pos: [number, number] = [...data.start];
    place(me, pos);
    let walking = 0;
    const walkTo = (target: [number, number], then?: () => void) => {
      const tx = Math.min(96, Math.max(4, target[0])), ty = Math.min(95, Math.max(14, target[1]));
      const ms = Math.max(250, Math.hypot(tx - pos[0], (ty - pos[1]) * 0.67) * 40);
      me.classList.toggle('left', tx < pos[0]);
      me.classList.add('walking');
      me.style.transition = `left ${ms}ms linear, top ${ms}ms linear`;
      pos = [tx, ty]; place(me, pos);
      const my = ++walking;
      setTimeout(() => { if (my !== walking) return; me.classList.remove('walking'); then?.(); }, ms);
    };
    map.addEventListener('click', (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.npc, .station, .fairy')) return;
      const r = map.getBoundingClientRect();
      walkTo([((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100]);
    });
    const done = save().q[tier];
    for (const n of data.npcs) {
      const qs = data.quests.filter((q: any) => q.npc === n.id);
      const isBoss = data.boss.npc === n.id;
      const todo = qs.some((q: any) => !done.includes(q.id));
      const mark = todo ? '❗' : isBoss && !save().boss[tier] ? '👑' : qs.length || isBoss ? '✅' : '';
      const el = h('button', { class: 'sprite npc' + (todo ? '' : ' met') + (isBoss ? ' boss' : ''), type: 'button', 'aria-label': `${n.name}에게 말 걸기` },
        mark ? h('span', { class: 'npc-mark', 'aria-hidden': 'true' }, mark) : null,
        h('img', { src: n.sprite.src, alt: '', draggable: false }),
        h('span', { class: 'npc-name' }, n.name));
      place(el, n.pos);
      el.onclick = () => walkTo([n.pos[0] + (pos[0] < n.pos[0] ? -6 : 6), n.pos[1]], () => npcMenu(n));
      map.append(el);
    }
    for (const s of data.stations) {
      const el = h('button', { class: 'station', type: 'button', 'aria-label': s.label }, h('span', { class: 'station-emoji' }, s.emoji), h('span', { class: 'station-label' }, s.label));
      place(el, s.pos);
      el.onclick = () => walkTo([s.pos[0], s.pos[1] + 4], () => goStation(s));
      map.append(el);
    }
    // 낱말 요정: 정해진 자리 가운데 세 곳에 나타나 조금씩 옮겨 다녀요
    const fairies: HTMLElement[] = [];
    const spots = shuffle(data.spots as [number, number][]);
    for (let k = 0; k < Math.min(3, spots.length); k++) {
      const m = data.monsters[Math.floor(Math.random() * data.monsters.length)];
      const el = h('button', { class: 'fairy', type: 'button', 'aria-label': '낱말 요정에게 도전하기' }, h('img', { src: m.src, alt: '', draggable: false }), h('span', { class: 'fairy-spark', 'aria-hidden': 'true' }, '✨'));
      (el as any).spot = k;
      place(el, spots[k]);
      el.onclick = () => walkTo([spots[(el as any).spot][0] - 5, spots[(el as any).spot][1]], () => fairyBattle(m, () => { el.remove(); }));
      fairies.push(el);
      map.append(el);
    }
    fairyTimer = window.setInterval(() => {
      const f = fairies[Math.floor(Math.random() * fairies.length)];
      if (!f?.isConnected) return;
      const free = spots.map((_, i) => i).filter((i) => !fairies.some((x) => (x as any).spot === i));
      if (!free.length) return;
      (f as any).spot = free[Math.floor(Math.random() * free.length)];
      place(f, spots[(f as any).spot]);
    }, 4500);
    map.append(me);
    app.replaceChildren(h('div', { class: 'adv rpg' }, top, questBoard(), map,
      h('p', { class: 'muted adv-tip' }, '👆 가고 싶은 곳을 누르면 걸어가요. ❗ 주민에게 퀘스트를 받고, ✨ 낱말 요정을 눌러 친구로 만들어 보세요. 👑 지역 대장 도전은 언제든 할 수 있어요.')));
  }

  function place(el: HTMLElement, p: [number, number]) { el.style.left = `${p[0]}%`; el.style.top = `${p[1]}%`; }

  function questBoard() {
    const done = save().q[tier];
    return h('div', { class: 'quest-bar' },
      ...data.quests.map((q: any) => h('div', { class: 'quest' + (done.includes(q.id) ? ' done' : '') }, done.includes(q.id) ? '✅' : q.emoji, ` ${q.lesson}차시 ${q.title}`)),
      h('div', { class: 'quest boss' + (save().boss[tier] ? ' done' : '') }, save().boss[tier] ? '🏆' : data.boss.emoji, ` ${data.boss.title}`));
  }

  function chooseAvatar() {
    app.replaceChildren(h('div', { class: 'fun-panel' },
      h('h1', null, '🏝️ Lingo Island 대모험'),
      h('p', null, '함께 섬을 탐험할 나의 캐릭터를 골라요. 나중에 ⚙️ 설정에서 바꿀 수 있어요.'),
      h('div', { class: 'avatar-pick' }, ...data.avatars.map((a: any) => h('button', { class: 'avatar-opt', type: 'button', onclick: () => { bag.avatar = a.key; store.saveBag(); mount(); } }, h('img', { src: a.src, alt: '캐릭터' }))))));
  }

  // ───── 주민에게 말 걸기 ─────
  function npcMenu(n: any) {
    const qs = data.quests.filter((q: any) => q.npc === n.id);
    const isBoss = data.boss.npc === n.id;
    const done = save().q[tier];
    const { sheet, close } = overlay(n);
    sheet.append(h('div', { class: 'talk-log' }, bubble(n, `Hi! I'm ${n.name}.`)),
      h('div', { class: 'npc-menu' },
        ...qs.map((q: any) => h('button', { class: 'quest-btn' + (done.includes(q.id) ? ' done' : ''), type: 'button', onclick: () => { close(); runQuest(q); } },
          h('span', { class: 'qb-emoji' }, done.includes(q.id) ? '✅' : q.emoji), h('b', null, q.title), h('small', null, `${q.lesson}차시${done.includes(q.id) ? ' · 다시 하기' : ''}`))),
        isBoss ? h('button', { class: 'quest-btn boss', type: 'button', onclick: () => { close(); runBoss(); } },
          h('span', { class: 'qb-emoji' }, save().boss[tier] ? '🏆' : data.boss.emoji), h('b', null, data.boss.title), h('small', null, `지역 대장 도전 · 하트 3개${save().boss[tier] ? ' · 다시 도전' : ''}`)) : null,
        !qs.length && !isBoss ? h('p', { class: 'muted' }, '지금은 부탁할 일이 없대요.') : null));
  }

  function overlay(n: any | null, cls = '') {
    const sheet = h('div', { class: 'talk-sheet ' + cls, role: 'dialog' });
    const wrap = h('div', { class: 'talk-overlay' }, sheet);
    const close = () => { stopAudio(); wrap.remove(); };
    sheet.append(h('div', { class: 'talk-head' }, n ? h('img', { src: n.sprite.src, alt: '' }) : null, h('b', null, n ? `${n.emoji} ${n.name}` : ''), h('button', { class: 'btn small ghost talk-close', type: 'button', onclick: () => { close(); mount(); } }, '✕ 닫기')));
    document.body.append(wrap);
    return { sheet, close, wrap };
  }

  function bubble(n: any | null, text: string, audio?: any, hidden = false, me = false) {
    const t = h('span', null, hidden ? '· · ·' : text);
    const el = h('div', { class: 'talk-line' + (me ? ' right' : '') },
      h('span', { class: 'talk-who' }, me ? '나' : n ? `${n.emoji} ${n.name}` : '🔊'),
      h('div', { class: 'talk-bubble' }, t, audio ? speakerButton(audio) : null));
    (el as any).reveal = () => (t.textContent = text);
    return el;
  }

  // ───── 장면들을 차례로 진행 (퀘스트·대장 공통) ─────
  function runSteps(steps: any[], host: any, opts: { boss: boolean; onEnd: (results: StepResult[], failed: boolean) => void; sheet: HTMLElement }) {
    const list = steps.filter(lvOk);
    const results: StepResult[] = [];
    const log = h('div', { class: 'talk-log' });
    const task = h('div', { class: 'talk-task' });
    let hearts = 3;
    const heartEl = h('div', { class: 'hearts', 'aria-live': 'polite' });
    const drawHearts = () => (heartEl.textContent = '❤️'.repeat(hearts) + '🤍'.repeat(3 - hearts));
    if (opts.boss) { drawHearts(); opts.sheet.append(heartEl); }
    const progress = h('div', { class: 'step-dots' });
    opts.sheet.append(progress, log, task);
    let i = 0;
    const scroll = () => (log.scrollTop = log.scrollHeight);
    function dots() { progress.replaceChildren(...list.map((_, k) => h('span', { class: k < i ? 'on' : k === i ? 'now' : '' }))); }
    function next() {
      dots();
      if (i >= list.length) return opts.onEnd(results, false);
      const s = list[i];
      task.replaceChildren();
      const fb = h('div', { class: 'feedback', 'aria-live': 'polite' });
      const actions = h('div', { class: 'step-actions' });
      const go = () => { stopAudio(); i++; next(); };
      const nextBtn = (label = '다음 ▶') => h('button', { class: 'btn primary', type: 'button', onclick: go }, label);
      if (s.t === 'talk') {
        const who = npcOf(s.who) ?? host;
        log.append(bubble(who, s.text, s.audio)); scroll();
        playLines([s.audio]);
        task.append(h('div', { class: 'step-actions' }, nextBtn()));
        return;
      }
      if (s.t === 'read') {
        const card = h('div', { class: 'read-card' }, s.title ? h('h3', null, s.title) : null,
          ...s.lines.map((l: any) => h('p', { lang: 'en' }, l.who ? h('b', null, `${l.who}: `) : null, l.text, ' ', speakerButton(l))));
        task.append(card, h('div', { class: 'lab-controls' }, h('button', { class: 'btn small', type: 'button', onclick: () => playLines(s.lines) }, '▶ 모두 듣기'), h('button', { class: 'btn small ghost', type: 'button', onclick: () => playLines(s.lines, 0.75) }, '🐢 천천히')), h('div', { class: 'step-actions' }, nextBtn('다 읽었어요 ▶')));
        return;
      }
      // 점수가 있는 장면
      let tries = 0;
      let finished = false;
      const judge = (ok: boolean, onRetry: () => void, onReveal: () => void) => {
        if (finished) return;
        tries++;
        if (!ok && opts.boss) { hearts--; drawHearts(); heartEl.classList.remove('hit'); void heartEl.offsetWidth; heartEl.classList.add('hit'); }
        if (!ok && opts.boss && hearts <= 0) { finished = true; onReveal(); results.push(res(s, false)); return setTimeout(() => opts.onEnd(results, true), 900); }
        if (ok || tries >= 2) {
          finished = true;
          if (!ok) onReveal();
          results.push(res(s, ok && tries === 1));
          const reveal = (task as any).reveal; reveal?.();
          if (ok && tries === 1) { const c = opts.boss ? 0 : 5; if (c) { store.addCoins(c); coinPop(task, c); } }
          fb.replaceChildren(h('div', { class: 'fb ' + (ok ? 'fb-ok' : 'fb-reveal') }, h('strong', null, ok ? (tries === 1 ? '🎉 정답!' : '👍 맞았어요!') : '💡 정답을 확인해요'), !ok ? h('p', { class: 'fb-answer', lang: 'en' }, answerOf(s)) : null, s.explain ? h('p', null, s.explain) : null));
          actions.replaceChildren(nextBtn());
          actions.querySelector('button')?.focus({ preventScroll: true });
        } else { onRetry(); fb.replaceChildren(h('div', { class: 'fb fb-retry' }, opts.boss ? '💔 하트가 하나 줄었어요. 다시 해 볼까요?' : '🤔 다시 생각해 볼까요?')); }
      };
      const isDone = () => finished;
      task.append(h('p', { class: 'q' }, s.q ?? (s.t === 'spell' ? '잘 듣고 낱말의 철자를 맞혀요.' : '')));
      if (s.t === 'choose') {
        if (s.say) {
          const bs = s.say.map((l: any) => bubble(npcOf(l.who) ?? (l.who ? null : host), l.text, l, !s.script));
          log.append(...bs); scroll();
          (task as any).reveal = () => bs.forEach((b: any) => b.reveal());
          playLines(s.say);
          task.append(h('div', { class: 'lab-controls' }, h('button', { class: 'btn small', type: 'button', onclick: () => playLines(s.say) }, '🔊 다시 듣기'), h('button', { class: 'btn small ghost', type: 'button', onclick: () => playLines(s.say, 0.75) }, '🐢 천천히')));
        } else (task as any).reveal = null;
        const box = h('div', { class: 'options' + (s.options.every((o: string) => o.length <= 16) ? ' short' : '') });
        for (const [k, o] of shuffle(s.options.map((o: string, k: number) => [k, o] as [number, string]))) {
          const b = h('button', { class: 'opt', type: 'button', 'data-t': o, onclick: () => judge(o === s.answer, () => { b.classList.add('wrong'); b.setAttribute('disabled', ''); }, () => { box.querySelectorAll('.opt').forEach((x) => { if (x.getAttribute('data-t') === s.answer) x.classList.add('right'); }); }) }, o);
          b.addEventListener('click', () => { if (o === s.answer) b.classList.add('right'); if (finished) box.querySelectorAll('.opt').forEach((x) => x.setAttribute('disabled', '')); });
          box.append(s.optionAudio ? h('div', { class: 'opt-row' }, speakerButton(s.optionAudio[k]), b) : b);
        }
        task.append(box);
      }
      if (s.t === 'build') {
        if (s.ko && tier !== 'A') task.append(h('p', { class: 'q-sub' }, `뜻: ${s.ko}`));
        sentenceView({ answer: s.answer, extra: s.extra, answerAudio: s.listen && tier !== 'B' ? s.answerAudio : null }, task, actions, judge, isDone);
      }
      if (s.t === 'spell') {
        const vis = h('div', { class: 'spell-visual' });
        task.append(vis);
        spellView({ word: s.word, extra: tier === 'C' ? '' : 'e', emoji: s.emoji, wordAudio: s.wordAudio }, vis, task, actions, judge, isDone);
        playLines([s.wordAudio]);
      }
      if (s.t === 'speak') speakView({ target: s.target, targetAudio: s.targetAudio, stress: s.stress, tone: s.tone, tip: s.tip }, task, actions, fb, judge, isDone);
      if (s.t === 'write') writeView({ ...s, key: `${data.id}-${i}` }, data.unitId, task, actions, fb, judge, isDone);
      task.append(fb, actions);
    }
    next();
  }
  const res = (s: any, ok: boolean): StepResult => ({ key: `${s.t}-${(s.q ?? s.word ?? '').slice(0, 20)}`, std: s.std, cat: s.cat ?? '과정·기능', lv: tier, ok, hint: false });
  const answerOf = (s: any) => s.t === 'choose' ? s.answer : s.t === 'build' ? s.answer : s.t === 'spell' ? s.word : s.t === 'speak' ? s.target : '';

  function runQuest(q: any) {
    const n = data.npcs.find((x: any) => x.id === q.npc);
    const { sheet, close } = overlay(n);
    sheet.append(h('div', { class: 'quest-title' }, `${q.emoji} ${q.lesson}차시 퀘스트 — ${q.title}`));
    runSteps(q.steps, n, {
      boss: false, sheet,
      onEnd: (results) => {
        const first = !save().q[tier].includes(q.id);
        if (first) save().q[tier].push(q.id);
        store.saveBag();
        if (results.length) record(data.unitId, data.id, tier, q.id, results);
        const okN = results.filter((r) => r.ok).length;
        if (first) { store.addCoins(15); addXp(40); }
        else addXp(10);
        confetti();
        sheet.querySelector('.talk-task')!.replaceChildren(h('div', { class: 'fun-result small' },
          h('div', { class: 'fun-result-emoji' }, '🎁'), h('h2', null, '퀘스트 완료!'),
          h('p', null, results.length ? `처음에 맞힌 것 ${okN} / ${results.length}` : ''),
          h('p', null, first ? '🪙 +15 · ⭐ 경험치 +40' : '⭐ 경험치 +10'),
          h('button', { class: 'btn primary', type: 'button', onclick: () => { close(); mount(); } }, '지도로 ▶')));
      },
    });
  }

  function runBoss() {
    const n = data.npcs.find((x: any) => x.id === data.boss.npc);
    const { sheet, close } = overlay(n, 'boss-sheet');
    sheet.append(h('div', { class: 'quest-title' }, `${data.boss.emoji} ${data.boss.title}`));
    const intro = h('div', { class: 'boss-intro' }, h('p', null, data.boss.intro), h('p', { class: 'muted' }, '❤️ 하트 3개로 도전해요. 틀리면 하트가 하나씩 줄어요.'),
      h('button', { class: 'btn primary big', type: 'button', onclick: () => { intro.remove(); start(); } }, '도전 시작!'));
    sheet.append(intro);
    function start() {
      runSteps(data.boss.steps, n, {
        boss: true, sheet,
        onEnd: (results, failed) => {
          record(data.unitId, data.id, tier, 'boss', results);
          const task = sheet.querySelector('.talk-task')!;
          if (failed) {
            addXp(10);
            task.replaceChildren(h('div', { class: 'fun-result small' }, h('div', { class: 'fun-result-emoji' }, '💪'), h('h2', null, '아쉬워요! 다시 도전해 볼까요?'), h('p', null, '퀘스트와 낱말 요정으로 연습하고 오면 더 쉬워요.'),
              h('div', { class: 'note-actions' }, h('button', { class: 'btn primary', type: 'button', onclick: () => { close(); runBoss(); } }, '🔁 다시 도전'), h('button', { class: 'btn', type: 'button', onclick: () => { close(); mount(); } }, '지도로'))));
            return;
          }
          const first = !save().boss[tier];
          save().boss[tier] = true;
          store.saveBag();
          if (first) { store.addCoins(50); addXp(120); } else addXp(20);
          confetti();
          task.replaceChildren(h('div', { class: 'fun-result' }, h('div', { class: 'fun-result-emoji' }, '🏆'), h('h2', null, data.boss.win), h('p', { class: 'r-stars' }, '❤️'.repeat(Math.max(0, 3 - results.filter((r) => !r.ok).length))),
            h('p', null, first ? `🏅 ${data.area} 배지를 받았어요! 🪙 +50 · ⭐ 경험치 +120` : '⭐ 경험치 +20'),
            h('div', { class: 'note-actions' }, h('a', { class: 'btn primary', href: data.worldUrl }, '🌍 세계 지도로'), h('button', { class: 'btn', type: 'button', onclick: () => { close(); mount(); } }, '이 지역에 남기'))));
        },
      });
    }
  }

  // ───── 낱말 요정 대결 ─────
  function pool() {
    const ws = data.words.filter((w: any) => tier === 'A' || (tier === 'B' ? w.lv !== 'A' : w.lv === 'C'));
    return shuffle(ws).sort((a: any, b: any) => boxLv(a) - boxLv(b));
  }
  function fairyBattle(m: any, gone: () => void) {
    const { sheet, close } = overlay(null, 'fairy-sheet');
    const mon = h('div', { class: 'fairy-big' }, h('img', { src: m.src, alt: '낱말 요정' }));
    const hp = h('div', { class: 'fairy-hp' });
    const area = h('div', { class: 'talk-task' });
    sheet.append(mon, hp, area);
    const words = pool();
    const reviews = shuffle(data.review.filter((w: any) => boxLv(w) === 1 && bag.box[w.unit]?.[w.word] !== undefined));
    const rounds: any[] = [];
    for (let k = 0; k < 3; k++) rounds.push(k === 2 && reviews.length ? reviews[0] : words[k % words.length]);
    let r = 0, win = 0;
    const results: StepResult[] = [];
    const drawHp = () => hp.replaceChildren(...[0, 1, 2].map((k) => h('span', { class: k < win ? 'star on' : 'star' }, '⭐')));
    drawHp();
    function round() {
      if (r >= rounds.length) return end();
      const w = rounds[r];
      const all = shuffle((data.words.includes(w) ? data.words : data.review.filter((x: any) => x.unit === w.unit)).filter((x: any) => x.word !== w.word));
      const kind = tier === 'C' ? 'hear-pic' : tier === 'B' ? 'pic-word' : r % 2 ? 'spell' : 'hear-word';
      area.replaceChildren();
      let tries = 0, over = false;
      const judge = (ok: boolean, onRetry: () => void, onReveal: () => void) => {
        if (over) return;
        tries++;
        if (ok || tries >= 2) {
          over = true;
          if (!ok) onReveal();
          const first = ok && tries === 1;
          results.push({ key: `fairy-${w.word}`, std: data.fairyStd, cat: '지식·이해', lv: tier, ok: first, hint: false });
          setBox(w, first ? boxLv(w) + 1 : 1);
          if (first) { win++; drawHp(); const star = h('div', { class: 'magic-star', 'aria-hidden': 'true' }, '🌟'); sheet.append(star); setTimeout(() => star.remove(), 800); mon.classList.remove('hit'); void mon.offsetWidth; mon.classList.add('hit'); }
          area.append(h('div', { class: 'fb ' + (ok ? 'fb-ok' : 'fb-reveal') }, h('strong', null, ok ? '✨ 마법 별 발사!' : '💡 정답'), h('p', { lang: 'en' }, `${w.emoji} ${w.word} — ${w.ko}`)));
          playLines([w.audio]);
          setTimeout(() => { r++; round(); }, 1400);
        } else onRetry();
      };
      if (kind === 'spell') {
        const vis = h('div', { class: 'spell-visual' });
        const acts = h('div', { class: 'step-actions' });
        area.append(h('p', { class: 'q' }, `「${w.ko}」 낱말의 철자를 맞혀요.`), vis);
        spellView({ word: w.word, extra: 'e', emoji: w.emoji, wordAudio: w.audio }, vis, area, acts, judge, () => over);
        area.append(acts);
        return;
      }
      const opts = shuffle([w, ...all.slice(0, kind === 'hear-pic' ? 2 : 3)]);
      area.append(h('p', { class: 'q' }, kind === 'hear-pic' ? '요정이 외친 낱말의 그림을 골라요!' : kind === 'pic-word' ? '그림에 알맞은 낱말을 골라요!' : '요정이 외친 낱말을 골라요!'),
        kind === 'pic-word' ? h('div', { class: 'big-emoji small' }, w.emoji) : h('div', { class: 'lab-controls center' }, h('button', { class: 'btn', type: 'button', onclick: () => playLines([w.audio]) }, '🔊 다시 듣기')));
      const box = h('div', { class: 'options short' + (kind === 'hear-pic' ? ' pics' : '') });
      for (const o of opts) {
        const b = h('button', { class: 'opt', type: 'button', 'data-t': o.word, onclick: () => judge(o.word === w.word, () => { b.classList.add('wrong'); b.setAttribute('disabled', ''); }, () => box.querySelectorAll('.opt').forEach((x) => { if (x.getAttribute('data-t') === w.word) x.classList.add('right'); })) },
          kind === 'hear-pic' ? h('span', { class: 'pic' }, o.emoji) : h('span', { lang: 'en' }, o.word));
        box.append(b);
      }
      area.append(box);
      if (kind !== 'pic-word') playLines([w.audio]);
    }
    function end() {
      record(data.unitId, data.id, tier, 'fairy', results);
      const friend = win >= 2;
      const task = area;
      if (friend) {
        const rs = rpgSave(); rs.monsters[m.key] = (rs.monsters[m.key] ?? 0) + 1;
        store.addCoins(win * 3); addXp(15 + win * 5); store.saveBag(); confetti();
        mon.classList.add('happy');
      } else { addXp(5); mon.classList.add('away'); }
      task.replaceChildren(h('div', { class: 'fun-result small' }, h('h2', null, friend ? '💕 낱말 요정이 친구가 됐어요!' : '💨 요정이 달아났어요. 다음에 다시 만나요!'),
        h('p', null, friend ? `🪙 +${win * 3} · ⭐ 경험치 +${15 + win * 5}` : '⭐ 경험치 +5'),
        h('button', { class: 'btn primary', type: 'button', onclick: () => { close(); gone(); mount(); } }, '지도로 ▶')));
    }
    round();
  }

  function goStation(s: any) {
    const { sheet } = overlay(null, 'small');
    sheet.append(h('div', { class: 'station-big', 'aria-hidden': 'true' }, s.emoji), h('h2', null, s.label), h('p', null, `「${s.title}」 미니게임을 하러 갈까요?`),
      h('div', { class: 'note-actions center' }, h('a', { class: 'btn primary', href: `${s.href}?tier=${tier}&from=${encodeURIComponent(location.pathname)}` }, '▶ 출발!')));
  }

  function shop() {
    const { sheet } = overlay(null);
    const render = () => {
      sheet.querySelector('.shop-grid')?.remove();
      sheet.append(h('div', { class: 'shop-grid' }, ...HATS.map((it) => {
        const own = bag.owned.includes(it.id), wear = bag.wear === it.id;
        return h('div', { class: 'shop-item' + (wear ? ' on' : '') }, h('div', { class: 'shop-emoji' }, it.emoji), h('div', null, it.name),
          own ? h('button', { class: 'btn small' + (wear ? ' primary' : ''), type: 'button', onclick: () => { bag.wear = wear ? null : it.id; store.saveBag(); render(); } }, wear ? '벗기' : '쓰기')
            : h('button', { class: 'btn small', type: 'button', disabled: bag.coins < it.price, onclick: () => { bag.coins -= it.price; bag.owned.push(it.id); bag.wear = it.id; store.saveBag(); confetti(); render(); } }, `🪙 ${it.price}`));
      })));
    };
    sheet.append(h('h2', null, `🛍️ 꾸미기 상점 · 🪙 ${bag.coins}`), h('p', { class: 'muted' }, '퀘스트, 낱말 요정, 지역 대장 도전으로 코인을 모아요.'));
    render();
  }

  function dex() {
    const { sheet } = overlay(null);
    const rs = rpgSave();
    const all = data.words;
    const known = all.filter((w: any) => boxLv(w) >= 3).length;
    sheet.append(h('h2', null, '📒 도감'),
      h('h3', null, `💕 몬스터 친구 (${Object.keys(rs.monsters).length} / ${data.monsters.length})`),
      h('div', { class: 'mon-grid' }, ...data.monsters.map((m: any) => rs.monsters[m.key] ? h('div', { class: 'mon-card' }, h('img', { src: m.src, alt: '' }), h('small', null, `× ${rs.monsters[m.key]}`)) : h('div', { class: 'mon-card unknown' }, h('span', null, '?')))),
      h('h3', null, `📚 ${data.area} 낱말 (⭐ 외움 ${known} / ${all.length})`),
      h('div', { class: 'word-dex' }, ...all.map((w: any) => h('button', { class: 'word-chip lv' + boxLv(w), type: 'button', onclick: () => playLines([w.audio]) }, `${w.emoji} ${w.word} `, h('small', null, w.ko), ' ', '⭐'.repeat(boxLv(w) - 1)))),
      h('p', { class: 'muted' }, '낱말 요정과 단어 도서관에서 맞힐수록 ⭐가 늘어요. 낱말을 누르면 소리가 나와요.'));
  }

  function settings() {
    const { sheet, close } = overlay(null);
    sheet.append(h('h2', null, '⚙️ 설정'),
      h('div', { class: 'note-actions' },
        h('button', { class: 'btn', type: 'button', onclick: () => { bag.avatar = null; store.saveBag(); close(); mount(); } }, '🔄 캐릭터 바꾸기')),
      h('h3', null, '처음부터 다시 하기'),
      h('p', { class: 'muted' }, '사회·과학 같은 다른 교과의 기록은 지워지지 않아요.'),
      h('div', { class: 'note-actions' },
        h('button', { class: 'btn danger', type: 'button', onclick: () => { if (confirm(`「${data.area}」의 퀘스트와 대장 도전 기록을 지우고 다시 할까요?`)) { resetRegion(data.id); close(); mount(); toast('이 지역을 처음부터 다시 시작해요.'); } } }, `🗑️ 「${data.area}」만 다시 하기`),
        h('button', { class: 'btn danger', type: 'button', onclick: () => { if (confirm('영어 RPG의 레벨, 코인, 꾸미기, 도감, 모든 지역 기록을 지울까요? 되돌릴 수 없어요.') && confirm('정말 처음부터 다시 시작할까요?')) { resetAll(); close(); location.href = data.worldUrl; } } }, '🗑️ 영어 RPG 전체 처음부터')));
  }

  mount();
}
