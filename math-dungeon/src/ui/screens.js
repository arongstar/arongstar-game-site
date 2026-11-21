// All screens. Each render function replaces the content of app.root.
// Visible text is Korean; the game's name, mascot and icons come from data/theme.json.
import { h, fracView, mixedView, valueView, tokensView, numberCard, slotView } from './cards.js';
import { fractionInput, smallFraction, keypad } from './fractionInput.js';
import { createRun } from '../engine/run.js';
import { expressionOf, opsFromCards, isValidExpression, fillNumbers } from '../engine/quests.js';
import { cleanNick, NICK_MAX } from '../engine/log.js';

let timerId = 0;
const stopTimer = () => { clearInterval(timerId); timerId = 0; };

export function go(app) {
  stopTimer();
  const p = app.run?.state.phase;
  if (!app.run || p === 'done') return renderStart(app);
  if (p === 'choose') return renderChoose(app);
  if (p === 'play') return renderPlay(app);
  if (p === 'result') return renderResult(app);
  if (p === 'joker') return renderJoker(app);
  if (p === 'boss') return renderBoss(app);
  if (p === 'summary') return renderSummary(app);
  return renderStart(app);
}

function screen(app, cls, ...children) {
  app.root.replaceChildren(h('main', { class: `screen ${cls}` }, ...children));
  window.scrollTo(0, 0);
}

const T = (app) => app.theme;
const icon = (app, k) => T(app).icons?.[k] ?? '';
const word = (app, k) => T(app).words?.[k] ?? k;

function runBar(app) {
  const s = app.run.state;
  return h('header', { class: 'run-bar' },
    h('span', { class: 'rb-title' }, `${icon(app, 'dungeon')} ${app.lesson.lesson}차시`),
    h('span', { class: 'rb-round' }, s.phase === 'boss' || s.phase === 'summary' ? `${icon(app, 'boss')} ${word(app, 'boss')}` : `${word(app, 'quest')} ${Math.min(s.round + 1, 3)} / 3`),
    h('span', { class: 'rb-score', 'aria-label': `점수 ${s.score}` }, `${icon(app, 'score')} ${s.score}`),
    h('span', { class: 'rb-jokers', 'aria-label': `가진 ${word(app, 'joker')} ${s.jokers.length}장` },
      ...(s.jokers.length ? s.jokers.map((j) => h('span', { class: 'joker-chip', title: j.description }, `${j.emoji ?? icon(app, 'joker')} ${j.name}`)) : [h('span', { class: 'muted' }, `${icon(app, 'joker')} 0 / 3`)])));
}

function goalView(app, q) {
  if (q.type === 'target') return h('span', { class: 'goal' }, `${icon(app, 'target')} 몫이 `, valueView(q.target, { mixed: app.lesson.answerForm === 'mixed' }), ' 이 되는 식을 만들어요');
  return h('span', { class: 'goal' }, `${icon(app, q.type)} ${word(app, 'goals')[q.type] ?? q.type}을 만들어요`);
}

// ───────── 1. start ─────────
export function renderStart(app) {
  app.run = null;
  const log = app.log;
  let nick = log.getNick();
  let chosen = app.lesson?.id ?? null;
  const nickIn = h('input', { class: 'nick-input', type: 'text', maxlength: String(NICK_MAX), value: nick, placeholder: `닉네임 (최대 ${NICK_MAX}자)`, 'aria-label': '닉네임', autocomplete: 'off' });
  const enter = h('button', { class: 'btn primary big', type: 'button', onclick: start }, `${icon(app, 'dungeon')} ${word(app, 'enter')}`);
  const list = h('div', { class: 'lesson-list' });
  const records = h('section', { class: 'my-records' });
  function draw() {
    nick = cleanNick(nickIn.value);
    list.replaceChildren(...app.lessons.map((l) => {
      const best = nick ? log.best(nick, l.id) : null;
      return h('button', { class: 'lesson-card' + (chosen === l.id ? ' chosen' : ''), type: 'button', 'aria-pressed': chosen === l.id, onclick: () => { chosen = l.id; draw(); } },
        h('span', { class: 'lc-no' }, `${l.lesson}차시`),
        h('b', { class: 'lc-title' }, l.title),
        h('span', { class: 'lc-sum' }, l.summary ?? ''),
        h('span', { class: 'lc-std' }, ...(l.standards ?? []).map((s) => h('span', { class: 'std-chip', title: s.text }, `[${s.code}]`))),
        best != null ? h('span', { class: 'lc-best' }, `${icon(app, 'score')} 내 최고 ${best}점`) : null);
    }));
    enter.disabled = !nick || !chosen;
    const recent = nick ? log.recent(nick, 5) : [];
    records.replaceChildren(h('h2', null, '📜 내 기록'), recent.length
      ? h('ol', { class: 'recent' }, ...recent.map((r) => h('li', null, `${lessonLabel(app, r.lessonId)} · ${r.score}점 ${r.boss ? icon(app, 'boss') + ' 격파' : ''}`)))
      : h('p', { class: 'muted' }, nick ? '아직 기록이 없어요.' : '닉네임을 쓰면 내 기록이 보여요.'));
  }
  nickIn.addEventListener('input', draw);
  function start() {
    const n = log.setNick(nickIn.value);
    if (!n || !chosen) return;
    app.lesson = app.lessons.find((l) => l.id === chosen);
    app.run = createRun({ lesson: app.lesson, nick: n, onSubmit: (row) => log.addSubmission(row) });
    go(app);
  }
  screen(app, 'start',
    h('section', { class: 'hero' },
      h('div', { class: 'mascot', 'aria-hidden': 'true' }, T(app).mascot?.emoji ?? ''),
      h('h1', null, T(app).gameName),
      h('p', { class: 'tagline' }, T(app).tagline ?? ''),
      T(app).mascot?.name ? h('p', { class: 'muted' }, `${T(app).mascot.name}: 오늘 배운 차시를 고르고 ${word(app, 'enter')}!`) : null),
    h('section', { class: 'start-form' },
      h('label', { class: 'nick-row' }, h('span', null, '닉네임'), nickIn),
      h('h2', null, '오늘의 차시'), list,
      h('div', { class: 'start-actions' }, enter, h('button', { class: 'btn ghost', type: 'button', onclick: () => settingsDialog(app) }, '⚙️ 설정'))),
    records);
  draw();
}

function lessonLabel(app, id) {
  const l = app.lessons.find((x) => x.id === id);
  return l ? `${l.lesson}차시` : id;
}

export function settingsDialog(app) {
  const s = app.log.getSettings();
  const timer = h('input', { type: 'checkbox', checked: s.timer });
  const secs = h('select', { 'aria-label': '시간 제한' }, ...[120, 180, 300].map((v) => h('option', { value: String(v), selected: s.timerSeconds === v }, `${v / 60}분`)));
  const dlg = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': '설정' },
    h('div', { class: 'modal-card' },
      h('h2', null, '⚙️ 설정'),
      h('label', { class: 'set-row' }, timer, h('span', null, ' 의뢰마다 시간 제한 켜기 '), secs),
      h('p', { class: 'muted' }, '기본은 꺼져 있어요. 시간에 쫓기지 않고 차근차근 생각해도 괜찮아요.'),
      h('button', { class: 'btn primary', type: 'button', onclick: () => { app.log.setSettings({ timer: timer.checked, timerSeconds: Number(secs.value) }); dlg.remove(); } }, '저장')));
  document.body.append(dlg);
}

// ───────── 2. choose a quest ─────────
function renderChoose(app) {
  const s = app.run.state;
  screen(app, 'choose', runBar(app),
    h('h1', null, `${word(app, 'quest')}를 하나 골라요`),
    h('div', { class: 'quest-cards' }, ...s.options.map((q, i) => h('button', { class: `quest-card lv-${q.level}`, type: 'button', onclick: () => { app.run.choose(i); go(app); } },
      h('span', { class: 'qc-level' }, `${icon(app, q.level)} ${word(app, 'levels')[q.level] ?? q.level}`),
      goalView(app, q),
      h('span', { class: 'qc-meta' }, `수 카드 6장 중 ${q.pick}장 사용`)))));
}

// ───────── 3. play ─────────
const SLOT_LABEL = { a: '나누어지는 수', b: '나누는 수', w: '자연수 부분', c: '나누는 수' };

function constraintMessage(lesson, o) {
  const c = lesson.constraints ?? {};
  const x = lesson.expression;
  if (x === 'nat_div_nat') {
    if (c.order === 'less' && !(o.a < o.b)) return '이 차시에서는 나누어지는 수가 나누는 수보다 작아야 해요.';
    if (c.order === 'greater' && !(o.a > o.b)) return '이 차시에서는 나누어지는 수가 나누는 수보다 커야 해요.';
    if (c.nonInteger && o.a % o.b === 0) return '나누어떨어지지 않는 식을 만들어 보세요.';
  } else {
    if (x === 'mixed_div_nat' && !(o.a < o.b)) return '대분수의 분수 부분은 분자가 분모보다 작아야 해요.';
    if (c.properFractionOnly && !(o.a < o.b)) return '분자가 분모보다 작은 진분수로 만들어요.';
    if (o.c < (c.divisorMin ?? 2)) return '나누는 수는 2 이상이어야 해요.';
  }
  return '이 식은 만들 수 없어요.';
}

function renderPlay(app) {
  const run = app.run;
  const lesson = app.lesson;
  const cur = run.state.current;
  const q = cur.quest;
  const E = expressionOf(q.expression);
  const slots = E.slots.map(() => null); // hand index per slot
  let active = 0;
  let estimate = null;
  let target = null; // keypad target
  const notice = h('div', { class: 'notice', 'aria-live': 'polite' });
  const feedback = h('div', { class: 'feedback', 'aria-live': 'polite' });

  const handRow = h('div', { class: 'hand', role: 'group', 'aria-label': '내 수 카드' });
  const exprRow = h('div', { class: 'assembly', role: 'group', 'aria-label': '식 만들기' });
  const convRow = h('div', { class: 'conversion' });
  const answer = fractionInput({ label: '몫' });
  const conv = lesson.conversion ? smallFraction() : null;
  target = answer;
  const play = h('div', { class: 'play-grid' });
  play.addEventListener('boxfocus', (e) => {
    target = e.detail.group;
    for (const g of [answer, conv]) if (g && g !== target) g.blur();
  });

  const ops = () => slots.every((i) => i !== null) ? opsFromCards(q.expression, slots.map((i) => q.hand[i])) : null;

  function place(handIdx) {
    let k = slots[active] === null ? active : slots.findIndex((x) => x === null);
    if (k < 0) k = active;
    slots[k] = handIdx;
    const next = slots.findIndex((x) => x === null);
    active = next < 0 ? k : next;
    draw();
  }
  function tapSlot(k) {
    if (slots[k] !== null) slots[k] = null;
    active = k;
    draw();
  }
  const sv = (k) => slotView(slots[k] === null ? null : q.hand[slots[k]], { active: active === k, label: SLOT_LABEL[E.slots[k]] ?? '', onclick: () => tapSlot(k) });

  function draw() {
    handRow.replaceChildren(...q.hand.map((v, i) => numberCard(v, { used: slots.includes(i), onclick: () => place(i) })));
    let expr;
    if (q.expression === 'nat_div_nat') expr = [sv(0), h('span', { class: 'op' }, '÷'), sv(1)];
    else if (q.expression === 'frac_div_nat') expr = [h('span', { class: 'frac slot-frac' }, h('span', { class: 'frac-n' }, sv(0)), h('span', { class: 'frac-d' }, sv(1))), h('span', { class: 'op' }, '÷'), sv(2)];
    else expr = [sv(0), h('span', { class: 'frac slot-frac' }, h('span', { class: 'frac-n' }, sv(1)), h('span', { class: 'frac-d' }, sv(2))), h('span', { class: 'op' }, '÷'), sv(3)];
    const o = ops();
    const status = !o ? h('span', { class: 'muted' }, '카드를 눌러 빈칸을 채워요. 채운 칸을 누르면 카드가 돌아가요.')
      : isValidExpression(q.expression, o, q.constraints) ? h('span', { class: 'ok-text' }, `${icon(app, 'correct')} 식 완성! 이제 몫을 구해요.`)
        : h('span', { class: 'warn-text' }, `⚠️ ${constraintMessage(lesson, o)}`);
    exprRow.replaceChildren(h('div', { class: 'expr' }, ...expr), h('div', { class: 'expr-status' }, status));
    if (conv) {
      const fr = o ? fracView(o.a, o.b) : fracView('□', '□');
      convRow.replaceChildren(h('span', { class: 'conv-label' }, '곱셈식으로 바꾸기: '), fr, h('span', { class: 'op' }, '÷'), String(o ? o.c : '□'), h('span', { class: 'op' }, '='), o ? fracView(o.a, o.b) : fracView('□', '□'), h('span', { class: 'op' }, '×'), conv.el);
    }
  }

  const estRow = lesson.estimate ? h('div', { class: 'estimate' },
    h('span', null, `🔭 ${lesson.estimate.question} `),
    ...[['bigger', '더 커요'], ['same', '같아요'], ['smaller', '더 작아요']].map(([k, label]) => h('button', { class: 'btn small est', type: 'button', 'data-k': k, 'aria-pressed': 'false', onclick: (e) => { estimate = estimate === k ? null : k; estRow.querySelectorAll('.est').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === estimate))); } }, label)),
    h('small', { class: 'muted' }, ' (선택: 맞히면 개념 조커가 열려요)')) : null;

  const hintBtn = h('button', { class: 'btn ghost', type: 'button', onclick: () => {
    if (cur.hintUsed) return;
    if (!confirm('힌트를 보면 이 의뢰의 계산 점수가 절반이 돼요. 볼까요?')) return;
    const text = run.useHint();
    feedback.replaceChildren(h('div', { class: 'fb hint' }, `${icon(app, 'hint')} ${text}`));
    hintBtn.disabled = true;
  } }, `${icon(app, 'hint')} 힌트`);
  const submitBtn = h('button', { class: 'btn primary big', type: 'button', onclick: submit }, cur.attempt ? `${icon(app, 'retry')} 다시 제출` : '제출');

  function submit() {
    const o = ops();
    if (!o) return say('식의 빈칸을 모두 채워요.');
    if (!isValidExpression(q.expression, o, q.constraints)) return say(constraintMessage(lesson, o));
    const a = answer.read();
    if (a.n !== null && a.d === null) return say('분모도 써 주세요.');
    if (a.n === null && a.whole === null) return say('몫을 써 주세요.');
    if (a.d === 0) return say('분모에는 0을 쓸 수 없어요.');
    const c = conv?.read();
    if (conv && (c.n === null || !c.d)) return say('곱셈식의 빈칸(분자와 분모)을 채워 주세요.');
    const res = run.submit({ ops: o, answer: { whole: a.whole ?? 0, n: a.n ?? 0, d: a.d ?? 1 }, conversion: c, estimate });
    if (res.invalid) return say(constraintMessage(lesson, o));
    if (res.done) return go(app);
    // first wrong try: show what went wrong and allow one retry
    feedback.replaceChildren(h('div', { class: 'fb wrong' },
      h('p', null, res.flags.expressionOptimal ? `${icon(app, 'correct')} 식: 목표에 맞아요.` : `${icon(app, 'wrong')} 식: ${res.exprFeedback}`),
      res.convFeedback !== undefined && lesson.conversion ? h('p', null, res.convFeedback ? `${icon(app, 'wrong')} 곱셈식: ${res.convFeedback}` : `${icon(app, 'correct')} 곱셈식: 맞아요.`) : null,
      h('p', null, res.answerOk ? `${icon(app, 'correct')} 몫: 맞아요.` : `${icon(app, 'wrong')} 몫: ${res.answerFeedback}`),
      h('p', { class: 'muted' }, `${icon(app, 'retry')} 한 번 더 도전할 수 있어요. 카드도 바꿀 수 있어요. (두 번째 제출은 점수 절반, 이 도움말로는 더 깎이지 않아요)`)));
    submitBtn.textContent = `${icon(app, 'retry')} 다시 제출`;
    hintBtn.disabled = true;
    say('');
  }
  function say(t) { notice.textContent = t; }

  const timerEl = h('span', { class: 'timer', 'aria-live': 'off' });
  const settings = app.log.getSettings();
  if (settings.timer) {
    const end = cur.started + settings.timerSeconds * 1000;
    const tickT = () => {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      timerEl.textContent = `⏱️ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
      if (left <= 0) { stopTimer(); run.timeUp(); go(app); }
    };
    tickT();
    timerId = setInterval(tickT, 500);
  }

  play.append(
    h('section', { class: 'play-left' },
      h('div', { class: 'goal-row' }, goalView(app, q), timerEl),
      handRow, exprRow, conv ? convRow : null, estRow),
    h('section', { class: 'play-right' },
      h('div', { class: 'answer-row' }, answer.el),
      keypad(() => target),
      notice, feedback,
      h('div', { class: 'play-actions' }, hintBtn, submitBtn)));
  if (cur.hintUsed) hintBtn.disabled = true;
  screen(app, 'play', runBar(app), play);
  draw();
}

// ───────── result of one quest ─────────
function exprView(expression, o) {
  if (!o) return h('span', null, '-');
  if (expression === 'nat_div_nat') return h('span', { class: 'expr-inline' }, `${o.a} ÷ ${o.b}`);
  if (expression === 'frac_div_nat') return h('span', { class: 'expr-inline' }, fracView(o.a, o.b), ` ÷ ${o.c}`);
  return h('span', { class: 'expr-inline' }, mixedView(o.w, o.a, o.b), ` ÷ ${o.c}`);
}

function renderResult(app) {
  const rec = app.run.state.current.lastResult;
  const f = rec.flags;
  const ok = f.expressionOptimal && f.answerCorrect;
  const mixed = app.lesson.answerForm === 'mixed';
  const rows = [
    ['식 고르기', f.expressionOptimal ? `${icon(app, 'correct')} ${rec.score.choice}점` : `${icon(app, 'wrong')} 0점`],
    ['몫 계산', f.answerCorrect ? `${icon(app, 'correct')} ${rec.score.calc}점${f.hintUsed ? ' (힌트 사용: 절반)' : ''}` : `${icon(app, 'wrong')} 0점`],
    f.retry ? ['재도전', '× ½'] : null,
    ...rec.score.contributions.map((c) => {
      const j = app.lesson.concepts.find((x) => x.id === c.id);
      return [`${j?.emoji ?? icon(app, 'joker')} ${j?.name ?? c.id}`, `+${Math.round(c.points)}점`];
    }),
  ].filter(Boolean);
  screen(app, 'result', runBar(app),
    h('h1', null, rec.timeUp ? '⏱️ 시간이 끝났어요' : ok ? `${icon(app, 'correct')} ${word(app, 'quest')} 성공!` : `${icon(app, 'retry')} 다음에는 꼭!`),
    h('div', { class: 'result-grid' },
      h('section', { class: 'panel' },
        h('h2', null, '내 풀이'),
        h('p', null, '만든 식: ', exprView(rec.quest.expression, rec.ops)),
        rec.correctAnswer ? h('p', null, '바른 몫: ', valueView(rec.correctAnswer, { mixed })) : null,
        f.answerCorrect && !f.answerReduced ? h('p', { class: 'muted' }, '✂️ 약분하면 더 간단히 나타낼 수 있어요.') : null,
        rec.best ? h('p', null, `${f.expressionOptimal ? '목표에 맞는 식' : '이렇게 만들 수 있었어요'}: `, exprView(rec.quest.expression, rec.best.ops), ' = ', valueView(rec.best.q, { mixed })) : null,
        rec.errorTag && rec.errorTag !== 'timeout' ? h('p', { class: 'fb-tip' }, `${icon(app, 'hint')} ${fillNumbers(app.lesson.misconceptions.find((m) => m.tag === rec.errorTag)?.hint ?? app.lesson.hints?.notMixed ?? '', rec.ops)}`) : null),
      h('section', { class: 'panel' },
        h('h2', null, `${icon(app, 'score')} 점수`),
        h('table', { class: 'score-table' }, ...rows.map(([k, v]) => h('tr', null, h('th', null, k), h('td', null, v))),
          h('tr', { class: 'total' }, h('th', null, '이번 의뢰'), h('td', null, `${rec.score.total}점`))))),
    h('div', { class: 'center' }, h('button', { class: 'btn primary big', type: 'button', onclick: () => { app.run.next(); go(app); } }, '다음 ▶')));
}

// ───────── 4. jokers ─────────
function renderJoker(app) {
  const s = app.run.state;
  const full = s.jokers.length >= 3;
  let picked = null;
  const area = h('div', { class: 'replace-area' });
  const card = (j, onclick, cls = '') => h('button', { class: `joker-card ${cls}`, type: 'button', onclick },
    h('span', { class: 'jk-emoji', 'aria-hidden': 'true' }, j.emoji ?? icon(app, 'joker')), h('b', null, j.name), h('small', null, j.description));
  function choose(j) {
    if (!full) { app.run.takeJoker(j.id); return go(app); }
    picked = j;
    area.replaceChildren(h('h2', null, `「${j.name}」 대신 내려놓을 조커를 골라요 (최대 3장)`),
      h('div', { class: 'joker-cards' }, ...s.jokers.map((x) => card(x, () => { app.run.takeJoker(picked.id, x.id); go(app); }, 'held'))));
  }
  screen(app, 'joker', runBar(app),
    h('h1', null, `${icon(app, 'joker')} ${word(app, 'joker')}가 열렸어요!`),
    h('p', null, '하나를 골라 가지면 다음 의뢰부터 점수에 힘을 보태요.'),
    h('div', { class: 'joker-cards' }, ...s.offer.map((j) => card(j, () => choose(j)))),
    area,
    h('div', { class: 'center' }, h('button', { class: 'btn ghost', type: 'button', onclick: () => { app.run.skipJoker(); go(app); } }, '건너뛰기')));
}

// ───────── 5. boss ─────────
function renderBoss(app) {
  const b = app.run.state.boss;
  let line = null, reason = null;
  const reasons = h('div', { class: 'reasons' });
  const done = h('button', { class: 'btn primary big', type: 'button', disabled: true, onclick: finish }, `${word(app, 'bossVerb')} 완료`);
  const lines = h('ol', { class: 'boss-lines' }, ...b.lines.map((L, i) => h('li', null, h('button', { class: 'line-btn', type: 'button', 'data-i': String(i), 'aria-pressed': 'false', onclick: () => pickLine(i) }, tokensView(L)))));
  function pickLine(i) {
    line = i;
    lines.querySelectorAll('.line-btn').forEach((el) => el.setAttribute('aria-pressed', String(Number(el.dataset.i) === i)));
    reasons.replaceChildren(h('h2', null, `${i + 1}번째 줄은 왜 틀렸을까요?`), ...b.reasons.map((r, k) => h('button', { class: 'reason-btn', type: 'button', 'aria-pressed': String(reason === k), onclick: () => { reason = k; pickLine(line); } }, r)));
    done.disabled = reason === null;
  }
  function finish() {
    const r = app.run.answerBoss(line, reason);
    lines.querySelectorAll('.line-btn').forEach((el, i) => {
      el.disabled = true;
      if (i === b.wrongLine) el.classList.add('is-wrong');
      el.prepend(h('span', { class: 'mark' }, i === b.wrongLine ? `${icon(app, 'wrong')} 틀린 줄 ` : `${icon(app, 'correct')} `));
    });
    reasons.querySelectorAll('.reason-btn').forEach((el, k) => { el.disabled = true; if (k === b.answerReason) el.classList.add('is-answer'); });
    done.replaceWith(h('div', { class: `fb ${r.defeated ? 'right' : 'wrong'}` },
      h('p', null, r.defeated ? `${icon(app, 'correct')} ${word(app, 'boss')} 격파! 틀린 줄과 이유를 모두 찾았어요.` : `${icon(app, 'wrong')} 아쉬워요. ${r.lineCorrect ? '틀린 줄은 찾았지만 이유가 달라요.' : `틀린 줄은 ${b.wrongLine + 1}번째 줄이에요.`}`),
      h('p', null, `${icon(app, 'hint')} ${b.hint}`),
      h('p', null, '바른 답: ', typeof b.correct === 'string' ? b.correct : tokensView([b.correct])),
      h('button', { class: 'btn primary big', type: 'button', onclick: () => go(app) }, '정리하러 가기 ▶')));
  }
  screen(app, 'boss', runBar(app),
    h('h1', null, `${icon(app, 'boss')} ${word(app, 'boss')}: 풀이 ${word(app, 'bossVerb')}`),
    h('p', null, '친구의 풀이 4줄 중에 틀린 줄이 하나 있어요. 틀린 줄을 누르고, 이유를 골라요.'),
    h('div', { class: 'boss-problem' }, '문제: ', tokensView(b.problem)),
    lines, reasons, h('div', { class: 'center' }, done));
}

// ───────── 6. summary ─────────
function renderSummary(app) {
  const s = app.run.summary();
  const lesson = app.lesson;
  const opts = [...lesson.concepts.map((c) => `${c.emoji ?? ''} ${c.name}`.trim()), '아직 잘 모르겠어요'];
  const after = h('section', { class: 'after' });
  const reflect = h('section', { class: 'panel reflect' },
    h('h2', null, '🪞 오늘 가장 도움이 된 개념 카드는?'),
    h('div', { class: 'reflect-opts' }, ...opts.map((o) => h('button', { class: 'btn', type: 'button', onclick: () => {
      const rec = app.run.reflect(o);
      app.log.addRun(rec);
      const best = app.log.best(rec.nick, lesson.id);
      reflect.replaceChildren(h('p', null, `고마워요! 「${o}」를 골랐어요.`));
      after.replaceChildren(
        h('p', { class: 'big-text' }, best === rec.score ? `🎉 ${lesson.lesson}차시 내 최고 기록 갱신! ${rec.score}점` : `${lesson.lesson}차시 내 최고 기록: ${best}점`),
        h('h2', null, '📜 최근 5판'),
        h('ol', { class: 'recent' }, ...app.log.recent(rec.nick, 5).map((r) => h('li', null, `${lessonLabel(app, r.lessonId)} · ${r.score}점 ${r.boss ? icon(app, 'boss') + ' 격파' : ''}`))),
        h('div', { class: 'start-actions' },
          h('button', { class: 'btn primary big', type: 'button', onclick: () => { app.run = createRun({ lesson, nick: rec.nick, onSubmit: (row) => app.log.addSubmission(row) }); go(app); } }, `${icon(app, 'retry')} 같은 차시 다시`),
          h('button', { class: 'btn', type: 'button', onclick: () => renderStart(app) }, '🏠 처음으로')));
    } }, o))));
  screen(app, 'summary', runBar(app),
    h('h1', null, `${icon(app, 'score')} 오늘의 던전 정리`),
    h('div', { class: 'result-grid' },
      h('section', { class: 'panel' },
        h('p', { class: 'big-text' }, `${s.score}점`),
        h('p', null, s.defeated ? `${icon(app, 'boss')} ${word(app, 'boss')} 격파!` : `${icon(app, 'boss')} ${word(app, 'boss')}는 다음에 다시 도전해요.`),
        h('p', null, '가장 쓸모 있었던 개념 조커: ', s.bestJoker ? h('b', null, `${s.bestJoker.joker?.emoji ?? ''} ${s.bestJoker.joker?.name ?? ''} (+${Math.round(s.bestJoker.points)}점)`) : '없음')),
      h('section', { class: 'panel' },
        h('h2', null, '🔎 자주 틀린 유형'),
        s.tags.length ? h('ul', null, ...s.tags.map((t) => h('li', null, `${tagLabel(app, t.tag)} — ${t.count}번`))) : h('p', null, `${icon(app, 'correct')} 틀린 유형이 없어요!`))),
    reflect, after);
}

function tagLabel(app, tag) {
  if (tag === 'not_mixed') return '대분수로 나타내지 않았어요';
  if (tag === 'timeout') return '시간이 끝났어요';
  for (const l of app.lessons) {
    const m = (l.misconceptions ?? []).find((x) => x.tag === tag);
    if (m) return m.pattern;
  }
  return tag;
}

// ───────── 7. teacher ─────────
export function renderTeacher(app) {
  const st = app.log.stats();
  const subs = app.log.submissions().slice(-30).reverse();
  const pct = (x) => `${Math.round(x * 100)}%`;
  const download = () => {
    const blob = new Blob([app.log.toCSV()], { type: 'text/csv;charset=utf-8' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `math-dungeon-${new Date().toISOString().slice(0, 10)}.csv` });
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };
  const reset = () => {
    if (!confirm('이 기기의 모든 학생 기록을 지울까요? 되돌릴 수 없어요.')) return;
    if (!confirm('정말 지울까요? 먼저 CSV로 내보내 두는 것을 권해요.')) return;
    app.log.clear();
    renderTeacher(app);
  };
  screen(app, 'teacher',
    h('h1', null, `${icon(app, 'teacher')} 교사 화면 — ${T(app).gameName}`),
    h('p', { class: 'muted' }, `이 기기에 저장된 기록이에요. 제출 ${st.submissions}개, 완료한 판 ${st.runs}개. 학생 정보는 닉네임만 있어요.`),
    h('div', { class: 'start-actions' }, h('button', { class: 'btn primary', type: 'button', onclick: download }, '⬇️ CSV 내보내기'), h('button', { class: 'btn danger', type: 'button', onclick: reset }, '🗑️ 기록 초기화')),
    h('h2', null, '차시별 정답률'),
    h('table', { class: 'data-table' },
      h('tr', null, ...['차시', '제출 수', '몫 정답률', '최적 식 비율', '평균 소요 시간'].map((t) => h('th', null, t))),
      ...app.lessons.map((l) => {
        const L = st.byLesson[l.id];
        return h('tr', null, h('td', null, `${l.lesson}차시 ${l.title}`), h('td', null, L?.total ?? 0), h('td', null, L ? pct(L.correctRate) : '-'), h('td', null, L ? pct(L.optimalRate) : '-'), h('td', null, L ? `${L.avgSeconds}초` : '-'));
      })),
    h('h2', null, '오개념 태그별 빈도'),
    Object.keys(st.byTag).length ? h('table', { class: 'data-table' },
      h('tr', null, h('th', null, '태그'), h('th', null, '설명'), h('th', null, '횟수'), h('th', null, '차시')),
      ...Object.entries(st.byTag).sort((a, b) => b[1].count - a[1].count).map(([tag, v]) => h('tr', null, h('td', null, tag), h('td', null, tagLabel(app, tag)), h('td', null, v.count), h('td', null, Object.entries(v.lessons).map(([id, n]) => `${lessonLabel(app, id)} ${n}`).join(', ')))))
      : h('p', { class: 'muted' }, '아직 오답 기록이 없어요.'),
    h('h2', null, '성찰 응답'),
    Object.keys(st.reflections).length ? h('ul', null, ...Object.entries(st.reflections).map(([id, r]) => h('li', null, `${lessonLabel(app, id)}: ${Object.entries(r).map(([k, n]) => `${k} ${n}`).join(' · ')}`))) : h('p', { class: 'muted' }, '아직 없어요.'),
    h('h2', null, '최근 기록 (30개)'),
    h('div', { class: 'table-wrap' }, h('table', { class: 'data-table small' },
      h('tr', null, ...['시각', '닉네임', '차시', '목표', '손패', '식', '답', '식', '답', '오개념', '재도전'].map((t) => h('th', null, t))),
      ...subs.map((s) => h('tr', null, h('td', null, s.t.slice(5, 16).replace('T', ' ')), h('td', null, s.nick), h('td', null, lessonLabel(app, s.lessonId)), h('td', null, s.questType), h('td', null, s.hand), h('td', null, s.expr), h('td', null, s.answer),
        h('td', null, s.expressionOptimal ? '○' : '×'), h('td', null, s.answerCorrect ? '○' : '×'), h('td', null, s.errorTag), h('td', null, s.retry ? '○' : ''))))),
    h('p', null, h('a', { class: 'btn ghost', href: location.pathname }, '← 학생 화면')));
}

