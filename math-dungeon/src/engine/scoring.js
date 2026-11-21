// Points, concept jokers and multipliers.
// Joker effects are data objects from the lesson module — never evaluated as code.
//   effect: { type: 'multiplier', value: 2, when: ['answerReduced'] }
//   effect: { type: 'bonusFlat', value: 30, when: ['conversionCorrect'] }
//   unlock: ['answerReduced', 'requiredReduction']   (all must be true)

export const CHOICE_POINTS = 50;
export const CALC_POINTS = 50;
export const MAX_JOKERS = 3;

/** Flags a condition may refer to. Anything else is treated as false. */
export const FLAGS = ['expressionOptimal', 'answerCorrect', 'answerReduced', 'requiredReduction', 'answerMixed', 'firstTry', 'estimateCorrect', 'conversionCorrect', 'hintFree'];
const EFFECT_TYPES = ['multiplier', 'bonusFlat'];

export function conditionMet(when, flags) {
  const list = Array.isArray(when) ? when : when ? [when] : [];
  return list.every((f) => FLAGS.includes(f) && flags[f] === true);
}

/**
 * Base points for one submission.
 * choice 50 if the expression meets the goal, calc 50 if the answer is right.
 * hintUsed halves the calc points; a retry (second submission) halves the whole base.
 */
export function baseScore({ expressionOptimal, answerCorrect, hintUsed = false, retry = false }) {
  const choice = expressionOptimal ? CHOICE_POINTS : 0;
  const calc = answerCorrect ? (hintUsed ? CALC_POINTS / 2 : CALC_POINTS) : 0;
  const base = choice + calc;
  return { choice, calc, base: retry ? base / 2 : base };
}

export function isValidEffect(e) {
  return !!e && EFFECT_TYPES.includes(e.type) && typeof e.value === 'number' && Number.isFinite(e.value);
}

/**
 * Apply held jokers to a base score. Flat bonuses first, then multipliers (they stack by multiplying).
 * Returns the total and how many points each joker added.
 */
export function applyJokers(base, flags, jokers = []) {
  let total = base;
  const contributions = [];
  for (const j of jokers) {
    const e = j.effect;
    if (!isValidEffect(e) || e.type !== 'bonusFlat' || !conditionMet(e.when, flags)) continue;
    total += e.value;
    contributions.push({ id: j.id, points: e.value });
  }
  for (const j of jokers) {
    const e = j.effect;
    if (!isValidEffect(e) || e.type !== 'multiplier' || !conditionMet(e.when, flags)) continue;
    const before = total;
    total *= e.value;
    contributions.push({ id: j.id, points: total - before });
  }
  return { total: Math.round(total), contributions };
}

export function scoreQuest(result, jokers = []) {
  const b = baseScore(result);
  const flags = { ...result, hintFree: !result.hintUsed, firstTry: !result.retry };
  const j = applyJokers(b.base, flags, jokers);
  return { ...b, total: j.total, contributions: j.contributions };
}

/** Concepts unlocked by this quest result that the player does not already hold. */
export function unlockedConcepts(concepts, flags, held = []) {
  const heldIds = new Set(held.map((j) => j.id));
  return concepts.filter((c) => !heldIds.has(c.id) && isValidEffect(c.effect) && conditionMet(c.unlock, flags));
}
