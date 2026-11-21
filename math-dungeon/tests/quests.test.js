import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { frac, compare, equals, divide, fromMixed } from '../src/engine/fraction.js';
import { mulberry32, generateQuest, enumerate, judgeExpression, judgeAnswer, matchMisconception, judgeConversion, generateBoss, quotient, optimalSolutions, EXPRESSIONS } from '../src/engine/quests.js';

const lessons = JSON.parse(readFileSync(new URL('../data/lessons/index.json', import.meta.url))).lessons
  .map((id) => JSON.parse(readFileSync(new URL(`../data/lessons/${id}.json`, import.meta.url))));
const L = (n) => lessons[n - 1];

test('same seed → same quests; different seed → different quests', () => {
  for (const lesson of lessons) {
    const a = lesson.quests.map((s) => generateQuest(lesson, s, mulberry32(42)));
    const b = lesson.quests.map((s) => generateQuest(lesson, s, mulberry32(42)));
    assert.deepEqual(a, b);
  }
  const hands = new Set();
  for (let seed = 1; seed <= 20; seed++) hands.add(generateQuest(L(3), L(3).quests[1], mulberry32(seed)).hand.join(''));
  assert.ok(hands.size > 15);
});

test('every target quest has a solution, hands are 6 cards of 1~9', () => {
  for (const lesson of lessons) {
    const rng = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      for (const slot of lesson.quests) {
        const q = generateQuest(lesson, slot, rng);
        assert.equal(q.hand.length, 6);
        assert.ok(q.hand.every((c) => Number.isInteger(c) && c >= 1 && c <= 9));
        if (q.type === 'target') assert.ok(optimalSolutions(q).length > 0, `${lesson.id} target has no solution`);
      }
    }
  }
});

// Independent brute force with plain nested loops, to check enumerate/extreme.
function bruteForce(hand, expression, constraints, type) {
  const k = EXPRESSIONS[expression].slots.length;
  let best = null;
  const idx = [...hand.keys()];
  const go = (chosen) => {
    if (chosen.length === k) {
      const o = Object.fromEntries(EXPRESSIONS[expression].slots.map((s, i) => [s, hand[chosen[i]]]));
      if (!EXPRESSIONS[expression].valid(o, constraints)) return;
      const q = quotient(expression, o);
      if (!best || (type === 'max' ? compare(q, best) > 0 : compare(q, best) < 0)) best = q;
      return;
    }
    for (const i of idx) if (!chosen.includes(i)) go([...chosen, i]);
  };
  go([]);
  return best;
}

test('max/min optimum equals brute force', () => {
  for (const lesson of lessons) {
    const rng = mulberry32(99);
    for (let i = 0; i < 60; i++) {
      for (const slot of lesson.quests.filter((s) => s.type !== 'target')) {
        const q = generateQuest(lesson, slot, rng);
        assert.ok(equals(q.best, bruteForce(q.hand, q.expression, q.constraints, q.type)));
      }
    }
  }
});

test('no placement of any hand divides by zero', () => {
  for (const lesson of lessons) {
    for (let a = 1; a <= 9; a++) {
      const hand = [a, (a % 9) + 1, ((a + 3) % 9) + 1, 9, 1, 5];
      for (const s of enumerate(hand, lesson.expression, lesson.constraints)) assert.ok(s.q.d > 0);
    }
  }
});

test('misconception matching (spec examples)', () => {
  const tags3 = ['divide_denominator', 'multiply_to_numerator'];
  const o3 = { a: 3, b: 4, c: 2 };
  assert.equal(matchMisconception('frac_div_nat', o3, frac(3, 2), tags3), 'divide_denominator');
  assert.equal(matchMisconception('frac_div_nat', o3, frac(6, 4), tags3), 'multiply_to_numerator');
  assert.equal(matchMisconception('nat_div_nat', { a: 3, b: 4 }, frac(4, 3), ['reverse_fraction']), 'reverse_fraction');
  assert.equal(matchMisconception('mixed_div_nat', { w: 2, a: 1, b: 3, c: 2 }, fromMixed(1, 1, 3), ['mixed_whole_only']), 'mixed_whole_only');
  assert.equal(matchMisconception('nat_div_nat', { a: 7, b: 3 }, frac(2), ['mixed_whole_only']), 'mixed_whole_only');
  assert.equal(matchMisconception('frac_div_nat', o3, frac(3, 2), ['forgot_reciprocal']), 'forgot_reciprocal');
  assert.equal(matchMisconception('frac_div_nat', o3, frac(1, 5), tags3), null);
});

test('judgeAnswer: correct, reduced, mixed form, error tags', () => {
  const l2 = L(2);
  assert.equal(judgeAnswer(l2, { a: 7, b: 3 }, { whole: 2, n: 1, d: 3 }).answerCorrect, true);
  const imp = judgeAnswer(l2, { a: 7, b: 3 }, { n: 7, d: 3 });
  assert.equal(imp.answerCorrect, false);
  assert.equal(imp.errorTag, 'not_mixed');
  assert.equal(judgeAnswer(l2, { a: 7, b: 3 }, { whole: 2 }).errorTag, 'mixed_whole_only');
  const l3 = L(3);
  const r = judgeAnswer(l3, { a: 2, b: 3, c: 2 }, { n: 2, d: 6 });
  assert.equal(r.answerCorrect, true);
  assert.equal(r.answerReduced, false);
  assert.equal(r.requiredReduction, true);
  assert.equal(judgeAnswer(l3, { a: 2, b: 3, c: 2 }, { n: 1, d: 3 }).answerReduced, true);
  assert.equal(judgeAnswer(l3, { a: 3, b: 4, c: 2 }, { n: 3, d: 2 }).errorTag, 'divide_denominator');
  assert.equal(judgeAnswer(L(1), { a: 3, b: 4 }, { n: 4, d: 3 }).errorTag, 'reverse_fraction');
  assert.equal(judgeAnswer(L(5), { w: 2, a: 1, b: 3, c: 2 }, { whole: 1, n: 1, d: 3 }).errorTag, 'mixed_whole_only');
  assert.equal(judgeAnswer(L(5), { w: 2, a: 1, b: 3, c: 2 }, { n: 7, d: 6 }).answerCorrect, true);
  assert.equal(judgeAnswer(L(1), { a: 3, b: 4 }, { n: 3 }).answerCorrect, false); // missing denominator
});

test('lesson 4 conversion', () => {
  assert.equal(judgeConversion({ a: 3, b: 4, c: 2 }, { n: 1, d: 2 }).conversionCorrect, true);
  assert.equal(judgeConversion({ a: 3, b: 4, c: 2 }, { n: 2, d: 1 }).errorTag, 'forgot_reciprocal');
});

test('constraints are enforced', () => {
  assert.equal(judgeExpression({ type: 'max', expression: 'nat_div_nat', constraints: { order: 'less' }, best: frac(1) }, { a: 5, b: 3 }).valid, false);
  assert.equal(judgeExpression({ type: 'max', expression: 'frac_div_nat', constraints: { properFractionOnly: true }, best: frac(1) }, { a: 5, b: 3, c: 2 }).valid, false);
  assert.equal(judgeExpression({ type: 'max', expression: 'frac_div_nat', constraints: {}, best: frac(1) }, { a: 1, b: 3, c: 1 }).valid, false);
});

// Completion criterion: 200 random quests per lesson, checked for optimum and judging consistency.
test('200 random quests per lesson: optimum and judging are consistent', () => {
  for (const lesson of lessons) {
    const rng = mulberry32(2026 + lesson.lesson);
    for (let i = 0; i < 200; i++) {
      const slot = lesson.quests[i % lesson.quests.length];
      const q = generateQuest(lesson, slot, rng);
      const all = enumerate(q.hand, q.expression, q.constraints);
      const goal = q.type === 'target' ? q.target : bruteForce(q.hand, q.expression, q.constraints, q.type);
      for (const s of all) {
        const j = judgeExpression(q, s.ops);
        assert.equal(j.valid, true);
        assert.equal(j.expressionOptimal, equals(s.q, goal), `${lesson.id} ${q.type} ${JSON.stringify(s.ops)}`);
        // the exact quotient typed as a reduced (mixed) number is always judged correct
        const c = divide(EXPRESSIONS[q.expression].dividend(s.ops), EXPRESSIONS[q.expression].divisor(s.ops));
        const whole = Math.floor(c.n / c.d);
        const ans = lesson.answerForm === 'mixed' && whole > 0 ? { whole, n: c.n - whole * c.d, d: c.d } : { n: c.n, d: c.d };
        const ja = judgeAnswer(lesson, s.ops, ans);
        assert.equal(ja.answerCorrect, true, `${lesson.id} ${JSON.stringify(s.ops)} ${JSON.stringify(ans)}`);
        // and a value off by one is never judged correct
        assert.equal(judgeAnswer(lesson, s.ops, { n: c.n + 1, d: c.d }).answerCorrect, false);
      }
      assert.ok(all.some((s) => equals(s.q, goal)));
    }
  }
});

test('boss: exactly one wrong line, reasons include the right one', () => {
  for (const lesson of lessons) {
    const rng = mulberry32(5);
    for (let i = 0; i < 40; i++) {
      const b = generateBoss(lesson, rng);
      assert.equal(b.lines.length, 4);
      assert.ok(b.wrongLine >= 0 && b.wrongLine < 4);
      assert.equal(b.reasons.length, 3);
      assert.equal(new Set(b.reasons).size, 3);
      assert.equal(b.reasons[b.answerReason], lesson.misconceptions.find((m) => m.tag === b.tag).pattern);
    }
  }
});
