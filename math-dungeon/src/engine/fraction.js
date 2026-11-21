// Exact fraction arithmetic on integers. A fraction is { n, d } with integer n and d > 0.
// No floating point is used anywhere in this module.

function assertInt(x, name) {
  if (!Number.isInteger(x)) throw new TypeError(`${name} must be an integer, got ${x}`);
}

export function gcd(a, b) {
  assertInt(a, 'a');
  assertInt(b, 'b');
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

/** Make a fraction (not reduced). Normalises the sign so that d > 0. */
export function frac(n, d = 1) {
  assertInt(n, 'n');
  assertInt(d, 'd');
  if (d === 0) throw new RangeError('denominator must not be 0');
  if (d < 0) return { n: -n, d: -d };
  return { n, d };
}

export function reduce(f) {
  const g = gcd(f.n, f.d) || 1;
  return frac(f.n / g, f.d / g);
}

export function isReduced(f) {
  return gcd(f.n, f.d) === 1;
}

export function add(a, b) {
  return reduce(frac(a.n * b.d + b.n * a.d, a.d * b.d));
}

export function multiply(a, b) {
  return reduce(frac(a.n * b.n, a.d * b.d));
}

export function divide(a, b) {
  if (b.n === 0) throw new RangeError('division by zero');
  return reduce(frac(a.n * b.d, a.d * b.n));
}

/** -1, 0 or 1 */
export function compare(a, b) {
  const x = a.n * b.d - b.n * a.d;
  return x < 0 ? -1 : x > 0 ? 1 : 0;
}

export function equals(a, b) {
  return compare(a, b) === 0;
}

/** |n| < d (a proper fraction; 0 counts as proper) */
export function isProper(f) {
  return Math.abs(f.n) < f.d;
}

export function isInteger(f) {
  return f.n % f.d === 0;
}

/** Reduced mixed number of a non-negative fraction: 7/3 -> { whole: 2, n: 1, d: 3 } */
export function toMixed(f) {
  if (f.n < 0) throw new RangeError('toMixed supports non-negative fractions only');
  const r = reduce(f);
  const whole = Math.floor(r.n / r.d);
  return { whole, n: r.n - whole * r.d, d: r.d };
}

/** Mixed number -> improper fraction, NOT reduced (keeps what the student wrote). */
export function fromMixed(whole, n, d) {
  assertInt(whole, 'whole');
  return frac(whole * d + n, d);
}

/**
 * Display structure for a fraction, based on its reduced form.
 * mixed: true (default) shows improper values as mixed numbers.
 * Returns { whole, n, d, text } where n === 0 means a whole number.
 */
export function toDisplay(f, { mixed = true } = {}) {
  const r = reduce(f);
  if (!mixed) {
    if (r.d === 1) return { whole: r.n, n: 0, d: 1, text: String(r.n) };
    return { whole: 0, n: r.n, d: r.d, text: `${r.n}/${r.d}` };
  }
  const m = toMixed(r);
  if (m.n === 0) return { ...m, text: String(m.whole) };
  return { ...m, text: m.whole ? `${m.whole} ${m.n}/${m.d}` : `${m.n}/${m.d}` };
}
