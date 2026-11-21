import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baseScore, applyJokers, scoreQuest, unlockedConcepts, conditionMet } from '../src/engine/scoring.js';

const reduceJ = { id: 'reduce', unlock: ['answerReduced', 'requiredReduction'], effect: { type: 'multiplier', value: 2, when: ['answerReduced'] } };
const flatJ = { id: 'conversion', unlock: ['conversionCorrect'], effect: { type: 'bonusFlat', value: 30, when: ['conversionCorrect'] } };
const estJ = { id: 'estimate', unlock: ['estimateCorrect'], effect: { type: 'bonusFlat', value: 20, when: ['estimateCorrect'] } };

test('base: choice 50 + calc 50', () => {
  assert.equal(baseScore({ expressionOptimal: true, answerCorrect: true }).base, 100);
  assert.equal(baseScore({ expressionOptimal: false, answerCorrect: true }).base, 50);
  assert.equal(baseScore({ expressionOptimal: true, answerCorrect: false }).base, 50);
});

test('hint halves the calculation points', () => {
  const s = baseScore({ expressionOptimal: true, answerCorrect: true, hintUsed: true });
  assert.equal(s.calc, 25);
  assert.equal(s.base, 75);
});

test('retry halves the base', () => {
  assert.equal(baseScore({ expressionOptimal: true, answerCorrect: true, retry: true }).base, 50);
  assert.equal(baseScore({ expressionOptimal: true, answerCorrect: true, retry: true, hintUsed: true }).base, 37.5);
  assert.equal(scoreQuest({ expressionOptimal: true, answerCorrect: true, retry: true, hintUsed: true }).total, 38);
});

test('jokers stack: flats first, then multipliers', () => {
  const flags = { answerReduced: true, conversionCorrect: true, estimateCorrect: true };
  const r = applyJokers(100, flags, [reduceJ, flatJ, estJ]);
  assert.equal(r.total, (100 + 30 + 20) * 2);
  assert.deepEqual(r.contributions.map((c) => [c.id, c.points]), [['conversion', 30], ['estimate', 20], ['reduce', 150]]);
  // two multipliers multiply
  const r2 = applyJokers(100, flags, [reduceJ, { id: 'x3', effect: { type: 'multiplier', value: 3, when: [] } }]);
  assert.equal(r2.total, 600);
});

test('jokers only apply when their condition holds', () => {
  assert.equal(applyJokers(100, { answerReduced: false }, [reduceJ]).total, 100);
  assert.equal(applyJokers(0, { answerReduced: true }, [reduceJ]).total, 0);
});

test('effects are data, never code', () => {
  const evil = { id: 'evil', effect: { type: 'eval', value: 'process.exit(1)' } };
  const str = { id: 'str', effect: 'answerReduced ? x2 : x1' };
  assert.equal(applyJokers(100, { answerReduced: true }, [evil, str]).total, 100);
  assert.equal(conditionMet(['unknownFlag'], { unknownFlag: true }), false);
});

test('unlock conditions and held jokers', () => {
  const flags = { answerReduced: true, requiredReduction: true, conversionCorrect: false, estimateCorrect: true };
  assert.deepEqual(unlockedConcepts([reduceJ, flatJ, estJ], flags).map((c) => c.id), ['reduce', 'estimate']);
  assert.deepEqual(unlockedConcepts([reduceJ, flatJ, estJ], flags, [reduceJ]).map((c) => c.id), ['estimate']);
});
