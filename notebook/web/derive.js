// The derivative of parsed maths (equation.js's tree), by the rules of calculus: sum, product,
// quotient, power and chain rule, and the derivatives of the named functions. Rules, not AI and
// not measuring: the result is a formula, so the derivative of x^2 + 1000 is 2x exactly, and
// its derivative is 2 exactly.
//
// The result is a tree of the same kind, for graphs.js to turn into a function. It is tidied
// only as far as needed to stay short and to have a value where it should (1 * u is u, u^1 is
// u, u + 0 is u): it is never shown to the reader.
//
// What the formula cannot say by itself is decided where it is used (graphs.js): whether the
// function has a value at x at all (ln x has none below 0 although 1/x has), and what happens
// at a single point where the formula divides 0 by 0 (x|x| at 0).

const num = (v) => (v < 0 ? { type: 'neg', arg: num(-v) } : { type: 'num', value: String(v) });
const X = { type: 'var', name: 'x' };
const fn = (name, arg) => ({ type: 'fn', name, power: null, arg, base: null });
const sqrt = (arg) => ({ type: 'sqrt', arg, index: null });
const abs = (arg) => ({ type: 'abs', arg });

const bare = (n) => { while (n.type === 'paren' && n.inner.type !== 'list') n = n.inner; return n; };
const numberOf = (n) => {
  n = bare(n);
  if (n.type === 'num') return Number(n.value);
  if (n.type === 'neg') { const v = numberOf(n.arg); return v === null ? null : -v; }
  return null;
};
const isNum = (n, v) => numberOf(n) === v;

// Does the piece change with x?
function hasX(n) {
  if (!n || typeof n !== 'object') return false;
  if (n.type === 'var') return n.name === 'x';
  for (const key of ['left', 'right', 'arg', 'num', 'den', 'base', 'exp', 'inner', 'power']) if (hasX(n[key])) return true;
  if (n.index && typeof n.index === 'object' && hasX(n.index)) return true;
  if (n.type === 'fn' && n.base && hasX(n.base)) return true;
  return false;
}

// ---------- building, a little tidied ----------

function neg(a) {
  if (isNum(a, 0)) return num(0);
  const v = numberOf(a);
  if (v !== null) return num(-v);
  if (bare(a).type === 'neg') return bare(a).arg;
  return { type: 'neg', arg: a };
}
function add(a, b) {
  if (isNum(a, 0)) return b;
  if (isNum(b, 0)) return a;
  if (bare(b).type === 'neg') return { type: 'bin', op: '-', left: a, right: bare(b).arg };
  return { type: 'bin', op: '+', left: a, right: b };
}
function sub(a, b) {
  if (isNum(b, 0)) return a;
  if (isNum(a, 0)) return neg(b);
  if (bare(b).type === 'neg') return { type: 'bin', op: '+', left: a, right: bare(b).arg };
  return { type: 'bin', op: '-', left: a, right: b };
}
function mul(a, b) {
  if (isNum(a, 0) || isNum(b, 0)) return num(0);
  if (isNum(a, 1)) return b;
  if (isNum(b, 1)) return a;
  if (isNum(a, -1)) return neg(b);
  if (isNum(b, -1)) return neg(a);
  const va = numberOf(a), vb = numberOf(b);
  if (va !== null && vb !== null && Number.isFinite(va * vb)) return num(va * vb);
  return { type: 'mul', explicit: true, left: a, right: b };
}
function div(a, b) {
  if (isNum(a, 0)) return num(0);
  if (isNum(b, 1)) return a;
  return { type: 'frac', num: a, den: b };
}
function pow(a, b) {
  if (isNum(b, 1)) return a;
  if (isNum(b, 0)) return num(1);
  return { type: 'pow', base: a, exp: b };
}
const square = (a) => pow(a, num(2));

// ---------- a fraction of polynomials with a common factor ----------

// (x^2 - 4)/(x - 2) is x + 2 everywhere it has a value. Its derivative by the quotient rule,
// ((2x)(x - 2) - (x^2 - 4))/(x - 2)^2, is 1 too, but beside x = 2 the computer works it out as a
// tiny number over a tiny number, and the second derivative there comes out as noise. So a
// common factor is divided out first. (The hole itself stays: the function has no value there,
// which is asked of the function, not of this formula.)

// The coefficients of a polynomial in x, lowest power first, or null when it is not one.
function polynomial(n) {
  n = bare(n);
  switch (n.type) {
    case 'num': return [Number(n.value)];
    case 'var': return n.name === 'x' ? [0, 1] : n.name === 'e' ? [Math.E] : null;
    case 'sym': return n.latex === '\\pi' ? [Math.PI] : null;
    case 'neg': { const p = polynomial(n.arg); return p && p.map((c) => -c); }
    case 'bin': {
      const a = polynomial(n.left), b = polynomial(n.right);
      if (!a || !b || (n.op !== '+' && n.op !== '-')) return null;
      return Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] || 0) + (n.op === '+' ? 1 : -1) * (b[i] || 0));
    }
    case 'mul': { const a = polynomial(n.left), b = polynomial(n.right); return a && b ? times(a, b) : null; }
    case 'frac': { const a = polynomial(n.num), b = polynomial(n.den); return a && b && b.length === 1 && b[0] !== 0 ? a.map((c) => c / b[0]) : null; }
    case 'pow': {
      const a = polynomial(n.base), k = numberOf(n.exp);
      if (!a || k === null || !Number.isInteger(k) || k < 0 || k > 12) return null;
      let out = [1];
      for (let i = 0; i < k; i += 1) out = times(out, a);
      return out;
    }
    default: return null;
  }
}
function times(a, b) {
  const out = new Array(a.length + b.length - 1).fill(0);
  a.forEach((p, i) => b.forEach((q, j) => { out[i + j] += p * q; }));
  return out;
}
const trim = (p) => { const out = [...p]; while (out.length > 1 && Math.abs(out.at(-1)) < 1e-9) out.pop(); return out; };
// a divided by b: [quotient, remainder].
function divide(a, b) {
  const rem = [...a], q = new Array(Math.max(1, a.length - b.length + 1)).fill(0);
  for (let i = a.length - b.length; i >= 0; i -= 1) {
    q[i] = rem[i + b.length - 1] / b.at(-1);
    for (let j = 0; j < b.length; j += 1) rem[i + j] -= q[i] * b[j];
  }
  return [q, trim(rem.slice(0, Math.max(1, b.length - 1)))];
}
const isZeroPoly = (p) => p.every((c) => Math.abs(c) < 1e-9);
function commonFactor(a, b) {
  let p = trim(a), q = trim(b);
  while (!isZeroPoly(q)) {
    if (q.length > p.length) { [p, q] = [q, p]; continue; }
    const r = divide(p, q)[1];
    p = q; q = r;
  }
  return p.map((c) => c / p.at(-1));
}
const valueOfPoly = (p, x) => p.reduceRight((sum, c) => sum * x + c, 0);
function fromPolynomial(p) {
  let out = num(0);
  trim(p).forEach((raw, k) => {
    const c = Math.abs(raw - Math.round(raw)) < 1e-9 ? Math.round(raw) : raw;
    if (c === 0) return;
    const power = k === 0 ? null : pow(X, num(k));
    const term = power ? mul(num(Math.abs(c)), power) : num(Math.abs(c));
    out = c < 0 ? sub(out, term) : add(out, term);
  });
  return out;
}

// The same maths with every fraction of polynomials in lowest terms. Anything else is left as it is.
export function reduced(n) {
  if (!n || typeof n !== 'object') return n;
  const out = { ...n };
  for (const key of ['left', 'right', 'arg', 'num', 'den', 'base', 'exp', 'inner', 'power']) if (out[key] && typeof out[key] === 'object') out[key] = reduced(out[key]);
  if (out.type !== 'frac') return out;
  const top = polynomial(out.num), bottom = polynomial(out.den);
  if (!top || !bottom || trim(bottom).length < 2 || isZeroPoly(top)) return out;
  const g = commonFactor(top, bottom);
  if (g.length < 2) return out;
  const [a, ra] = divide(trim(top), g), [b, rb] = divide(trim(bottom), g);
  const size = Math.max(...top.map(Math.abs), ...bottom.map(Math.abs), 1);
  if (!isZeroPoly(ra.map((c) => c / size)) || !isZeroPoly(rb.map((c) => c / size))) return out;
  // Checked by numbers before it is trusted: the two fractions agree away from the common zeros.
  for (const x of [0.37, -1.63, 2.91, -4.27, 7.13]) {
    const before = valueOfPoly(top, x) / valueOfPoly(bottom, x), after = valueOfPoly(a, x) / valueOfPoly(b, x);
    if (!Number.isFinite(before) || Math.abs(before - after) > 1e-7 * (1 + Math.abs(before))) return out;
  }
  return trim(b).length === 1 ? fromPolynomial(a.map((c) => c / b[0])) : div(fromPolynomial(a), fromPolynomial(b));
}

// ---------- the rules ----------

const INVERSE = { sin: 'arcsin', cos: 'arccos', tan: 'arctan', sec: 'arcsec', csc: 'arccsc', cot: 'arccot', sinh: 'asinh', cosh: 'acosh', tanh: 'atanh' };
const isMinusOne = (n) => n && isNum(n, -1);

// The derivative of name(u) with respect to u.
function outer(name, u) {
  switch (name) {
    case 'sin': return fn('cos', u);
    case 'cos': return neg(fn('sin', u));
    case 'tan': return div(num(1), square(fn('cos', u)));
    case 'sec': return div(fn('sin', u), square(fn('cos', u)));
    case 'csc': return neg(div(fn('cos', u), square(fn('sin', u))));
    case 'cot': return neg(div(num(1), square(fn('sin', u))));
    case 'arcsin': return div(num(1), sqrt(sub(num(1), square(u))));
    case 'arccos': return neg(div(num(1), sqrt(sub(num(1), square(u)))));
    case 'arctan': return div(num(1), add(num(1), square(u)));
    case 'arccot': return neg(div(num(1), add(num(1), square(u))));
    case 'arcsec': return div(num(1), mul(abs(u), sqrt(sub(square(u), num(1)))));
    case 'arccsc': return neg(div(num(1), mul(abs(u), sqrt(sub(square(u), num(1))))));
    case 'ln': return div(num(1), u);
    case 'exp': return fn('exp', u);
    case 'sinh': return fn('cosh', u);
    case 'cosh': return fn('sinh', u);
    case 'tanh': return div(num(1), square(fn('cosh', u)));
    case 'sech': return neg(div(fn('sinh', u), square(fn('cosh', u))));
    case 'csch': return neg(div(fn('cosh', u), square(fn('sinh', u))));
    case 'coth': return neg(div(num(1), square(fn('sinh', u))));
    case 'asinh': return div(num(1), sqrt(add(square(u), num(1))));
    case 'acosh': return div(num(1), sqrt(sub(square(u), num(1))));
    case 'atanh': return div(num(1), sub(num(1), square(u)));
    default: throw new Error(`No rule for the derivative of ${name}.`);
  }
}

export function differentiate(n) {
  if (!hasX(n)) return num(0);
  switch (n.type) {
    case 'var': return num(1); // it is x: every other letter was caught above
    case 'paren': return differentiate(n.inner);
    case 'neg': return neg(differentiate(n.arg));
    case 'bin':
      if (n.op === '+') return add(differentiate(n.left), differentiate(n.right));
      if (n.op === '-') return sub(differentiate(n.left), differentiate(n.right));
      throw new Error('A plus-or-minus sign gives two functions.');
    case 'mul': // the product rule
      if (!hasX(n.left)) return mul(n.left, differentiate(n.right));
      if (!hasX(n.right)) return mul(differentiate(n.left), n.right);
      return add(mul(differentiate(n.left), n.right), mul(n.left, differentiate(n.right)));
    case 'frac': // the quotient rule
      if (!hasX(n.den)) return div(differentiate(n.num), n.den);
      if (!hasX(n.num)) return neg(div(mul(n.num, differentiate(n.den)), square(n.den)));
      return div(sub(mul(differentiate(n.num), n.den), mul(n.num, differentiate(n.den))), square(n.den));
    case 'pow': {
      const { base, exp } = n;
      if (exp.type === 'sym' && (exp.latex === '+' || exp.latex === '-')) throw new Error('A one-sided sign is not a power.');
      if (!hasX(exp)) { // the power rule, with the chain rule: n u^(n - 1) u'
        const v = numberOf(exp);
        const less = v !== null ? num(v - 1) : sub(exp, num(1));
        return mul(mul(exp, pow(base, less)), differentiate(base));
      }
      if (!hasX(base)) { // a^u: a^u ln(a) u'
        const lnBase = bare(base).type === 'var' && bare(base).name === 'e' ? num(1) : fn('ln', base);
        return mul(mul(n, lnBase), differentiate(exp));
      }
      // u^v = e^(v ln u): u^v (v' ln u + v u'/u)
      return mul(n, add(mul(differentiate(exp), fn('ln', base)), div(mul(exp, differentiate(base)), base)));
    }
    case 'abs': // |u|' = u' u/|u|: no value where u is 0, as it should be
      return mul(differentiate(n.arg), div(n.arg, abs(n.arg)));
    case 'sqrt': {
      if (!n.index) return div(differentiate(n.arg), mul(num(2), sqrt(n.arg)));
      // The k-th root is the power 1/k.
      const index = typeof n.index === 'string' ? num(Number(n.index)) : n.index;
      return differentiate({ type: 'pow', base: n.arg, exp: div(num(1), index) });
    }
    case 'fn': {
      if (n.power && !(isMinusOne(n.power) && INVERSE[n.name])) {
        // sin^2 x is (sin x)^2.
        return differentiate({ type: 'pow', base: { ...n, power: null }, exp: n.power });
      }
      const name = n.power ? INVERSE[n.name] : n.name;
      const u = n.arg, du = differentiate(u);
      if (name === 'sign') return num(0);
      if (name === 'log') {
        if (n.base && hasX(n.base)) return differentiate(div(fn('ln', u), fn('ln', n.base)));
        return mul(div(num(1), mul(u, fn('ln', n.base || num(10)))), du);
      }
      return mul(outer(name, u), du);
    }
    default: throw new Error('This cannot be differentiated by rule.');
  }
}
