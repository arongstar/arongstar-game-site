import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gcd, frac, reduce, divide, multiply, add, compare, equals, isProper, toMixed, fromMixed, toDisplay } from '../src/engine/fraction.js';

test('gcd', () => {
  assert.equal(gcd(12, 18), 6);
  assert.equal(gcd(7, 3), 1);
  assert.equal(gcd(0, 5), 5);
  assert.equal(gcd(-8, 12), 4);
  assert.throws(() => gcd(1.5, 3));
});

test('reduce and sign', () => {
  assert.deepEqual(reduce(frac(6, 8)), { n: 3, d: 4 });
  assert.deepEqual(reduce(frac(3, -6)), { n: -1, d: 2 });
  assert.throws(() => frac(1, 0));
  assert.throws(() => frac(0.5, 2));
});

test('divide (spec examples)', () => {
  assert.deepEqual(divide(frac(3), frac(4)), { n: 3, d: 4 }); // 3÷4 = 3/4
  assert.deepEqual(divide(frac(7), frac(3)), { n: 7, d: 3 }); // 7÷3 = 7/3 = 2 1/3
  assert.deepEqual(toMixed(divide(frac(7), frac(3))), { whole: 2, n: 1, d: 3 });
  assert.deepEqual(divide(frac(3, 4), frac(2)), { n: 3, d: 8 }); // (3/4)÷2 = 3/8
  const q = divide(fromMixed(2, 1, 3), frac(2)); // (2 1/3)÷2 = 7/6 = 1 1/6
  assert.deepEqual(q, { n: 7, d: 6 });
  assert.deepEqual(toMixed(q), { whole: 1, n: 1, d: 6 });
  assert.throws(() => divide(frac(1), frac(0)));
});

test('multiply, add, compare, equals, isProper', () => {
  assert.deepEqual(multiply(frac(3, 4), frac(1, 2)), { n: 3, d: 8 });
  assert.deepEqual(add(frac(1, 3), frac(1, 6)), { n: 1, d: 2 });
  assert.equal(compare(frac(1, 2), frac(2, 3)), -1);
  assert.equal(compare(frac(4, 6), frac(2, 3)), 0);
  assert.ok(equals(frac(6, 4), frac(3, 2)));
  assert.ok(isProper(frac(3, 4)));
  assert.ok(!isProper(frac(4, 4)));
});

test('toMixed / fromMixed / toDisplay', () => {
  assert.deepEqual(toMixed(frac(8, 4)), { whole: 2, n: 0, d: 1 });
  assert.deepEqual(fromMixed(1, 1, 6), { n: 7, d: 6 }); // not reduced on purpose
  assert.equal(toDisplay(frac(14, 6)).text, '2 1/3');
  assert.equal(toDisplay(frac(6, 8)).text, '3/4');
  assert.equal(toDisplay(frac(6, 3)).text, '2');
  assert.equal(toDisplay(frac(7, 3), { mixed: false }).text, '7/3');
});
