// 영어 어드벤처: 내 캐릭터가 학교 맵을 걸어 다니며 친구(NPC)에게 영어로 묻고 답해 친구 카드를 모아요.
// 단계: 🧭 질문 고르기 · 대본 보며 듣기 / 🔎 낱말 카드로 질문 만들기 · 듣고 고르기 / 🏅 직접 말하기 · 듣고 고르기
import { h, readJSON, shuffle } from './dom';
import * as store from './store';
import type { Tier, StepResult } from './store';
import { playLines, stopAudio, speakerButton, speakView, sentenceView } from './english';
import { TIERS, HATS, readTier, topBar, avatarImg, coinPop, confetti, toast, record, judgeFor } from './fun';

const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];
const ORD_LABEL: Record<string, string> = { first: '1️⃣ first', second: '2️⃣ second', third: '3️⃣ third', fourth: '4️⃣ fourth', fifth: '5️⃣ fifth', sixth: '6️⃣ sixth' };

export function startAdventure() {
  const data = readJSON<any>('game-data');
  const app = document.getElementById('app')!;
  let tier: Tier = readTier(data.id);
  const bag = store.getBag();
  const met = () => (bag.friends[`${data.id}:${tier}`] ??= []);

  function mount() {
    stopAudio();
    if (!bag.avatar) return chooseAvatar();
    const { el: bar, coins } = topBar(data, tier, (t) => { tier = t; mount(); },
      h('div', { class: 'fun-tools' },
        h('button', { class: 'btn small ghost', type: 'button', onclick: () => shop() }, '🛍️ 꾸미기'),
        h('button', { class: 'btn small ghost', type: 'button', onclick: () => friendBook() }, '📒 친구 카드'),
        h('button', { class: 'btn small ghost', type: 'button', onclick: () => { bag.avatar = null; store.saveBag(); mount(); } }, '🔄 캐릭터')));
    const map = h('div', { class: 'adv-map', role: 'application', 'aria-label': '학교 지도. 가고 싶은 곳이나 친구를 눌러요.' });
    map.append(h('img', { class: 'adv-bg', src: data.map.src, alt: data.map.alt ?? '', draggable: false }));
    const me = avatarImg(data.avatars, 'sprite me');
    let pos: [number, number] = [...data.start];
    place(me, pos);
    let walking = 0;
    function walkTo(target: [number, number], then?: () => void) {
      const tx = Math.min(96, Math.max(4, target[0])), ty = Math.min(95, Math.max(12, target[1]));
      const dist = Math.hypot(tx - pos[0], (ty - pos[1]) * 0.67);
      const ms = Math.max(250, dist * 45);
      me.classList.toggle('left', tx < pos[0]);
      me.classList.add('walking');
      me.style.transition = `left ${ms}ms linear, top ${ms}ms linear`;
      pos = [tx, ty];
      place(me, pos);
      const my = ++walking;
      setTimeout(() => { if (my !== walking) return; me.classList.remove('walking'); then?.(); }, ms);
    }
    map.addEventListener('click', (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.npc, .station')) return;
      const r = map.getBoundingClientRect();
      walkTo([((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100]);
    });
    for (const n of data.npcs) {
      const done = met().includes(n.id);
      const el = h('button', { class: 'sprite npc' + (done ? ' met' : ''), type: 'button', 'aria-label': `${n.name}에게 말 걸기` },
        h('span', { class: 'npc-mark', 'aria-hidden': 'true' }, done ? '✅' : '❗'),
        h('img', { src: n.sprite.src, alt: '', draggable: false }),
        h('span', { class: 'npc-name' }, n.name));
      place(el, n.pos);
      el.onclick = () => walkTo([n.pos[0] + (pos[0] < n.pos[0] ? -7 : 7), n.pos[1]], () => talk(n, () => { coins.refresh(); mount(); }));
      map.append(el);
    }
    for (const s of data.stations) {
      const el = h('button', { class: 'station', type: 'button', 'aria-label': s.label }, h('span', { class: 'station-emoji' }, s.emoji), h('span', { class: 'station-label' }, s.label));
      place(el, s.pos);
      el.onclick = () => walkTo([s.pos[0], s.pos[1] + 4], () => goStation(s));
      map.append(el);
    }
    map.append(me);
    app.replaceChildren(h('div', { class: 'adv' }, bar, questBar(), map,
      h('p', { class: 'muted adv-tip' }, `👆 가고 싶은 곳을 누르면 걸어가요. ❗ 친구를 눌러 영어로 말을 걸어 보세요. (${TIERS[tier].emoji} ${tierHint()})`)));
  }

  function tierHint() {
    return tier === 'C' ? '알맞은 질문을 골라 물어봐요' : tier === 'B' ? '낱말 카드로 질문을 만들어 물어봐요' : '질문을 직접 소리 내어 말해 봐요';
  }

  function place(el: HTMLElement, p: [number, number]) {
    el.style.left = `${p[0]}%`;
    el.style.top = `${p[1]}%`;
  }

  function questBar() {
    const friends = data.npcs.filter((n: any) => met().includes(n.id));
    return h('div', { class: 'quest-bar' }, ...data.quests.map((q: any) => {
      const have = friends.filter((n: any) => !q.grade || n.grade === q.grade).length;
      const ok = have >= q.need;
      return h('div', { class: 'quest' + (ok ? ' done' : '') }, h('span', null, ok ? '🏅' : q.emoji), ' ', q.title, h('b', null, ` ${Math.min(have, q.need)}/${q.need}`));
    }));
  }

  function chooseAvatar() {
    app.replaceChildren(h('div', { class: 'fun-panel' },
      h('h1', null, data.emoji, ' ', data.title),
      h('p', null, data.story),
      h('h2', null, '나의 캐릭터를 골라요'),
      h('div', { class: 'avatar-pick' }, ...data.avatars.map((a: any) => h('button', { class: 'avatar-opt', type: 'button', onclick: () => { bag.avatar = a.key; store.saveBag(); mount(); } }, h('img', { src: a.src, alt: '캐릭터' }))))));
  }

  // ───── 친구와 대화 ─────
  function talk(n: any, onClose: () => void) {
    const results: StepResult[] = [];
    const sheet = h('div', { class: 'talk-sheet', role: 'dialog', 'aria-label': `${n.name}와 대화` });
    const log = h('div', { class: 'talk-log' });
    const task = h('div', { class: 'talk-task' });
    const close = h('button', { class: 'btn small ghost talk-close', type: 'button', onclick: () => { stopAudio(); overlay.remove(); onClose(); } }, '✕ 그만하기');
    sheet.append(h('div', { class: 'talk-head' }, h('img', { src: n.sprite.src, alt: '' }), h('b', null, `${n.emoji} ${n.name}`), close), log, task);
    const overlay = h('div', { class: 'talk-overlay' }, sheet);
    document.body.append(overlay);

    const say = (who: 'npc' | 'me', text: string, audio?: any, hidden = false) => {
      const t = h('span', null, hidden ? '· · ·' : text);
      const b = h('div', { class: 'talk-line ' + (who === 'me' ? 'right' : '') },
        h('span', { class: 'talk-who' }, who === 'me' ? '나' : `${n.emoji} ${n.name}`),
        h('div', { class: 'talk-bubble' }, t, audio ? speakerButton(audio) : null));
      log.append(b);
      log.scrollTop = log.scrollHeight;
      if (audio) playLines([audio]);
      return { reveal: () => (t.textContent = text) };
    };
    const coin = (firstOk: boolean) => { const c = firstOk ? 10 : 3; store.addCoins(c); coinPop(sheet, c); };
    const fb = h('div', { class: 'feedback', 'aria-live': 'polite' });

    // 1) 묻기 (단계마다 방법이 달라요)
    function ask(kind: 'grade' | 'club', next: () => void) {
      const question = kind === 'grade' ? 'What grade are you in?' : 'What club are you in?';
      const audio = data.ask[kind];
      task.replaceChildren();
      fb.replaceChildren();
      const done = (firstOk: boolean, correct: boolean) => {
        results.push({ key: `${n.id}-ask-${kind}`, std: tier === 'A' ? data.std.speak : data.std.ask, cat: '과정·기능', lv: tier, ok: firstOk, hint: false });
        coin(firstOk);
        say('me', question, audio);
        setTimeout(next, 1700);
        void correct;
      };
      const j = judgeFor(done);
      const retry = () => fb.replaceChildren(h('div', { class: 'fb fb-retry' }, `🤔 ${kind === 'grade' ? '학년' : '동아리'}을 묻는 말을 다시 생각해 봐요.`));
      task.append(h('p', { class: 'q' }, `${n.name}에게 ${kind === 'grade' ? '몇 학년인지' : '무슨 동아리인지'} 물어보세요.`));
      if (tier === 'C') {
        const opts = shuffle(['What grade are you in?', 'What club are you in?']);
        const box = h('div', { class: 'options short' });
        for (const o of opts) {
          const b = h('button', { class: 'opt', type: 'button', onclick: () => j.judge(o === question, () => { b.classList.add('wrong'); b.setAttribute('disabled', ''); retry(); }, () => {}) }, o);
          box.append(h('div', { class: 'opt-row' }, speakerButton(o === question ? audio : data.ask[kind === 'grade' ? 'club' : 'grade']), b));
        }
        task.append(box);
      } else if (tier === 'B') {
        const actions = h('div', { class: 'step-actions' });
        sentenceView({ answer: question, extra: kind === 'grade' ? ['club', 'what'] : ['grade', 'what'], answerAudio: audio }, task, actions, (ok: boolean, onRetry: () => void, onReveal: () => void) => j.judge(ok, () => { onRetry(); retry(); }, onReveal), () => j.done);
        task.append(actions);
      } else {
        const actions = h('div', { class: 'step-actions' });
        speakView({ target: question, targetAudio: audio, stress: [kind === 'grade' ? 'grade' : 'club'], tone: 'down', tip: '의문사로 묻는 말은 끝을 내려요.' }, task, actions, fb, (ok: boolean) => j.judge(ok, () => {}, () => {}), () => j.done);
        task.append(actions);
      }
      task.append(fb);
    }

    // 2) 듣고 고르기
    function listen(kind: 'grade' | 'club', next: () => void) {
      task.replaceChildren();
      fb.replaceChildren();
      const audio = kind === 'grade' ? n.gradeAudio : n.clubAudio;
      const line = say('npc', audio.text, audio, tier !== 'C');
      const done = (firstOk: boolean) => {
        results.push({ key: `${n.id}-listen-${kind}`, std: data.std.listen, cat: '과정·기능', lv: tier, ok: firstOk, hint: false });
        coin(firstOk);
        line.reveal();
        setTimeout(next, 900);
      };
      const j = judgeFor((firstOk) => done(firstOk));
      let opts: { v: string; label: string }[];
      if (kind === 'grade') {
        const pool = tier === 'C' ? shuffle(ORD.filter((o) => o !== n.grade)).slice(0, 2).concat(n.grade) : ORD.slice();
        opts = (tier === 'C' ? shuffle(pool) : pool).map((v) => ({ v, label: ORD_LABEL[v] }));
      } else {
        const others = data.clubs.filter((c: any) => c.club !== n.club);
        const pick = tier === 'A' ? others : shuffle(others).slice(0, tier === 'C' ? 2 : 3);
        opts = shuffle([...pick, { club: n.club, emoji: n.clubEmoji }]).map((c: any) => ({ v: c.club, label: `${c.emoji} ${c.club}` }));
      }
      const want = kind === 'grade' ? n.grade : n.club;
      task.append(h('p', { class: 'q' }, `${n.name}의 대답을 듣고 ${kind === 'grade' ? '학년' : '동아리'}을 골라 보세요.`),
        h('div', { class: 'lab-controls' }, h('button', { class: 'btn small', type: 'button', onclick: () => playLines([audio]) }, '🔊 다시 듣기'), h('button', { class: 'btn small ghost', type: 'button', onclick: () => playLines([audio], 0.75) }, '🐢 천천히')));
      const box = h('div', { class: 'options short' });
      for (const o of opts) {
        const b = h('button', { class: 'opt', type: 'button', onclick: () => j.judge(o.v === want, () => { b.classList.add('wrong'); b.setAttribute('disabled', ''); fb.replaceChildren(h('div', { class: 'fb fb-retry' }, '🤔 다시 들어 볼까요?')); }, () => { box.querySelectorAll('.opt').forEach((x) => { if (x.getAttribute('data-v') === want) x.classList.add('right'); }); }), 'data-v': o.v }, o.label);
        box.append(b);
      }
      task.append(box, fb);
    }

    function finish() {
      task.replaceChildren();
      say('npc', 'Nice to meet you!', n.byeAudio);
      const list = met();
      const first = !list.includes(n.id);
      if (first) list.push(n.id);
      store.saveBag();
      record(data.unitId, data.id, tier, n.id, results);
      task.append(h('div', { class: 'friend-card' },
        h('img', { src: n.sprite.src, alt: '' }),
        h('div', null, h('b', null, `${n.emoji} ${n.name}`), h('p', { lang: 'en' }, `${n.grade} grade · ${n.clubEmoji} ${n.club} club`), h('small', null, first ? '📒 친구 카드를 받았어요!' : '다시 만났어요!'))),
        h('div', { class: 'note-actions' }, h('button', { class: 'btn primary', type: 'button', onclick: () => { stopAudio(); overlay.remove(); onClose(); } }, '지도로 돌아가기 ▶')));
      if (first) checkQuests();
    }

    say('npc', n.hello, n.helloAudio, false);
    task.append(h('button', { class: 'btn primary', type: 'button', onclick: () => { say('me', 'Hi!'); ask('grade', () => listen('grade', () => ask('club', () => listen('club', finish)))); } }, '👋 인사하기'));
  }

  function checkQuests() {
    const friends = data.npcs.filter((n: any) => met().includes(n.id));
    const key = `${data.id}:${tier}:quests`;
    const doneList: string[] = ((bag as any)[key] ??= []);
    for (const q of data.quests) {
      const have = friends.filter((n: any) => !q.grade || n.grade === q.grade).length;
      if (have >= q.need && !doneList.includes(q.id)) {
        doneList.push(q.id);
        store.addCoins(30);
        confetti();
        toast(`🏅 퀘스트 완료! ${q.title} (+30 🪙)`);
      }
    }
    store.saveBag();
  }

  function goStation(s: any) {
    const sheet = h('div', { class: 'talk-sheet small', role: 'dialog' },
      h('div', { class: 'station-big', 'aria-hidden': 'true' }, s.emoji),
      h('h2', null, s.label),
      h('p', null, `「${s.title}」 게임을 하러 갈까요?`),
      h('div', { class: 'note-actions' },
        h('a', { class: 'btn primary', href: `${s.href}?tier=${tier}&from=${encodeURIComponent(location.pathname)}` }, '▶ 출발!'),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => overlay.remove() }, '다음에')));
    const overlay = h('div', { class: 'talk-overlay' }, sheet);
    document.body.append(overlay);
  }

  function shop() {
    const panel = h('div', { class: 'talk-sheet', role: 'dialog', 'aria-label': '꾸미기 상점' });
    const overlay = h('div', { class: 'talk-overlay' }, panel);
    const render = () => {
      panel.replaceChildren(
        h('div', { class: 'talk-head' }, h('b', null, `🛍️ 꾸미기 상점 · 🪙 ${bag.coins}`), h('button', { class: 'btn small ghost talk-close', type: 'button', onclick: () => { overlay.remove(); mount(); } }, '✕ 닫기')),
        h('p', { class: 'muted' }, '영어로 대화하고 미니게임을 하면 코인이 모여요.'),
        h('div', { class: 'shop-grid' }, ...HATS.map((it) => {
          const own = bag.owned.includes(it.id);
          const wear = bag.wear === it.id;
          return h('div', { class: 'shop-item' + (wear ? ' on' : '') },
            h('div', { class: 'shop-emoji', 'aria-hidden': 'true' }, it.emoji), h('div', null, it.name),
            own
              ? h('button', { class: 'btn small' + (wear ? ' primary' : ''), type: 'button', onclick: () => { bag.wear = wear ? null : it.id; store.saveBag(); render(); } }, wear ? '벗기' : '쓰기')
              : h('button', { class: 'btn small', type: 'button', disabled: bag.coins < it.price, onclick: () => { bag.coins -= it.price; bag.owned.push(it.id); bag.wear = it.id; store.saveBag(); confetti(); render(); } }, `🪙 ${it.price}`));
        })));
    };
    render();
    document.body.append(overlay);
  }

  function friendBook() {
    const panel = h('div', { class: 'talk-sheet', role: 'dialog', 'aria-label': '친구 카드' });
    const overlay = h('div', { class: 'talk-overlay' }, panel);
    panel.append(h('div', { class: 'talk-head' }, h('b', null, `📒 친구 카드 (${TIERS[tier].emoji} ${TIERS[tier].name})`), h('button', { class: 'btn small ghost talk-close', type: 'button', onclick: () => overlay.remove() }, '✕ 닫기')),
      h('div', { class: 'friend-grid' }, ...data.npcs.map((n: any) => met().includes(n.id)
        ? h('div', { class: 'friend-card' }, h('img', { src: n.sprite.src, alt: '' }), h('div', null, h('b', null, `${n.emoji} ${n.name}`), h('p', { lang: 'en' }, `${n.grade} grade · ${n.clubEmoji} ${n.club} club`)))
        : h('div', { class: 'friend-card unknown' }, h('div', { class: 'q-mark' }, '?'), h('div', null, h('b', null, '아직 만나지 않았어요'))))));
    document.body.append(overlay);
  }

  void HATS;
  mount();
}
