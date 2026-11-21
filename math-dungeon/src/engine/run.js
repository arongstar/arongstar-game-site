// One run: 3 rounds of (pick 1 of 3 quests → play → maybe take a joker), then the boss, then the summary.
// Pure state machine: no DOM. The UI calls these methods and re-renders from `state`.
import { generateQuest, judgeExpression, judgeAnswer, judgeConversion, estimateTruth, generateBoss, optimalSolutions, mulberry32, shuffled } from './quests.js';
import { scoreQuest, unlockedConcepts, MAX_JOKERS } from './scoring.js';

export const ROUNDS = 3;

export function createRun({ lesson, seed = Date.now(), nick = '', now = () => Date.now(), onSubmit = () => {} }) {
  const rng = mulberry32(seed);
  const state = {
    lessonId: lesson.id,
    nick,
    seed,
    phase: 'choose', // choose → play → joker → (choose …) → boss → summary
    round: 0,
    options: [],
    current: null,
    jokers: [],
    offer: [],
    score: 0,
    quests: [],
    tagCount: {},
    jokerPoints: {},
    boss: null,
    bossResult: null,
    reflection: null,
  };

  function newOptions() {
    state.options = lesson.quests.map((slot) => generateQuest(lesson, slot, rng));
  }
  newOptions();

  const hintFor = (tag, fallbackKey) => {
    const m = (lesson.misconceptions ?? []).find((x) => x.tag === tag);
    if (m) return m.hint;
    if (tag === 'not_mixed') return lesson.hints?.notMixed ?? lesson.hints?.general;
    return lesson.hints?.[fallbackKey] ?? lesson.hints?.general;
  };

  function choose(i) {
    if (state.phase !== 'choose') throw new Error('not choosing');
    state.current = { quest: state.options[i], attempt: 0, hintUsed: false, started: now(), feedback: null, lastResult: null };
    state.phase = 'play';
  }

  /** Optional hint before submitting: halves the calculation points. */
  function useHint() {
    if (!state.current) return null;
    state.current.hintUsed = true;
    return lesson.hints?.general ?? '';
  }

  /**
   * input: { ops, answer: {whole,n,d}, conversion?: {n,d}, estimate?: 'bigger'|'smaller' }
   * Returns { done, ok, judge, feedback }.
   */
  function submit(input) {
    if (state.phase !== 'play') throw new Error('not playing');
    const cur = state.current;
    const q = cur.quest;
    const ej = judgeExpression(q, input.ops);
    if (!ej.valid) return { invalid: true };
    const ja = judgeAnswer(lesson, input.ops, input.answer);
    const conv = lesson.conversion ? judgeConversion(input.ops, input.conversion) : null;
    const estimateCorrect = !!input.estimate && lesson.estimate ? input.estimate === estimateTruth(q.expression, input.ops, lesson.estimate.compareTo) : false;
    const answerCorrect = ja.answerCorrect && (!conv || conv.conversionCorrect);
    const errorTag = ja.errorTag ?? conv?.errorTag ?? null;
    const retry = cur.attempt === 1;
    const ok = ej.expressionOptimal && answerCorrect;
    const ms = now() - cur.started;
    onSubmit({
      t: new Date(now()).toISOString(), nick: state.nick, lessonId: lesson.id, questType: q.type, level: q.level, expression: q.expression,
      hand: q.hand.join(' '), expr: Object.values(input.ops).join(' '), answer: formatAnswer(input.answer),
      expressionOptimal: ej.expressionOptimal, answerCorrect, answerReduced: ja.answerReduced, errorTag: errorTag ?? '',
      hintUsed: cur.hintUsed, retry, ms,
    });
    if (errorTag) state.tagCount[errorTag] = (state.tagCount[errorTag] ?? 0) + 1;

    const flags = {
      expressionOptimal: ej.expressionOptimal, answerCorrect, answerReduced: ja.answerReduced && answerCorrect, requiredReduction: ja.requiredReduction,
      answerMixed: !!ja.answerMixed && answerCorrect, estimateCorrect, conversionCorrect: !!conv?.conversionCorrect, hintUsed: cur.hintUsed, retry,
    };
    // feedback for the expression and for the answer, separately
    const exprFeedback = ej.expressionOptimal ? null : hintFor(null, q.type === 'target' ? 'notTarget' : q.type === 'max' ? 'notMax' : 'notMin');
    const answerFeedback = answerCorrect ? null : hintFor(errorTag, conv && !conv.conversionCorrect ? 'conversion' : 'general');

    if (ok || retry) {
      const s = scoreQuest(flags, state.jokers);
      state.score += s.total;
      for (const c of s.contributions) state.jokerPoints[c.id] = (state.jokerPoints[c.id] ?? 0) + c.points;
      const firstTry = !retry;
      state.offer = shuffled(rng, unlockedConcepts(lesson.concepts ?? [], { ...flags, firstTry, hintFree: !cur.hintUsed }, state.jokers)).slice(0, 3);
      const record = { quest: q, ops: input.ops, flags, score: s, errorTag, best: optimalSolutions(q)[0] ?? null, correctAnswer: ja.correct };
      state.quests.push(record);
      cur.lastResult = record;
      state.phase = 'result';
      return { done: true, ok, flags, score: s, exprFeedback, answerFeedback, errorTag, record };
    }
    cur.attempt = 1;
    cur.hintUsed = true; // the hint is shown after a wrong submission
    cur.feedback = { exprFeedback, answerFeedback, errorTag };
    return { done: false, ok: false, flags, exprFeedback, answerFeedback, errorTag };
  }

  /** Time limit (optional setting) ran out: the quest ends with 0 points. */
  function timeUp() {
    if (state.phase !== 'play') return null;
    const cur = state.current;
    const q = cur.quest;
    onSubmit({
      t: new Date(now()).toISOString(), nick: state.nick, lessonId: lesson.id, questType: q.type, level: q.level, expression: q.expression,
      hand: q.hand.join(' '), expr: '', answer: '', expressionOptimal: false, answerCorrect: false, answerReduced: false, errorTag: 'timeout',
      hintUsed: cur.hintUsed, retry: cur.attempt === 1, ms: now() - cur.started,
    });
    const flags = { expressionOptimal: false, answerCorrect: false, answerReduced: false, requiredReduction: false, answerMixed: false, estimateCorrect: false, conversionCorrect: false, hintUsed: cur.hintUsed, retry: cur.attempt === 1 };
    const record = { quest: q, ops: null, flags, score: scoreQuest(flags, []), errorTag: 'timeout', best: optimalSolutions(q)[0] ?? null, correctAnswer: null, timeUp: true };
    state.quests.push(record);
    cur.lastResult = record;
    state.offer = [];
    state.phase = 'result';
    return record;
  }

  /** After the result screen: show the joker offer, or move on. */
  function next() {
    if (state.phase !== 'result') throw new Error('no result to continue from');
    state.phase = state.offer.length ? 'joker' : 'after';
    if (state.phase === 'after') advance();
  }

  function takeJoker(id, replaceId = null) {
    if (state.phase !== 'joker') throw new Error('no joker offer');
    const j = state.offer.find((x) => x.id === id);
    if (!j) throw new Error('joker not offered');
    if (state.jokers.length >= MAX_JOKERS) {
      if (!replaceId) throw new Error('hand is full: choose a joker to replace');
      state.jokers = state.jokers.filter((x) => x.id !== replaceId);
    }
    state.jokers.push(j);
    advance();
  }

  function skipJoker() {
    if (state.phase !== 'joker') throw new Error('no joker offer');
    advance();
  }

  function advance() {
    state.offer = [];
    state.current = null;
    state.round += 1;
    if (state.round < ROUNDS) {
      newOptions();
      state.phase = 'choose';
    } else {
      state.boss = generateBoss(lesson, rng);
      state.phase = 'boss';
    }
  }

  function answerBoss(line, reason) {
    if (state.phase !== 'boss') throw new Error('no boss');
    const b = state.boss;
    state.bossResult = { lineCorrect: line === b.wrongLine, reasonCorrect: reason === b.answerReason, defeated: line === b.wrongLine && reason === b.answerReason, line, reason };
    state.phase = 'summary';
    return state.bossResult;
  }

  function summary() {
    const bestJoker = Object.entries(state.jokerPoints).sort((a, b) => b[1] - a[1])[0];
    const tags = Object.entries(state.tagCount).sort((a, b) => b[1] - a[1]);
    return {
      score: state.score,
      bestJoker: bestJoker ? { joker: (lesson.concepts ?? []).find((c) => c.id === bestJoker[0]), points: bestJoker[1] } : null,
      tags: tags.map(([tag, count]) => ({ tag, count, pattern: (lesson.misconceptions ?? []).find((m) => m.tag === tag)?.pattern ?? tag })),
      defeated: !!state.bossResult?.defeated,
    };
  }

  /** The reflection answer ends the run; returns the record to save. */
  function reflect(answer) {
    state.reflection = answer;
    state.phase = 'done';
    return { t: new Date(now()).toISOString(), nick: state.nick, lessonId: lesson.id, score: state.score, boss: !!state.bossResult?.defeated, reflection: answer, jokers: state.jokers.map((j) => j.id).join(' ') };
  }

  return { state, choose, useHint, submit, timeUp, next, takeJoker, skipJoker, answerBoss, summary, reflect };
}

export function formatAnswer(a) {
  if (!a) return '';
  const w = a.whole ? `${a.whole} ` : '';
  if (!a.n) return `${a.whole ?? 0}`;
  return `${w}${a.n}/${a.d ?? ''}`.trim();
}
