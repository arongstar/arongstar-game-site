// 영어 게임: 소리 듣기, 따라 말하기(녹음·비교), 문장 만들기, 철자 맞히기, 글쓰기 카드
// 소리는 미리 만든 mp3 를 쓰고, 파일이 없거나 재생이 안 되면 기기의 영어 음성(speechSynthesis)으로 읽어요.
// 녹음한 목소리는 이 기기 안에서만 다시 듣고 어디에도 저장하거나 보내지 않아요.
import { h, shuffle } from './dom';
import * as store from './store';

export type Line = { who: string; emoji: string; text: string; voice: string; src: string | null };

// ───────────── 소리 재생 ─────────────
let player: HTMLAudioElement | null = null;
let token = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function stopAudio() {
  token++;
  if (player) { player.onended = null; player.onerror = null; player.pause(); }
  try { window.speechSynthesis?.cancel(); } catch { /* 없음 */ }
}

function pickVoice(female: boolean): SpeechSynthesisVoice | undefined {
  const vs = window.speechSynthesis?.getVoices?.() ?? [];
  const en = vs.filter((v) => /^en(-|_)/i.test(v.lang));
  const us = en.filter((v) => /US/i.test(v.lang));
  const pool = us.length ? us : en;
  const fem = /female|samantha|zira|aria|jenny|google us english|karen|moira|tessa|victoria|allison|ava|susan/i;
  return pool.find((v) => fem.test(v.name) === female) ?? pool[0];
}

function ttsSpeak(text: string, voice: string, rate: number): Promise<void> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    const v = pickVoice(/^(af|bf)_/.test(voice));
    if (v) u.voice = v;
    u.rate = 0.9 * rate;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    synth.speak(u);
    // 일부 기기에서 onend 가 오지 않을 때를 대비
    setTimeout(resolve, 1200 + text.length * 120 / rate);
  });
}

function playOne(l: Line, rate: number, my: number): Promise<void> {
  if (!l.src) return ttsSpeak(l.text, l.voice, rate);
  return new Promise((resolve) => {
    player ??= new Audio();
    const p = player;
    let settled = false;
    const done = () => { if (!settled) { settled = true; resolve(); } };
    p.onended = done;
    p.onerror = () => { if (my === token) ttsSpeak(l.text, l.voice, rate).then(done); else done(); };
    p.src = l.src!;
    p.playbackRate = rate;
    (p as any).preservesPitch = true;
    p.play().catch(() => { if (my === token) ttsSpeak(l.text, l.voice, rate).then(done); else done(); });
  });
}

export async function playLines(lines: Line[], rate = 1, onLine?: (i: number) => void) {
  stopAudio();
  const my = token;
  for (let i = 0; i < lines.length; i++) {
    if (my !== token) return;
    onLine?.(i);
    await playOne(lines[i], rate, my);
    if (my !== token) return;
    await sleep(300);
  }
  if (my === token) onLine?.(-1);
}

export function speakerButton(line: Line, label = '🔊') {
  return h('button', { class: 'btn small ghost say-btn', type: 'button', 'aria-label': `듣기: ${line.text}`, onclick: (e: Event) => { e.stopPropagation(); playLines([line]); } }, label);
}

// 듣기 상자: ▶ 듣기 · 🐢 천천히 · 📜 대본. script: hide | after | show
export function audioBox(lines: Line[], script: 'hide' | 'after' | 'show') {
  const list = h('div', { class: 'talk' });
  const bubbles = lines.map((l, i) => {
    const text = h('span', { class: 'talk-text' }, script === 'show' ? l.text : '· · ·');
    const b = h('div', { class: 'talk-line' + (i % 2 ? ' right' : '') },
      h('span', { class: 'talk-who' }, `${l.emoji} ${l.who}`.trim() || '🔊'),
      h('div', { class: 'talk-bubble' }, text, speakerButton(l, '🔊')));
    list.append(b);
    return { b, text, l };
  });
  let shown = script === 'show';
  const reveal = () => { shown = true; bubbles.forEach((x) => (x.text.textContent = x.l.text)); scriptBtn?.remove(); };
  const mark = (i: number) => bubbles.forEach((x, k) => x.b.classList.toggle('now', k === i));
  const scriptBtn = script === 'after' ? h('button', { class: 'btn small ghost', type: 'button', onclick: () => reveal() }, '📜 대본 보기') : null;
  const box = h('figure', { class: 'lab listen-box' },
    h('figcaption', { class: 'chart-title' }, script === 'show' ? '💬 대화' : '🎧 잘 들어 보세요'),
    h('div', { class: 'lab-controls' },
      h('button', { class: 'btn small primary', type: 'button', onclick: () => playLines(lines, 1, mark) }, '▶ 듣기'),
      h('button', { class: 'btn small ghost', type: 'button', onclick: () => playLines(lines, 0.75, mark) }, '🐢 천천히'),
      scriptBtn),
    list);
  return { el: box, reveal, get shown() { return shown; } };
}

// ───────────── 따라 말하기 ─────────────
const ASR_KEY = 'class-games:asr';
function asrSupported() { return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition); }
function asrOn() { try { return localStorage.getItem(ASR_KEY) === '1'; } catch { return false; } }
function setAsr(v: boolean) { try { localStorage.setItem(ASR_KEY, v ? '1' : '0'); } catch { /* 저장 못 함 */ } }
const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(Boolean);

function markStress(target: string, stress: string[]) {
  const set = new Set(stress.map((w) => w.toLowerCase()));
  return target.split(/(\s+)/).map((w) => (set.has(w.toLowerCase().replace(/[^a-z']/gi, '')) ? h('b', { class: 'stress' }, w) : w));
}

export function speakView(st: any, panel: HTMLElement, actions: HTMLElement, fb: HTMLElement, judge: any, isDone: () => boolean) {
  const target: Line = st.targetAudio;
  const sentence = h('p', { class: 'speak-target' }, ...markStress(st.target, st.stress ?? []), st.tone ? h('span', { class: 'tone', 'aria-label': st.tone === 'up' ? '끝을 올려요' : '끝을 내려요' }, st.tone === 'up' ? ' ↗' : ' ↘') : null);
  const status = h('p', { class: 'lab-status', 'aria-live': 'polite' }, '① 본보기를 듣고 ② 녹음한 뒤 ③ 내 목소리와 비교해 보세요.');
  let myUrl: string | null = null;
  let rec: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  const myBtn = h('button', { class: 'btn small ghost', type: 'button', disabled: true, onclick: () => { if (myUrl) { stopAudio(); player ??= new Audio(); player.src = myUrl; player.playbackRate = 1; player.play().catch(() => {}); } } }, '▶ 내 목소리') as HTMLButtonElement;
  const recBtn = h('button', { class: 'btn small', type: 'button' }, '🎙️ 녹음') as HTMLButtonElement;
  const canRecord = !!(navigator.mediaDevices?.getUserMedia && (window as any).MediaRecorder);

  async function startRec() {
    stopAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (myUrl) URL.revokeObjectURL(myUrl);
        myUrl = URL.createObjectURL(new Blob(chunks, { type: rec?.mimeType || 'audio/mp4' }));
        myBtn.disabled = false;
        recBtn.textContent = '🎙️ 다시 녹음';
        status.textContent = '내 목소리를 듣고 본보기와 비교해 보세요. 강세(굵은 글씨)와 끝 억양이 비슷한가요?';
        showCheck();
      };
      rec.start();
      recBtn.textContent = '⏹ 그만';
      status.textContent = '🔴 녹음 중이에요. 문장을 말한 뒤 [그만]을 눌러요.';
      setTimeout(() => rec?.state === 'recording' && rec.stop(), 8000);
    } catch {
      status.textContent = '마이크를 쓸 수 없어요. 본보기를 듣고 소리 내어 따라 말한 뒤 스스로 확인해요.';
      showCheck();
    }
  }
  recBtn.onclick = () => {
    if (isDone()) return;
    if (asrOn() && asrSupported()) return listenAsr();
    if (rec?.state === 'recording') rec.stop(); else startRec();
  };

  // 선택: 말 알아듣기 (브라우저 음성 인식, 목소리가 Google·Apple 서버로 보내져요)
  function listenAsr() {
    stopAudio();
    const R = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const r = new R();
    r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 3;
    status.textContent = '🔴 듣고 있어요. 문장을 말해 보세요.';
    r.onresult = (e: any) => {
      const alts = [...e.results[0]].map((a: any) => a.transcript as string);
      const want = norm(st.target);
      const best = alts.map((a) => { const got = new Set(norm(a)); return { a, hit: want.filter((w) => got.has(w)).length }; }).sort((x, y) => y.hit - x.hit)[0];
      const ratio = best.hit / want.length;
      status.replaceChildren('들린 말: ', h('b', null, `“${best.a}”`), ` — 낱말 ${best.hit}/${want.length}개가 같아요.`);
      if (ratio >= 0.8) judge(true, () => {}, () => {});
      else { status.append(' 본보기를 다시 듣고 한 번 더 말해 볼까요?'); showCheck(); }
    };
    r.onerror = () => { status.textContent = '말을 알아듣지 못했어요. 다시 해 보거나, 스스로 확인해 주세요.'; showCheck(); };
    r.start();
  }

  const check = h('div', { class: 'self-check', hidden: true },
    h('span', null, '스스로 확인: '),
    h('button', { class: 'btn small primary', type: 'button', onclick: () => judge(true, () => {}, () => {}) }, '😊 잘 말했어요'),
    h('button', { class: 'btn small ghost', type: 'button', onclick: () => { status.textContent = '좋아요! 본보기를 다시 듣고 한 번 더 녹음해 보세요.'; } }, '🙂 한 번 더 연습할래요'));
  function showCheck() { if (!isDone()) check.hidden = false; }

  const asrToggle = asrSupported()
    ? h('label', { class: 'asr-toggle' }, (() => { const c = h('input', { type: 'checkbox' }) as HTMLInputElement; c.checked = asrOn(); c.onchange = () => setAsr(c.checked); return c; })(),
      ' 🤖 말 알아듣기 켜기 ', h('small', null, '(켜면 목소리가 Google·Apple 서버로 보내져요. 선생님과 약속한 경우에만 켜요)'))
    : null;

  panel.append(
    h('div', { class: 'speak-box' },
      sentence,
      st.tip ? h('p', { class: 'q-sub' }, '💡 ', st.tip) : null,
      h('div', { class: 'lab-controls' },
        h('button', { class: 'btn small primary', type: 'button', onclick: () => playLines([target]) }, '▶ 본보기'),
        h('button', { class: 'btn small ghost', type: 'button', onclick: () => playLines([target], 0.75) }, '🐢 천천히'),
        canRecord || (asrOn() && asrSupported()) ? recBtn : null, canRecord ? myBtn : null),
      status, check, asrToggle),
  );
  if (!canRecord && !(asrOn() && asrSupported())) { status.textContent = '이 기기에서는 녹음을 할 수 없어요. 본보기를 듣고 소리 내어 따라 말한 뒤 스스로 확인해요.'; check.hidden = false; }
}

// ───────────── 낱말 카드로 문장 만들기 ─────────────
export function tokenize(s: string) {
  return s.match(/[A-Za-z0-9’'\-]+|[.,!?]/g) ?? [];
}
function joinTokens(ts: string[]) {
  return ts.reduce((acc, t) => (/^[.,!?]$/.test(t) || !acc ? acc + t : acc + ' ' + t), '');
}

export function sentenceView(st: any, panel: HTMLElement, actions: HTMLElement, judge: any, isDone: () => boolean) {
  const want = tokenize(st.answer);
  const pool = shuffle([...want, ...st.extra].map((t, i) => ({ t, i })));
  const placed: number[] = [];
  const line = h('div', { class: 'sent-line', 'aria-live': 'polite' });
  const tray = h('div', { class: 'tray sent-tray' });
  const confirm = h('button', { class: 'btn primary', disabled: true }, '확인') as HTMLButtonElement;
  if (st.answerAudio && !st.say) panel.append(h('div', { class: 'lab-controls' }, speakerButton(st.answerAudio, '🔊 문장 듣기')));
  function render() {
    line.replaceChildren(...(placed.length ? placed.map((i) => h('button', { class: 'sort-card word', type: 'button', disabled: isDone(), onclick: () => { placed.splice(placed.indexOf(i), 1); render(); } }, pool.find((p) => p.i === i)!.t)) : [h('span', { class: 'order-empty' }, '카드를 눌러 문장을 만들어요')]));
    tray.replaceChildren(...pool.map((p) => h('button', { class: 'sort-card word', type: 'button', disabled: placed.includes(p.i) || isDone(), onclick: () => { placed.push(p.i); render(); } }, p.t)));
    confirm.disabled = !placed.length || isDone();
  }
  confirm.onclick = () => {
    const got = placed.map((i) => pool.find((p) => p.i === i)!.t);
    const ok = got.join('|') === want.join('|');
    judge(ok, () => {
      const firstBad = got.findIndex((t, k) => t !== want[k]);
      const msg = got.length !== want.length ? '낱말 수를 확인해 보세요.' : firstBad === 0 && got[0].toLowerCase() === want[0].toLowerCase() ? '문장의 첫 글자는 대문자로 써요.' : /^[.,!?]$/.test(want[want.length - 1]) && got[got.length - 1] !== want[want.length - 1] ? '문장 끝의 문장 부호를 확인해 보세요.' : `${firstBad + 1}번째 낱말부터 다시 살펴보세요.`;
      line.after(h('p', { class: 'fb-detail' }, '💡 ', msg));
    }, () => { placed.length = 0; want.forEach((t) => placed.push(pool.find((p) => p.t === t && !placed.includes(p.i))!.i)); });
    render();
    if (isDone()) { line.classList.add('done'); confirm.remove(); }
  };
  render();
  panel.append(h('p', { class: 'q-sub' }, '낱말 카드를 차례로 눌러 문장을 완성해요. 놓은 카드를 누르면 다시 빠져요.'), line, tray);
  actions.append(confirm);
  return () => joinTokens(want);
}
export const sentenceText = (st: any) => joinTokens(tokenize(st.answer));

// ───────────── 철자 맞히기 ─────────────
export function spellView(st: any, visual: HTMLElement, panel: HTMLElement, actions: HTMLElement, judge: any, isDone: () => boolean) {
  const letters = shuffle([...st.word, ...st.extra].map((c: string, i: number) => ({ c, i })));
  const placed: number[] = [];
  const slots = h('div', { class: 'spell-slots' });
  const tray = h('div', { class: 'tray spell-tray' });
  const confirm = h('button', { class: 'btn primary', disabled: true }, '확인') as HTMLButtonElement;
  if (st.emoji) visual.append(h('div', { class: 'big-emoji', 'aria-hidden': 'true' }, st.emoji));
  function render() {
    slots.replaceChildren(...[...st.word].map((_, k) => {
      const i = placed[k];
      return i === undefined ? h('span', { class: 'spell-slot' }, ' ') : h('button', { class: 'spell-slot on', type: 'button', disabled: isDone(), onclick: () => { placed.splice(k, 1); render(); } }, letters.find((l) => l.i === i)!.c);
    }));
    tray.replaceChildren(...letters.map((l) => h('button', { class: 'letter', type: 'button', disabled: placed.includes(l.i) || placed.length >= st.word.length || isDone(), onclick: () => { placed.push(l.i); render(); } }, l.c)));
    confirm.disabled = placed.length !== st.word.length || isDone();
  }
  confirm.onclick = () => {
    const got = placed.map((i) => letters.find((l) => l.i === i)!.c).join('');
    judge(got === st.word, () => { placed.length = 0; }, () => { placed.length = 0; [...st.word].forEach((c) => placed.push(letters.find((l) => l.c === c && !placed.includes(l.i))!.i)); });
    render();
    if (isDone()) confirm.remove();
  };
  render();
  panel.append(h('div', { class: 'lab-controls' }, speakerButton(st.wordAudio, '🔊 낱말 듣기')), slots, tray);
  actions.append(confirm);
}

// ───────────── 글쓰기 카드 ─────────────
export function writeView(st: any, unitId: string, panel: HTMLElement, actions: HTMLElement, fb: HTMLElement, judge: any, isDone: () => boolean) {
  const inputs: Record<string, HTMLInputElement> = {};
  const model = h('div', { class: 'write-model' }, h('b', null, '📄 예시문'), h('p', { lang: 'en' }, st.model));
  const form = h('div', { class: 'write-frame', lang: 'en' });
  // {id} 자리에 입력 칸 넣기
  for (const part of st.frame.split(/(\{[a-z0-9_]+\})/i)) {
    const m = part.match(/^\{([a-z0-9_]+)\}$/i);
    if (!m) { form.append(part); continue; }
    const f = st.fields.find((x: any) => x.id === m[1]);
    const list = `wl-${st.key}-${f.id}`;
    const inp = h('input', { class: 'write-in', type: 'text', list, placeholder: f.label, 'aria-label': f.label, autocapitalize: 'off', autocomplete: 'off', spellcheck: false, maxlength: 30 }) as HTMLInputElement;
    inputs[f.id] = inp;
    form.append(inp, h('datalist', { id: list }, ...f.bank.map((b: string) => h('option', { value: b }))));
  }
  const bank = h('div', { class: 'write-bank' }, ...st.fields.filter((f: any) => f.bank.length).map((f: any) =>
    h('div', null, h('b', null, `${f.label}: `), ...f.bank.map((b: string) => h('button', { class: 'word-chip', type: 'button', onclick: () => { inputs[f.id].value = b; } }, b)))));
  const save = h('button', { class: 'btn primary' }, '✅ 다 썼어요') as HTMLButtonElement;
  save.onclick = () => {
    const empty = st.fields.find((f: any) => !inputs[f.id].value.trim());
    if (empty) { inputs[empty.id].focus(); fb.replaceChildren(h('div', { class: 'fb fb-retry' }, `✏️ 「${empty.label}」 칸을 채워 주세요.`)); return; }
    const text = st.frame.replace(/\{([a-z0-9_]+)\}/gi, (_: string, id: string) => inputs[id].value.trim());
    store.addProduct({ unit: unitId, customer: st.title, name: text.split(/(?<=[.!?])\s/)[0], slogan: text, when: '', features: [], emoji: '✍️' });
    Object.values(inputs).forEach((i) => (i.disabled = true));
    judge(true, () => {}, () => {});
    fb.append(h('div', { class: 'write-done', lang: 'en' }, h('b', null, '✍️ 내가 쓴 글: '), text, h('small', null, ' — 「나의 탐험 리포트」에 저장했어요.')));
    save.remove();
  };
  panel.append(model, h('p', { class: 'q-sub' }, '빈칸을 눌러 쓰거나, 아래 낱말을 눌러 넣어요. 진짜 집 주소, 전화번호는 쓰지 않아요.'), form, bank);
  actions.append(save);
  void isDone;
}
