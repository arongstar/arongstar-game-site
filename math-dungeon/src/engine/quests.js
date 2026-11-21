// Quest generation, brute-force optimum, judging, misconception matching and boss puzzles.
// All maths is exact (fraction.js). Randomness comes only from a seeded PRNG.
import { frac, gcd, add, multiply, divide, compare, equals, isInteger, isReduced, fromMixed, toDisplay } from './fraction.js';

// ───────── seeded random ─────────
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
export const pickOne = (rng, arr) => arr[Math.floor(rng() * arr.length)];
export function shuffled(rng, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ───────── expression types ─────────
// slots: the order in which cards fill the expression.
// dividend/divisor: exact values. natural: the unreduced answer you get by the textbook method.
export const EXPRESSIONS = {
  // a ÷ b
  nat_div_nat: {
    slots: ['a', 'b'],
    dividend: (o) => frac(o.a),
    divisor: (o) => frac(o.b),
    natural: (o) => frac(o.a, o.b),
    valid(o, c = {}) {
      if (o.b === 0) return false;
      if (c.order === 'less' && !(o.a < o.b)) return false;
      if (c.order === 'greater' && !(o.a > o.b)) return false;
      if (c.nonInteger && o.a % o.b === 0) return false;
      return true;
    },
  },
  // (a/b) ÷ c
  frac_div_nat: {
    slots: ['a', 'b', 'c'],
    dividend: (o) => frac(o.a, o.b),
    divisor: (o) => frac(o.c),
    natural: (o) => frac(o.a, o.b * o.c),
    valid(o, c = {}) {
      if (o.b === 0 || o.c === 0) return false;
      if (c.properFractionOnly && !(o.a < o.b)) return false;
      if (o.c < (c.divisorMin ?? 2)) return false;
      return true;
    },
  },
  // (w a/b) ÷ c
  mixed_div_nat: {
    slots: ['w', 'a', 'b', 'c'],
    dividend: (o) => frac(o.w * o.b + o.a, o.b),
    divisor: (o) => frac(o.c),
    natural: (o) => frac(o.w * o.b + o.a, o.b * o.c),
    valid(o, c = {}) {
      if (o.b === 0 || o.c === 0) return false;
      if (!(o.a < o.b)) return false; // the fraction part of a mixed number is always proper
      if (o.c < (c.divisorMin ?? 2)) return false;
      return true;
    },
  },
};

export function expressionOf(key) {
  const E = EXPRESSIONS[key];
  if (!E) throw new Error(`unknown expression type: ${key}`);
  return E;
}

export function opsFromCards(expression, cards) {
  const E = expressionOf(expression);
  const o = {};
  E.slots.forEach((s, i) => (o[s] = cards[i]));
  return o;
}

export function quotient(expression, o) {
  const E = expressionOf(expression);
  return divide(E.dividend(o), E.divisor(o));
}

export function isValidExpression(expression, o, constraints = {}) {
  const E = expressionOf(expression);
  if (E.slots.some((s) => !Number.isInteger(o[s]))) return false;
  return E.valid(o, constraints);
}

/** Every valid placement of `pick` distinct cards from the hand (brute force). */
export function enumerate(hand, expression, constraints = {}) {
  const E = expressionOf(expression);
  const k = E.slots.length;
  const out = [];
  const chosen = [];
  const rec = () => {
    if (chosen.length === k) {
      const o = opsFromCards(expression, chosen.map((i) => hand[i]));
      if (E.valid(o, constraints)) out.push({ idx: [...chosen], ops: o, q: quotient(expression, o) });
      return;
    }
    for (let i = 0; i < hand.length; i++) {
      if (chosen.includes(i)) continue;
      chosen.push(i);
      rec();
      chosen.pop();
    }
  };
  rec();
  return out;
}

export function extreme(solutions, type) {
  let best = null;
  for (const s of solutions) {
    if (!best) best = s.q;
    else if (type === 'max' ? compare(s.q, best) > 0 : compare(s.q, best) < 0) best = s.q;
  }
  return best;
}

// ───────── quest generation ─────────
/**
 * slot: { level: 'easy'|'normal'|'hard', type: 'target'|'max'|'min' or an array to choose from, handSize? }
 */
export function generateQuest(lesson, slot, rng) {
  const expression = lesson.expression;
  const E = expressionOf(expression);
  const constraints = lesson.constraints ?? {};
  const type = Array.isArray(slot.type) ? pickOne(rng, slot.type) : slot.type;
  const handSize = slot.handSize ?? 6;
  for (let tries = 0; tries < 2000; tries++) {
    let hand;
    let target = null;
    if (type === 'target') {
      // make a solution first, then hide it inside the hand
      const sol = Array.from({ length: E.slots.length }, () => randInt(rng, 1, 9));
      const o = opsFromCards(expression, sol);
      if (!E.valid(o, constraints)) continue;
      if (constraints.numeratorMultipleOfDivisorBias && rng() < 0.75 && o.a % o.c !== 0) continue;
      hand = shuffled(rng, [...sol, ...Array.from({ length: handSize - sol.length }, () => randInt(rng, 1, 9))]);
      target = quotient(expression, o);
    } else {
      hand = Array.from({ length: handSize }, () => randInt(rng, 1, 9));
    }
    // keep the goal answer friendly: its reduced denominator may not exceed maxDenominator
    if (target && constraints.maxDenominator && target.d > constraints.maxDenominator) continue;
    const solutions = enumerate(hand, expression, constraints);
    if (!solutions.length) continue;
    if (type !== 'target' && constraints.numeratorMultipleOfDivisorBias && rng() < 0.75 && !solutions.some((s) => s.ops.a % s.ops.c === 0)) continue;
    const best = type === 'target' ? null : extreme(solutions, type);
    if (best && constraints.maxDenominator && best.d > constraints.maxDenominator) continue;
    // a quest where every placement is optimal teaches nothing
    if (type !== 'target' && solutions.every((s) => equals(s.q, best))) continue;
    return { level: slot.level, type, expression, pick: E.slots.length, hand, target, best, constraints, solutionCount: solutions.length };
  }
  throw new Error('could not generate a quest');
}

/** All optimal placements (for showing the model answer after the second try). */
export function optimalSolutions(quest) {
  const goal = quest.type === 'target' ? quest.target : quest.best;
  return enumerate(quest.hand, quest.expression, quest.constraints).filter((s) => equals(s.q, goal));
}

// ───────── judging ─────────
export function judgeExpression(quest, o) {
  if (!isValidExpression(quest.expression, o, quest.constraints)) return { valid: false, expressionOptimal: false, value: null };
  const value = quotient(quest.expression, o);
  const goal = quest.type === 'target' ? quest.target : quest.best;
  return { valid: true, expressionOptimal: equals(value, goal), value, direction: compare(value, goal) };
}

/** answer: { whole, n, d } as typed. Missing whole = 0. A whole number may be typed with n = 0 / d empty. */
export function answerToFraction(ans) {
  const whole = ans.whole ?? 0;
  const n = ans.n ?? 0;
  const d = ans.d ?? (n === 0 ? 1 : null);
  if (!Number.isInteger(whole) || !Number.isInteger(n) || !Number.isInteger(d) || d <= 0 || whole < 0 || n < 0) return null;
  return fromMixed(whole, n, d);
}

/**
 * Judge the typed answer for the expression the student built.
 * lesson.answerForm 'mixed' requires a mixed number when the value is greater than 1 and not whole.
 */
export function judgeAnswer(lesson, o, ans) {
  const expression = lesson.expression;
  const correct = quotient(expression, o);
  const raw = answerToFraction(ans);
  const natural = expressionOf(expression).natural(o);
  const requiredReduction = !isReduced(natural);
  if (!raw) return { answerCorrect: false, answerReduced: false, valueCorrect: false, errorTag: null, requiredReduction, correct };
  const whole = ans.whole ?? 0, n = ans.n ?? 0, d = ans.d ?? 1;
  const valueCorrect = equals(raw, correct);
  const answerReduced = n === 0 ? true : gcd(n, d) === 1 && (whole === 0 || n < d);
  const needsMixed = lesson.answerForm === 'mixed' && !isInteger(correct) && compare(correct, frac(1)) > 0;
  const formOk = !needsMixed || (whole > 0 && n > 0 && n < d);
  const answerCorrect = valueCorrect && formOk;
  let errorTag = null;
  if (!answerCorrect) {
    if (valueCorrect) errorTag = 'not_mixed';
    else errorTag = matchMisconception(expression, o, raw, (lesson.misconceptions ?? []).map((m) => m.tag));
  }
  return { answerCorrect, answerReduced: answerCorrect && answerReduced, valueCorrect, answerMixed: whole > 0 && n > 0 && n < d, errorTag, requiredReduction, correct, raw };
}

// Each tag computes what a student with that misconception would write, and compares.
// raw is the student's answer exactly as typed (not reduced), so 3/2 and 6/4 can be told apart.
export const MATCHERS = {
  reverse_fraction: (x, o, raw) => x === 'nat_div_nat' && equals(raw, frac(o.b, o.a)),
  mixed_whole_only: (x, o, raw) => {
    if (x === 'nat_div_nat') return isInteger(raw) && raw.n / raw.d === Math.floor(o.a / o.b);
    if (x === 'mixed_div_nat') return equals(raw, add(frac(o.w, o.c), frac(o.a, o.b)));
    return false;
  },
  divide_denominator: (x, o, raw) => x === 'frac_div_nat' && raw.n === o.a && raw.d * o.c === o.b,
  multiply_to_numerator: (x, o, raw) => x === 'frac_div_nat' && ((raw.n === o.a * o.c && raw.d === o.b) || equals(raw, frac(o.a * o.c, o.b))),
  forgot_reciprocal: (x, o, raw) => x !== 'nat_div_nat' && equals(raw, multiply(expressionOf(x).dividend(o), frac(o.c))),
};

export function matchMisconception(expression, o, raw, tags) {
  for (const tag of tags) {
    const m = MATCHERS[tag];
    if (m && m(expression, o, raw)) return tag;
  }
  return null;
}

/** Lesson 4: '÷ c' rewritten as '× (n/d)'. */
export function judgeConversion(o, mult) {
  if (!mult || !Number.isInteger(mult.n) || !Number.isInteger(mult.d) || mult.d <= 0) return { conversionCorrect: false, errorTag: null };
  const m = frac(mult.n, mult.d);
  if (equals(m, frac(1, o.c))) return { conversionCorrect: true, errorTag: null };
  return { conversionCorrect: false, errorTag: equals(m, frac(o.c)) ? 'forgot_reciprocal' : null };
}

/** 'bigger' | 'smaller' | 'same' — the quotient compared with 1 or with the dividend. */
/** compareTo: 'one', 'dividend', or a benchmark fraction { n, d } such as 1/2. */
export function estimateRef(expression, o, compareTo) {
  if (compareTo === 'one') return frac(1);
  if (compareTo === 'dividend') return expressionOf(expression).dividend(o);
  if (compareTo && Number.isInteger(compareTo.n) && Number.isInteger(compareTo.d)) return frac(compareTo.n, compareTo.d);
  throw new Error(`unknown estimate reference: ${JSON.stringify(compareTo)}`);
}
export function estimateTruth(expression, o, compareTo) {
  const q = quotient(expression, o);
  const ref = estimateRef(expression, o, compareTo);
  const c = compare(q, ref);
  return c > 0 ? 'bigger' : c < 0 ? 'smaller' : 'same';
}

// ───────── boss: find the wrong line ─────────
// Tokens: a string, { f: [n, d] } (fraction, parts may be strings like "3 × 1") or { m: [w, n, d] } (mixed number).
const F = (n, d) => ({ f: [n, d] });
const M = (w, n, d) => ({ m: [w, n, d] });
function show(fr, mixed = true) {
  const t = toDisplay(fr, { mixed });
  if (t.n === 0) return String(t.whole);
  return t.whole ? M(t.whole, t.n, t.d) : F(t.n, t.d);
}

// For each expression: which tags can be injected, where the error goes, and how to pick plausible numbers.
const BOSS = {
  nat_div_nat: {
    tags: {
      reverse_fraction: { ok: (o) => o.a !== o.b },
      mixed_whole_only: { ok: (o) => o.a > o.b && o.a % o.b !== 0 },
    },
    problem: (o) => [`${o.a} ÷ ${o.b}`],
    lines(o, tag) {
      const right = frac(o.a, o.b);
      const L = [
        [`${o.a} ÷ ${o.b} 는 `, `1 ÷ ${o.b} 이 ${o.a}개예요.`],
        [`1 ÷ ${o.b} = `, F(1, o.b)],
        [`${o.a} ÷ ${o.b} = `, F(1, o.b), ` 이 ${o.a}개 = `, F(o.a, o.b)],
        ['답: ', show(right)],
      ];
      let wrong = -1;
      if (tag === 'reverse_fraction') {
        L[2] = [`${o.a} ÷ ${o.b} = `, F(1, o.b), ` 이 ${o.a}개 = `, F(o.b, o.a)];
        L[3] = ['답: ', show(frac(o.b, o.a))];
        wrong = 2;
      }
      if (tag === 'mixed_whole_only') {
        L[3] = ['답: ', String(Math.floor(o.a / o.b))];
        wrong = 3;
      }
      return { lines: L, wrong };
    },
  },
  frac_div_nat: {
    tags: {
      forgot_reciprocal: { ok: () => true },
      multiply_to_numerator: { ok: () => true },
      divide_denominator: { ok: (o) => o.b % o.c === 0 && o.b / o.c > 1 },
    },
    problem: (o) => [F(o.a, o.b), ` ÷ ${o.c}`],
    lines(o, tag) {
      const L = [
        [F(o.a, o.b), ` ÷ ${o.c} = `, F(o.a, o.b), ' × ', F(1, o.c)],
        ['= ', F(`${o.a} × 1`, `${o.b} × ${o.c}`)],
        ['= ', F(o.a, o.b * o.c)],
        ['답: ', show(frac(o.a, o.b * o.c))],
      ];
      let wrong = -1;
      if (tag === 'forgot_reciprocal') {
        L[0] = [F(o.a, o.b), ` ÷ ${o.c} = `, F(o.a, o.b), ` × ${o.c}`];
        L[1] = ['= ', F(`${o.a} × ${o.c}`, `${o.b}`)];
        L[2] = ['= ', F(o.a * o.c, o.b)];
        L[3] = ['답: ', show(frac(o.a * o.c, o.b))];
        wrong = 0;
      }
      if (tag === 'multiply_to_numerator') {
        L[1] = ['= ', F(`${o.a} × ${o.c}`, `${o.b}`)];
        L[2] = ['= ', F(o.a * o.c, o.b)];
        L[3] = ['답: ', show(frac(o.a * o.c, o.b))];
        wrong = 1;
      }
      if (tag === 'divide_denominator') {
        L[1] = ['= ', F(`${o.a}`, `${o.b} ÷ ${o.c}`)];
        L[2] = ['= ', F(o.a, o.b / o.c)];
        L[3] = ['답: ', show(frac(o.a, o.b / o.c))];
        wrong = 1;
      }
      return { lines: L, wrong };
    },
  },
  mixed_div_nat: {
    tags: {
      mixed_whole_only: { ok: (o) => o.w % o.c === 0 },
      forgot_reciprocal: { ok: () => true },
    },
    problem: (o) => [M(o.w, o.a, o.b), ` ÷ ${o.c}`],
    lines(o, tag) {
      const top = o.w * o.b + o.a;
      const L = [
        [M(o.w, o.a, o.b), ` ÷ ${o.c} = `, F(top, o.b), ` ÷ ${o.c}`],
        ['= ', F(top, o.b), ' × ', F(1, o.c)],
        ['= ', F(top, o.b * o.c)],
        ['답: ', show(frac(top, o.b * o.c))],
      ];
      let wrong = -1;
      if (tag === 'mixed_whole_only') {
        const w2 = o.w / o.c;
        L[0] = [M(o.w, o.a, o.b), ` ÷ ${o.c} = `, M(`${o.w} ÷ ${o.c}`, o.a, o.b)];
        L[1] = ['= ', M(w2, o.a, o.b)];
        L[2] = ['= ', F(w2 * o.b + o.a, o.b)];
        L[3] = ['답: ', show(frac(w2 * o.b + o.a, o.b))];
        wrong = 0;
      }
      if (tag === 'forgot_reciprocal') {
        L[1] = ['= ', F(top, o.b), ` × ${o.c}`];
        L[2] = ['= ', F(top * o.c, o.b)];
        L[3] = ['답: ', show(frac(top * o.c, o.b))];
        wrong = 1;
      }
      return { lines: L, wrong };
    },
  },
};

/** Replace {a} {b} {c} {w} in a hint or reason with the numbers of this problem. */
export function fillNumbers(text, o) {
  return String(text ?? '').replace(/\{([abcw])\}/g, (m, k) => (o && o[k] !== undefined ? String(o[k]) : m));
}

export function bossTags(lesson) {
  const B = BOSS[lesson.expression];
  return (lesson.misconceptions ?? []).map((m) => m.tag).filter((t) => B?.tags[t]);
}

/** A worked solution with exactly one wrong line, and three reasons to choose from. */
export function generateBoss(lesson, rng) {
  const B = BOSS[lesson.expression];
  const tags = bossTags(lesson);
  if (!tags.length) throw new Error(`no boss template for ${lesson.id}`);
  const tag = pickOne(rng, tags);
  const E = expressionOf(lesson.expression);
  for (let tries = 0; tries < 5000; tries++) {
    const o = opsFromCards(lesson.expression, E.slots.map(() => randInt(rng, 1, 9)));
    if (!E.valid(o, lesson.constraints ?? {}) || !B.tags[tag].ok(o)) continue;
    const { lines, wrong } = B.lines(o, tag);
    const mis = lesson.misconceptions.find((m) => m.tag === tag);
    const right = fillNumbers(mis.pattern, o);
    const others = [...lesson.misconceptions.filter((m) => m.tag !== tag).map((m) => fillNumbers(m.pattern, o)), ...(lesson.bossQuiz?.distractors ?? [])];
    const reasons = shuffled(rng, [right, ...shuffled(rng, [...new Set(others)].filter((r) => r !== right)).slice(0, 2)]);
    return { tag, ops: o, problem: B.problem(o), lines, wrongLine: wrong, reasons, answerReason: reasons.indexOf(right), hint: fillNumbers(mis.hint, o), correct: show(quotient(lesson.expression, o)) };
  }
  throw new Error('could not generate a boss puzzle');
}

