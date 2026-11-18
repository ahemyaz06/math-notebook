// The notebook's maths, worked out in one place. F9 (linecheck.js), graphs (graphs.js) and graph
// mode with its sound (graph-mode.js) all ask here, so they can never disagree about the same
// function: one evaluator on equation.js's tree, and one routine for where a function is heading
// (limits, holes, the two sides of a slope).
//
// Rules, not AI: the maths is parsed by equation.js and its value is computed. Where a number is
// not sure, the answer is "could not tell", never a guess: a wrong number is worse.

import { differentiate, reduced } from './derive.js';

export class Unsupported extends Error {}
export const no = (message) => { throw new Unsupported(message); };


// ---------- measuring slopes, limits and areas ----------

// The slope of g at x. There is none where g has no value, nor at a corner or a cusp: the slopes
// towards x from the left and from the right (where each side is heading, sideLimit) must come
// to the same number. (|x| at 0 was said to have slope 0, the average of -1 and 1.) The number
// itself is the derivative by rule when one is given (rule(x), see slopeOf), else measured:
// steps from both sides at once, which are far more exact than either side alone.
// rule: { first, second }, the derivatives by rule as functions of x (ruleFor), or null.
export function slope(g, x, order = 1, rule = null) {
  if (order > 2) no('Third and higher derivatives are not checked.');
  if (!Number.isFinite(x)) return NaN;
  if (order === 1) {
    const y = g(x);
    if (!Number.isFinite(y)) return NaN;
    const known = byRule(g, y, rule?.first, x);
    return known !== undefined ? known : fromSides(g, x, y, rule?.first, () => centred(g, x, 1));
  }
  // The second: the first must be there, and have no corner itself (x|x| at 0). Without a rule
  // for the first, its measured slopes are too rough to compare sides, and the steps decide.
  const first = slope(g, x, 1, rule);
  if (!Number.isFinite(first)) return NaN;
  if (!rule?.first) return centred(g, x, 2);
  const known = byRule(rule.first, first, rule.second, x);
  return known !== undefined ? known : fromSides(rule.first, x, first, rule.second, () => centred(g, x, 2));
}

// The slope of h at x from its derivative by rule d, when that settles it: the number; NaN where
// h jumps at x, or d itself jumps there (a corner: |sin x| at pi, where the computer's pi is not
// quite pi and the formula alone gives -1); undefined when the rule cannot say (no rule, or it has
// no value at x itself, as x|x| at 0), and the two sides are measured instead. Quick: a handful
// of values, where measuring both sides takes hundreds.
function byRule(h, y, d, x) {
  if (!d) return undefined;
  const v = d(x);
  if (!Number.isFinite(v)) return undefined;
  const step = 1e-7 * Math.max(1, Math.abs(x));
  const near = [-2, -1, 1, 2].map((k) => d(x + k * step));
  if (!near.every(Number.isFinite)) return undefined;
  const [m2, m1, p1, p2] = near;
  // The slope jumps across x by far more than it changes on either side of it.
  const across = Math.abs(p1 - m1), trend = Math.max(Math.abs(p2 - p1), Math.abs(m1 - m2));
  if (across > 1e-6 * (1 + Math.abs(v)) && across > 4 * trend) return NaN;
  // h itself jumps at x (a step, a piece that ends): no slope, whatever the formula says.
  const allow = 10 * step * (1 + Math.abs(v)) + 64 * Number.EPSILON * (1 + Math.abs(y));
  if ([-1, 1].some((k) => !(Math.abs(h(x + k * step) - y) <= allow))) return NaN;
  return v;
}

// The slope of h at x, where h(x) is y: the two sides must agree; then the exact value (by rule),
// else the measured one, else the two sides' own number.
function fromSides(h, x, y, exact, measure) {
  if (!Number.isFinite(y)) return NaN;
  const sides = [-1, 1].map((dir) => sideSlope(h, x, y, dir));
  if (sides.some((l) => l === null || l.infinite || l.swings)) return NaN; // an end, a vertical tangent, a cusp
  const [left, right] = sides.map((l) => l.value);
  const both = Number.isFinite(left) && Number.isFinite(right);
  if (both && Math.abs(left - right) > 1e-4 * (1 + Math.abs(left) + Math.abs(right))) return NaN; // a corner
  const byRule = exact ? exact(x) : NaN;
  if (Number.isFinite(byRule)) return byRule;
  const measured = measure();
  if (Number.isFinite(measured)) return measured;
  // The steps from both sides at once did not settle (x^(5/3) at 0): the two sides decide.
  return both ? (left + right) / 2 : NaN;
}

// The slope of h towards x from one side (h(x) is y), as sideLimit answers. Four slopes towards x
// (steps s, s/2, s/4, s/8), combined so the error of a step that is not zero cancels; two such
// estimates that agree are the slope. Very small steps alone lose the slope in rounding (y = x^2
// at x = -4.9963 "could not be measured"). Where they do not agree (a vertical tangent, a corner
// just beside x), where the slopes are heading decides.
export function sideSlope(h, x, y, dir) {
  const q = (t) => (h(t) - y) / (t - x);
  const step = 1e-4 * Math.max(1, Math.abs(x));
  const d = [0, 1, 2, 3].map((k) => q(x + (dir * step) / 2 ** k));
  if (d.every(Number.isFinite)) {
    const r = (i) => (8 * d[i + 2] - 6 * d[i + 1] + d[i]) / 3;
    if (Math.abs(r(0) - r(1)) <= 1e-7 * (1 + Math.abs(r(1)))) return { value: r(1) };
  }
  const l = sideLimit(q, x, dir, { quick: true });
  return l?.swings ? { uncertain: true } : l;
}

// The derivatives of body by the rules of calculus (derive.js), as functions of the letter, for
// slope(). Only for maths the rules can take whole: no function written on a line above (its
// letter would be taken for a number), no d/dx inside, no limits, sums or integrals.
export function ruleFor(body, variable, s) {
  const trees = ruleTrees(body, variable, s);
  if (!trees) return null;
  const valueAt = (tree, fast) => {
    if (fast) {
      const vars = { ...s.vars };
      return (t) => { vars.x = t; try { return fast(vars); } catch { return NaN; } };
    }
    return (t) => { try { return value(tree, { ...s, vars: { ...s.vars, x: t } }); } catch { return NaN; } };
  };
  return { first: valueAt(trees.first, trees.fastFirst), second: trees.second ? valueAt(trees.second, trees.fastSecond) : null };
}
// The derivative trees, worked out once for each piece of maths (F9 asks for the slope of the
// same line at hundreds of numbers when it looks for solutions).
const RULE_TREES = new WeakMap();
function ruleTrees(body, variable, s) {
  if (!variable || !body || typeof body !== 'object') return null;
  const key = `${variable}|${Object.keys(s.defs || {}).sort().join(',')}`;
  const known = RULE_TREES.get(body) || new Map();
  RULE_TREES.set(body, known);
  if (known.has(key)) return known.get(key);
  let trees = null;
  if (derivable(body, s) && (variable === 'x' || !JSON.stringify(body).includes('"name":"x"'))) {
    try {
      const first = differentiate(reduced(variable === 'x' ? body : renamed(body, variable)));
      let second = null;
      try { second = differentiate(reduced(first)); } catch { /* the first alone */ }
      trees = { first, second, fastFirst: compiled(first, s.defs || {}), fastSecond: second && compiled(second, s.defs || {}) };
    } catch { trees = null; }
  }
  known.set(key, trees);
  return trees;
}
const DERIVABLE = new Set(['num', 'var', 'bin', 'neg', 'mul', 'frac', 'pow', 'paren', 'abs', 'sqrt', 'fn']);
function derivable(n, s) {
  if (!n || typeof n !== 'object') return true;
  if (n.type === 'sym') return n.latex === '\\pi';
  if (!DERIVABLE.has(n.type)) return false;
  if (n.type === 'var' && (n.name === 'd' || Object.hasOwn(s.defs || {}, n.name))) return false;
  if (n.type === 'paren' && n.inner.type === 'list') return false;
  if (n.type === 'pow' && n.exp.type === 'sym') return false;
  if (n.type === 'bin' && n.op === '+-') return false;
  if (n.type === 'mul' && n.left.type === 'sym' && n.left.latex === '\\pm') return false;
  if (n.type === 'frac' && slopeSign(n)) return false;
  if (n.type === 'fn' && (n.name === 'max' || n.name === 'min')) return false;
  for (const key of ['left', 'right', 'arg', 'num', 'den', 'base', 'exp', 'inner', 'power', 'index']) if (!derivable(n[key], s)) return false;
  return true;
}
function renamed(n, from) {
  if (!n || typeof n !== 'object') return n;
  if (n.type === 'var' && n.name === from) return { ...n, name: 'x' };
  const out = { ...n };
  for (const key of ['left', 'right', 'arg', 'num', 'den', 'base', 'exp', 'inner', 'power', 'index']) if (out[key] && typeof out[key] === 'object') out[key] = renamed(out[key], from);
  return out;
}

// The slope of body (in the letter variable) at the scope's value of that letter.
export function slopeOf(body, variable, s, order = 1) {
  const fast = builtOnce(body, s.defs || {});
  let g;
  if (fast) {
    const vars = { ...s.vars };
    g = (v) => { vars[variable] = v; return fast(vars); };
  } else g = (v) => value(body, { ...s, vars: { ...s.vars, [variable]: v } });
  return slope(g, s.vars[variable], order, ruleFor(body, variable, s));
}
// compiled(), kept for each piece of maths (F9 asks for the slope of one line at thousands of
// numbers when it looks for solutions).
const BUILT = new WeakMap();
function builtOnce(body, defs) {
  if (!body || typeof body !== 'object') return null;
  const key = Object.keys(defs).sort().join(',');
  const known = BUILT.get(body) || new Map();
  BUILT.set(body, known);
  if (!known.has(key)) known.set(key, compiled(body, defs));
  return known.get(key);
}

// The slope measured with two step sizes from both sides at once. Where the two do not agree (a
// curve that wiggles faster than the step), a finer pair is tried; a slope that never settles is
// no value.
function centred(g, x, order) {
  const once = order === 1
    ? (h) => (-g(x + 2 * h) + 8 * g(x + h) - 8 * g(x - h) + g(x - 2 * h)) / (12 * h)
    : (h) => (-g(x + 2 * h) + 16 * g(x + h) - 30 * g(x) + 16 * g(x - h) - g(x - 2 * h)) / (12 * h * h);
  let h = (order === 1 ? 2e-3 : 2e-2) * (1 + Math.abs(x)), wide = once(h);
  for (let k = 0; k < 5; k += 1) {
    h /= 2;
    const fine = once(h);
    if (!Number.isFinite(fine)) return NaN;
    if (Math.abs(fine - wide) <= (order === 1 ? 1e-7 : 1e-5) * (1 + Math.abs(fine))) return fine;
    wide = fine;
  }
  return NaN;
}

// Where a list of values taken ever closer is heading: steady, shrinking steps (continued to
// their end), growing without bound, or not clear (NaN).
export function heading(values) {
  if (!values.every(Number.isFinite)) return NaN;
  const [a, b, c, d] = values;
  const d1 = b - a, d2 = c - b, d3 = d - c;
  const size = 1 + Math.abs(d);
  if (Math.abs(d3) <= 1e-10 * size && Math.abs(d2) <= 1e-8 * size) return d;
  const r1 = d2 / d1, r2 = d3 / d2;
  // Steps shrinking by the same factor each time: continued to their end. Only when the factor
  // holds steady; 1/ln x shrinks ever more slowly, and continuing it gave 0.054 for 0.
  if (Number.isFinite(r1) && Number.isFinite(r2) && r2 > 0 && r2 < 0.9 && Math.abs(r1 - r2) < 0.05) {
    const end = d + d3 * r2 / (1 - r2);
    // Within the doubt of continuing the steps (the factor is not quite steady), and heading
    // to 0: it is 0 (x ln x near 0 was 0.00001).
    const doubt = Math.abs(d3 * (r1 - r2)) / (1 - r2) ** 2;
    return Math.abs(end) <= doubt && headingToZero(values) ? 0 : end;
  }
  // Settled but for the rounding of very small numbers ((1 - cos x)/x^2 near 0): the steadier of the last two.
  if (Math.abs(d3) <= 1e-6 * size && Math.abs(d2) <= 1e-4 * size) return Math.abs(d3) > Math.abs(d2) ? c : d;
  if (Math.abs(d) > 1e3 && Math.abs(d) > 3 * Math.abs(c) && Math.abs(c) > 3 * Math.abs(b) && Math.sign(d) === Math.sign(c)) return Math.sign(d) * Infinity;
  // Steps of the same size or growing, all one way: no end (ln x and sqrt(x) as x grows).
  if (d1 * d2 > 0 && d2 * d3 > 0 && r1 >= 0.95 && r2 >= 0.95 && Math.abs(d3) > 1e-6 * size) return Math.sign(d3) * Infinity;
  return NaN;
}
// Heading to 0, slowly or swinging from side to side (1/ln x, sqrt(x) ln x, x sin(1/x)): the
// sizes shrink every time and one over them grows without end.
export function headingToZero(values) {
  const sizes = values.map(Math.abs);
  if (!sizes.every((v, i) => Number.isFinite(v) && v > 0 && (i === 0 || v < sizes[i - 1]))) return false;
  return heading(sizes.map((v) => 1 / v)) === Infinity;
}
// Too big for the computer to hold (e^(1/x) near 0 from the right): that infinity, when the
// numbers before it grew towards it.
export function headingOverTheTop(values) {
  const first = values.findIndex((v) => !Number.isFinite(v));
  const tail = values.slice(first), before = values.slice(0, first);
  if (first < 1 || !tail.every((v) => v === tail[0] && Math.abs(v) === Infinity)) return NaN;
  const grows = before.every((v, i) => Math.sign(v) === Math.sign(tail[0]) && (i === 0 || Math.abs(v) > Math.abs(before[i - 1])));
  return grows && Math.abs(before.at(-1)) > 1e6 ? tail[0] : NaN;
}
export function settles(values) {
  if (values.some(Number.isNaN)) return NaN;
  if (!values.every(Number.isFinite)) return headingOverTheTop(values);
  const end = heading(values);
  if (!Number.isNaN(end)) return end;
  return headingToZero(values) ? 0 : NaN;
}

// ---------- where a function is heading: the one limit routine ----------
//
// sideLimit(g, a, dir): where g is heading as x comes to a from one side (dir -1 from the left,
// 1 from the right; a may be Infinity or -Infinity, which have one side). g may give Infinity for
// a number too big to hold. The answer is one of
//   { value }          it settles on that number
//   { infinite: 1/-1 } it grows without end, up or down
//   { swings }         no limit: it keeps swinging ([lowest, highest], or true)
//   { uncertain }      could not tell
//   null               no curve close to a on that side
// quick: leave out the slow look for swinging (asked where only a number is wanted).
export function sideLimit(g, a, dir, { quick = false } = {}) {
  if (a === Infinity || a === -Infinity) {
    const end = settles([1e2, 1e3, 1e4, 1e5].map((x) => g(Math.sign(a) * x)));
    return Number.isNaN(end) ? { uncertain: true } : answer(end);
  }
  if (!Number.isFinite(a)) return { uncertain: true };
  const scale = Math.max(1, Math.abs(a));
  const at = (h) => g(a + dir * h * scale);
  const values = [1e-2, 1e-3, 1e-4, 1e-5].map(at);
  // Nothing has a value close by: no curve, or heights too big to hold that grew on the way in.
  if ([...values, at(1e-6), at(1e-8)].every(Number.isNaN)) return farLimit(at);
  const end = settles(values);
  if (Number.isFinite(end)) {
    // Steps from both ends of the scale: the halving steps are the more exact where they settle
    // and agree ((e^x - 1 - x)/x^2 near 0 came to 0.4999988 from the four steps alone).
    const refined = richardson(at);
    const agrees = Number.isFinite(refined) && Math.abs(refined - end) <= 1e-4 * (1 + Math.abs(end));
    return answer(agrees ? refined : end);
  }
  if (!Number.isNaN(end)) return answer(end);
  // Not settled from these four. Steps that halve, combined so the error of a step that is not
  // zero cancels; then a curve that keeps swinging; then heights that run out of what can be held.
  const refined = richardson(at);
  if (Number.isFinite(refined)) return answer(refined);
  const swing = quick ? null : swings(at);
  if (swing) return { swings: swing };
  return farLimit(at) ?? { uncertain: true };
}

// A number, or an infinity, as sideLimit says it. The noise of the last digits is taken off (nine
// are kept). A limit of 0 comes out as exactly 0 from settles and richardson (the probe holds
// them to that: x ln x towards 0 was once 0.0000000049).
function answer(v) {
  if (!Number.isFinite(v)) return { infinite: Math.sign(v) };
  return { value: Number(v.toPrecision(9)) };
}

// Heights at steps that halve, each pair combined so the error of a step that is not zero
// cancels; four in a row that agree are the limit. The steps start large, so a difference of
// nearly equal numbers is read before rounding swallows it. NaN when they never agree.
// A second round takes out an error that goes as the square of the step, as in an even function
// ((cos x - 1 + x^2/2)/x^4 near 0, whose steps run into rounding before the first round settles:
// it was said to swing, with no limit; it is 1/24).
function richardson(at, start = 0.02) {
  // Each height is worked out only when it is first needed: most limits settle in a few steps.
  const heights = [], v = (k) => (k in heights ? heights[k] : (heights[k] = at(start / 2 ** k)));
  const r1 = (k) => 2 * v(k + 1) - v(k);
  const r2 = (k) => (4 * r1(k + 1) - r1(k)) / 3;
  const agree = (run) => run.every(Number.isFinite) && run.every((u) => Math.abs(u - run.at(-1)) <= 2e-7 * (1 + Math.abs(run.at(-1))));
  for (let k = 0; k + 3 < 33; k += 1) {
    const one = [0, 1, 2, 3].map((i) => r1(k + i));
    const two = k + 2 < 32 ? [0, 1, 2].map((i) => r2(k + i)) : [NaN];
    const found = agree(one) ? one[3] : agree(two) ? two[2] : NaN;
    if (Number.isFinite(found)) return Math.abs(found) < 1e-6 ? 0 : found;
  }
  // Rounding came first: once more from steps ten times larger, where the differences are big.
  return start === 0.02 ? richardson(at, 0.2) : NaN;
}

// A curve that swings without settling (sin(1/x) near 0): the heights in each of five shrinking
// stretches towards a keep the same spread. [lowest, highest] when the spread holds steady, true
// when it only keeps up; null when it is not swinging.
function swings(at) {
  const spreads = [];
  for (let d = 2; d <= 6; d += 1) {
    const ys = Array.from({ length: 240 }, (_, i) => at(10 ** -d * 10 ** (-i / 240)));
    if (!ys.every(Number.isFinite)) return null;
    spreads.push([Math.min(...ys), Math.max(...ys)]);
  }
  const width = spreads.map(([lo, hi]) => hi - lo);
  // A spread that grows closer in is not a swing that holds: it may be rounding, which grows as
  // the steps shrink ((e^x - e^-x - 2x)/x^3 near 0 was said to swing; it is 1/3). Could not tell.
  if (!width.every((w) => w > 1e-6 && Math.abs(w - width[0]) <= 0.2 * width[0])) return null;
  return [Math.min(...spreads.map((q) => q[0])), Math.max(...spreads.map((q) => q[1]))];
}

// No height close to a, or none at the last steps: heights further out that grow past 10^12 on
// the way in are a curve going to infinity (e^(1/x) just right of 0, where a graph's heights stop
// at what can be held); anything else is no curve (null).
function farLimit(at) {
  const ys = [0.3, 0.1, 0.03, 0.01, 0.005, 0.003, 0.002].map(at);
  const seen = ys.filter((y) => !Number.isNaN(y));
  if (seen.length < 3 || Number.isNaN(ys[0])) return null;
  const top = seen.findIndex((y) => !Number.isFinite(y));
  const grown = top === -1 ? seen : seen.slice(0, top);
  const grows = grown.length >= 2 && grown.every((y, i) => i === 0 || Math.abs(y) > Math.abs(grown[i - 1]))
    && (Math.abs(grown.at(-1)) > 1e12 || (top !== -1 && Math.abs(grown.at(-1)) > 1e6 && Math.sign(seen[top]) === Math.sign(grown.at(-1))));
  return grows ? { infinite: Math.sign(grown.at(-1)) } : null;
}

// The number an answer stands for: the value, an infinity, or NaN (no limit, could not tell, no curve).
export const limitNumber = (l) => (!l ? NaN : l.infinite ? l.infinite * Infinity : Number.isFinite(l.value) ? l.value : NaN);

// The limit as x comes to a: from one side (side 1 or -1), or from both (side 0), when the two
// sides come to the same answer. A number, an infinity, or NaN (no limit, or could not tell).
export function limit(g, a, side = 0, options = {}) {
  if (a === Infinity || a === -Infinity) return limitNumber(sideLimit(g, a, -Math.sign(a), options));
  if (side) return limitNumber(sideLimit(g, a, side, options));
  const left = limitNumber(sideLimit(g, a, -1, options));
  if (Number.isNaN(left)) return NaN;
  const right = limitNumber(sideLimit(g, a, 1, options));
  if (left === right) return left;
  if (!Number.isFinite(left) || !Number.isFinite(right)) return NaN;
  return Math.abs(left - right) <= 1e-5 * (1 + Math.abs(left)) ? (left + right) / 2 : NaN; // two sides disagree: no limit
}

export function area(g, a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) no('Integrals to infinity are not checked yet.');
  const n = 2000, h = (b - a) / n;
  let sum = g(a) + g(b);
  for (let i = 1; i < n; i += 1) sum += g(a + i * h) * (i % 2 ? 4 : 2);
  return sum * h / 3;
}

// ---------- working out a parsed line's value ----------

// Where a function divides by 0 it has no value (csc 0 was "infinity"). The computer never holds
// pi/2 or pi exactly, so cos and sin there are a tiny number, not 0: closer than 1e-15 is 0.
const over = (top, bottom) => (Math.abs(bottom) < 1e-15 ? NaN : top / bottom);
export const SIMPLE_FUNCTIONS = {
  sin: Math.sin, cos: Math.cos, tan: (x) => (Math.abs(Math.cos(x)) < 1e-15 ? NaN : Math.tan(x)),
  sec: (x) => over(1, Math.cos(x)), csc: (x) => over(1, Math.sin(x)), cot: (x) => over(Math.cos(x), Math.sin(x)),
  arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan, arcsec: (x) => Math.acos(1 / x), arccsc: (x) => Math.asin(1 / x), arccot: (x) => Math.atan2(1, x),
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, sech: (x) => 1 / Math.cosh(x), csch: (x) => over(1, Math.sinh(x)), coth: (x) => over(1, Math.tanh(x)),
  asinh: Math.asinh, acosh: Math.acosh, atanh: (x) => (Math.abs(x) === 1 ? NaN : Math.atanh(x)), ln: Math.log, log: Math.log10, exp: Math.exp, sign: Math.sign,
};
export const INVERSE = { sin: 'arcsin', cos: 'arccos', tan: 'arctan', sec: 'arcsec', csc: 'arccsc', cot: 'arccot', sinh: 'asinh', cosh: 'acosh', tanh: 'atanh' };

export const unwrap = (n) => { while (n?.type === 'paren' && n.inner.type !== 'list') n = n.inner; return n; };
export const isMinusOne = (n) => { n = unwrap(n); return n?.type === 'neg' && n.arg.type === 'num' && Number(n.arg.value) === 1; };
// The name a letter goes by: x, theta, x_1.
export function letterName(n) {
  if (n.type === 'var') return n.name;
  if (n.type === 'sym' && /^\\[A-Za-z]+$/.test(n.latex) && !['\\pi', '\\infty', '\\pm'].includes(n.latex)) return n.latex.slice(1);
  if (n.type === 'sub') { const base = letterName(n.base), sub = unwrap(n.sub); return base && `${base}_${sub.type === 'num' ? sub.value : letterName(sub) || '?'}`; }
  return null;
}
// d/dx written as a fraction: the letter after the d, or null.
export const slopeSign = (n) => (n?.type === 'frac' && n.num.type === 'var' && n.num.name === 'd' && n.den.type === 'sym' && /^d[a-zA-Z]$/.test(n.den.latex) ? n.den.latex[1] : null);
export const leftmost = (n) => { while (n.type === 'mul') n = n.left; return n; };
export const withoutLeftmost = (n) => (n.left.type === 'mul' ? { ...n, left: withoutLeftmost(n.left) } : n.right);
// f' and f'': the letter and how many primes.
export function primed(n) {
  let order = 0;
  while (n.type === 'prime') { order += 1; n = n.arg; }
  return order ? { order, of: n } : null;
}

export function power(base, exponent) {
  if (!Number.isFinite(base) || !Number.isFinite(exponent)) return NaN;
  if (base === 0 && exponent <= 0) return NaN;
  if (base < 0 && !Number.isInteger(exponent)) {
    // The real odd root, as in class: (-8)^(1/3) is -2.
    for (let q = 3; q <= 99; q += 2) {
      const p = Math.round(exponent * q);
      if (Math.abs(exponent * q - p) <= 1e-9 * q) { const size = Math.abs(base) ** exponent; return Math.abs(p) % 2 === 1 ? -size : size; }
    }
    return NaN;
  }
  return base ** exponent;
}

// scope: { vars: {x: 1.7, a: 1.3}, defs: {f: {param: 'x', body}, y: {param: null, body}}, pm: 1 or -1, main: 'x' }
export function value(n, s) {
  switch (n.type) {
    case 'num': return Number(n.value);
    case 'native': return n.f(s.vars.x);
    case 'var': case 'sym': case 'sub': {
      if (n.type === 'sym' && n.latex === '\\pi') return Math.PI;
      if (n.type === 'sym' && n.latex === '\\infty') return Infinity;
      if (n.type === 'sym' && n.latex === '\\underline{\\qquad}') no('A blank to fill in has no value.');
      const name = letterName(n);
      if (!name) no(`${n.latex || 'This'} has no value here.`);
      if (Object.hasOwn(s.vars, name)) return s.vars[name];
      if (name === 'e') return Math.E;
      const def = s.defs[name];
      if (def && !def.param) return defined(def, s);
      if (def) no(`${name} is a function here; write ${name}(${def.param}).`);
      no(`The letter ${name} has no value.`);
    }
    // falls through never: every branch above returns or throws
    case 'bin': {
      const a = value(n.left, s), b = value(n.right, s);
      if (n.op === '+-') { s.usedPm = true; return a + s.pm * b; }
      return n.op === '+' ? a + b : a - b;
    }
    case 'neg': return -value(n.arg, s);
    case 'mul': {
      if (n.left.type === 'sym' && n.left.latex === '\\pm') { s.usedPm = true; return s.pm * value(n.right, s); }
      // d/dx in front of a product applies to all of it: d/dx 3x^2.
      const variable = slopeSign(leftmost(n));
      if (variable) return slopeAt(withoutLeftmost(n), variable, s);
      if (!n.explicit && n.right.type === 'paren' && n.right.inner.type !== 'list') {
        // f(x) and f'(x), when f is a function written on a line above.
        const mark = primed(n.left), letter = letterName(mark ? mark.of : n.left), def = letter && s.defs[letter];
        if (def?.param) {
          const at = value(n.right.inner, s);
          const there = { ...s, vars: { ...s.vars, [def.param]: at } };
          return mark ? slopeOf(def.body, def.param, there, mark.order) : value(def.body, there);
        }
      }
      return value(n.left, s) * value(n.right, s);
    }
    case 'frac': {
      if (slopeSign(n)) no('Write what d/dx applies to after it, in brackets.');
      if (unwrap(n.num).type === 'mul' && slopeSign(leftmost(unwrap(n.num)))) no('Put brackets around what d/dx applies to, as in d/dx (1/x).');
      // dy/dx and df/dx, for a y or f written on a line above.
      if (n.den.type === 'sym' && /^d[a-zA-Z]$/.test(n.den.latex)) {
        const of = n.num.type === 'sym' && /^d[a-zA-Z]$/.test(n.num.latex) ? n.num.latex[1]
          : n.num.type === 'mul' && n.num.left.type === 'var' && n.num.left.name === 'd' ? letterName(n.num.right) : null;
        const def = of && s.defs[of];
        if (def) return slopeAt(def.body, n.den.latex[1], s);
        if (of) no(`${of} is not written as a function on a line above.`);
      }
      const bottom = value(n.den, s);
      return bottom === 0 ? NaN : value(n.num, s) / bottom;
    }
    case 'pow':
      if (n.exp.type === 'sym' && (n.exp.latex === '+' || n.exp.latex === '-')) no('A one-sided sign (a^+) belongs under a limit.');
      return power(value(n.base, s), value(n.exp, s));
    case 'paren':
      if (n.inner.type === 'list') no('A point or an interval is not a number.');
      return value(n.inner, s);
    case 'abs': return Math.abs(value(n.arg, s));
    case 'sqrt': {
      const inner = value(n.arg, s);
      if (!n.index) return inner < 0 ? NaN : Math.sqrt(inner);
      const index = typeof n.index === 'string' ? Number(n.index) : value(n.index, s);
      return power(inner, 1 / index);
    }
    case 'fn': {
      if (n.name === 'max' || n.name === 'min') {
        const inner = n.arg.type === 'paren' ? n.arg.inner : n.arg;
        const all = (inner.type === 'list' ? inner.items : [inner]).map((item) => value(item, s));
        if (n.power) no(`A power on ${n.name} is not checked.`);
        return all.some(Number.isNaN) ? NaN : Math[n.name](...all);
      }
      const inverse = isMinusOne(n.power) && INVERSE[n.name];
      const f = SIMPLE_FUNCTIONS[inverse || n.name];
      if (!f) no(`${n.name} is not checked yet.`);
      const at = value(n.arg, s);
      let out = n.name === 'log' && n.base ? Math.log(at) / Math.log(value(n.base, s)) : f(at);
      if ((n.name === 'ln' || n.name === 'log') && !(at > 0)) out = NaN;
      return n.power && !inverse ? power(out, value(n.power, s)) : out;
    }
    case 'fact': {
      const k = value(n.arg, s);
      if (!Number.isInteger(k) || k < 0 || k > 170) return NaN;
      let out = 1;
      for (let i = 2; i <= k; i += 1) out *= i;
      return out;
    }
    case 'prime': {
      const mark = primed(n), letter = letterName(mark.of), def = letter && s.defs[letter];
      if (def && !def.param) return slopeAt(def.body, s.main, s, mark.order); // y'
      if (def) no(`Write ${letter}'(${def.param}) with its brackets.`);
      if (mark.of.type === 'paren') return slopeAt(mark.of, s.main, s, mark.order); // (x^2)'
      no(`${letter || 'This'}' is the derivative of a function that is not written on a line above.`);
    }
    // falls through never
    case 'lim': {
      const under = unwrap(n.under);
      if (under?.type !== 'rel' || under.op !== '->') no('The limit needs what x goes to, as in lim_(x->2).');
      const variable = letterName(under.left);
      const { target, side } = oneSided(under.right);
      const g = (v) => value(n.arg, { ...s, vars: { ...s.vars, [variable]: v } });
      s.measured = true;
      return limit(g, value(target, s), side);
    }
    case 'large': {
      if (n.latex === '\\sum' || n.latex === '\\prod') {
        // sum_(n=1)^4 n^2: each whole number from the bottom to the top, one after another.
        const start = unwrap(n.sub), word = n.latex === '\\sum' ? 'sum' : 'product';
        const counter = start?.type === 'rel' && start.op === '=' ? letterName(start.left) : null;
        if (!counter || !n.sup || !n.body) no(`The ${word} needs where it starts and ends, as in sum_(n=1)^4 n^2.`);
        const from = value(start.right, s), to = value(n.sup, s);
        if (!Number.isFinite(to) || !Number.isFinite(from)) no(`A ${word} that goes on to infinity is not checked.`);
        if (!Number.isInteger(from) || !Number.isInteger(to)) return NaN;
        if (to - from > 20000) no(`This ${word} has too many terms to check.`);
        let out = word === 'sum' ? 0 : 1;
        for (let k = from; k <= to; k += 1) {
          const term = value(n.body, { ...s, vars: { ...s.vars, [counter]: k } });
          out = word === 'sum' ? out + term : out * term;
        }
        return out;
      }
      if (n.latex !== '\\int') no('Only single integrals are checked.');
      const inner = integrand(n);
      if (!n.sub || !n.sup) no('An integral with no limits is compared by its slope; write it alone on one side of the = sign.');
      const g = (v) => value(inner.body, { ...s, vars: { ...s.vars, [inner.variable]: v } });
      s.measured = true;
      return area(g, value(n.sub, s), value(n.sup, s));
    }
    case 'rel': no('Only one comparison at a time can be checked here.');
    // falls through never
    case 'list': no('A list of things is not a number.');
    // falls through never
    default: no('This kind of maths is not checked yet.');
  }
  return NaN;
}

export function defined(def, s) {
  if ((s.depth || 0) > 8) no('The functions above are written in terms of each other.');
  return value(def.body, { ...s, depth: (s.depth || 0) + 1 });
}

// The point a limit goes to, and its side: 2^+ is 2 from the right. The sign is written on the
// last thing in the point, so pi/2^- is pi/2 from the left (it was read as pi over "2^-").
function oneSided(n) {
  if (n.type === 'pow' && n.exp.type === 'sym' && (n.exp.latex === '+' || n.exp.latex === '-')) return { target: n.base, side: n.exp.latex === '+' ? 1 : -1 };
  const last = { frac: 'den', mul: 'right', bin: 'right', neg: 'arg' }[n.type];
  if (!last) return { target: n, side: 0 };
  const inner = oneSided(n[last]);
  return inner.side ? { target: { ...n, [last]: inner.target }, side: inner.side } : { target: n, side: 0 };
}

export function slopeAt(body, variable, s, order = 1) {
  if (!variable || !Object.hasOwn(s.vars, variable)) no(`The derivative is with respect to ${variable || 'a letter'}, which is not in the line.`);
  s.measured = true;
  return slopeOf(body, variable, s, order);
}

// What is inside an integral, and its letter: int x^2 dx.
export const isDx = (n) => n?.type === 'sym' && /^d[a-zA-Z]$/.test(n.latex);
export const ONE = { type: 'num', value: '1' };
// The piece with its dx taken off the end, or null: x^2 dx, dx, dx/x, (2 dx)/x.
export function withoutDx(n) {
  if (!n) return null;
  if (isDx(n)) return { body: ONE, variable: n.latex[1] };
  if (n.type === 'mul' && isDx(n.right)) return { body: n.left, variable: n.right.latex[1] };
  if (n.type === 'frac') {
    const top = withoutDx(strippedTop(n.num));
    if (top) return { body: { type: 'frac', num: top.body, den: n.den }, variable: top.variable };
  }
  return null;
}
export const strippedTop = (n) => (n.type === 'paren' && n.open === '(' && n.inner.type !== 'list' ? n.inner : n);
export function integrand(n) {
  const found = withoutDx(n.body);
  if (found) return found;
  // int 2x + 1 dx: everything up to the dx is inside the integral, as it is said in class.
  if (n.body?.type === 'bin') {
    const last = withoutDx(n.body.right);
    if (last) return { body: { ...n.body, right: last.body }, variable: last.variable };
  }
  return no('The integral needs its dx at the end.');
}
// ---------- a function of x as a graph ----------
//
// The graph of a function of x, from equation.js's tree, for graphs.js, graph mode and the graph
// sound (graph-math.js's detectLandmarks and findStepEvents trace it). Its heights come from
// value() above, the same as F9's, and its holes from sideLimit, the same as F9's limits.
// The tree is checked first by graphs.js (only x, numbers and functions; no other letters).
//   at(x)    the value, Infinity where it is too big to hold (for limits)
//   yAt(x)   the height: NaN where there is none, or it is too big to hold
//   limitAt(x)   { defined, y } or, where there is no value, { hole, y } when both sides meet
//   domainChecks and isContinuousBetween(a, b): where the curve may break (dividing by 0, a
//   logarithm of 0, a step), so the curve is not drawn across it
export function graphOf(tree) {
  const scope = { vars: { x: 0 }, defs: {}, pm: 1, main: 'x' };
  const valueOf = (n) => {
    const fast = compiled(n);
    if (fast) {
      const vars = { x: 0 };
      return (x) => {
        vars.x = x;
        try { return fast(vars); } catch (error) { if (error instanceof Unsupported) return NaN; throw error; }
      };
    }
    return (x) => {
      scope.vars.x = x;
      try { return value(n, scope); } catch (error) { if (error instanceof Unsupported) return NaN; throw error; }
    };
  };
  const at = valueOf(tree);
  const yAt = (x) => { const v = at(x); return Number.isFinite(v) ? v : NaN; };
  const domainChecks = [];
  let hasSteps = false;
  const finite = (f) => (scope) => { const v = f(scope.x); return Number.isFinite(v) ? v : NaN; };
  const check = (kind, f) => domainChecks.push({ kind, evaluate: finite(f) });
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    switch (n.type) {
      case 'frac': check('zero', valueOf(n.den)); break;
      case 'pow': {
        // A negative power divides by its base: x^(-1) breaks at 0, as 1/x does.
        const base = valueOf(n.base), exp = valueOf(n.exp);
        check('zero', (x) => { const e = exp(x); return Number.isFinite(e) && e < 0 ? base(x) : 1; });
        break;
      }
      case 'fn': {
        const inverse = isMinusOne(n.power) && INVERSE[n.name];
        const arg = valueOf(n.arg);
        if (!inverse) {
          if (n.name === 'ln' || n.name === 'log') check('positive', arg);
          if (n.name === 'log' && n.base) { const b = valueOf(n.base); check('positive', b); check('zero', (x) => Math.log(b(x))); }
          if (n.name === 'tan' || n.name === 'sec') check('zero', (x) => Math.cos(arg(x)));
          if (n.name === 'csc' || n.name === 'cot') check('zero', (x) => Math.sin(arg(x)));
          if (n.name === 'csch' || n.name === 'coth') check('zero', (x) => Math.sinh(arg(x)));
          if (n.name === 'sign') { hasSteps = true; check('step', (x) => Math.sign(arg(x))); }
          if (n.power) {
            const whole = valueOf({ ...n, power: null }), p = valueOf(n.power);
            check('zero', (x) => { const e = p(x); return Number.isFinite(e) && e < 0 ? whole(x) : 1; });
          }
        }
        break;
      }
      default: break;
    }
    for (const key of ['left', 'right', 'arg', 'num', 'den', 'base', 'exp', 'inner', 'power']) walk(n[key]);
    if (n.index && typeof n.index === 'object') walk(n.index);
  })(tree);
  return {
    type: 'function',
    variables: new Set(['x']),
    ...limitHooks(at),
    hasSteps,
    domainChecks,
    at,
    yAt,
    isContinuousBetween(a, b) {
      const scopes = [{ x: a }, { x: (a + b) / 2 }, { x: b }];
      return domainChecks.every((c) => {
        const values = scopes.map((s) => c.evaluate(s));
        if (!values.every(Number.isFinite)) return false;
        if (c.kind === 'positive') return values.every((v) => v > 0);
        return c.kind === 'step'
          ? values.every((v) => v === values[0])
          : values.every((v) => v !== 0 && Math.sign(v) === Math.sign(values[0]));
      });
    },
    limitAt(x) {
      const direct = yAt(x);
      if (Number.isFinite(direct)) return { defined: true, y: direct };
      const y = limit(at, x, 0, { quick: true });
      return Number.isFinite(y) ? { defined: false, hole: true, y } : { defined: false, hole: false, y: NaN };
    },
  };
}

// For graph-math.js's detectLandmarks: the limits it needs at a break (a hole, a jump, an
// asymptote), from the routine above, so the landmarks agree with F9 and the L key.
export const limitHooks = (height) => ({
  sideLimit: (x, dir) => sideLimit(height, x, dir, { quick: true }),
  holeNear: (x) => { const y = limit(height, x, 0, { quick: true }); return Number.isFinite(y) ? y : null; },
});

// ---------- the same arithmetic, built once ----------
//
// A function of x is worked out at thousands of numbers (a graph, its landmarks, a limit, a
// slope). Walking the tree each time is slow, so for the plain maths a graph or a derivative
// is made of, the tree is built once into a function that does exactly what value() does, step
// for step, in the same order: the numbers are the same to the last digit (the probe checks it
// against value()). Anything else (d/dx, a function written above, a limit, a sum) gives null,
// and value() is used as before.
//   compiled(tree, defs) -> (vars) => number, or null
export function compiled(n, defs = {}) {
  try { return build(n, defs); } catch (error) { if (error === CANNOT) return null; throw error; }
}
const CANNOT = Symbol('cannot be built');
const cannot = () => { throw CANNOT; };
function build(n, defs) {
  switch (n.type) {
    case 'num': { const v = Number(n.value); return () => v; }
    case 'var': {
      const name = n.name;
      if (Object.hasOwn(defs, name)) cannot();
      return (vars) => {
        if (Object.hasOwn(vars, name)) return vars[name];
        if (name === 'e') return Math.E;
        return no(`The letter ${name} has no value.`);
      };
    }
    case 'sym':
      if (n.latex === '\pi') return () => Math.PI;
      if (n.latex === '\infty') return () => Infinity;
      return cannot();
    case 'bin': {
      if (n.op === '+-') cannot();
      const a = build(n.left, defs), b = build(n.right, defs);
      return n.op === '+' ? (v) => a(v) + b(v) : (v) => a(v) - b(v);
    }
    case 'neg': { const a = build(n.arg, defs); return (v) => -a(v); }
    case 'mul': {
      if (n.left.type === 'sym' && n.left.latex === '\pm') cannot();
      if (slopeSign(leftmost(n))) cannot();
      if (!n.explicit && n.right.type === 'paren' && n.right.inner.type !== 'list') {
        const mark = primed(n.left), letter = letterName(mark ? mark.of : n.left);
        if (mark || (letter && Object.hasOwn(defs, letter))) cannot();
      }
      const a = build(n.left, defs), b = build(n.right, defs);
      return (v) => a(v) * b(v);
    }
    case 'frac': {
      if (slopeSign(n) || (n.den.type === 'sym' && /^d[a-zA-Z]$/.test(n.den.latex))) cannot();
      if (unwrap(n.num).type === 'mul' && slopeSign(leftmost(unwrap(n.num)))) cannot();
      const top = build(n.num, defs), bottom = build(n.den, defs);
      return (v) => { const b = bottom(v); return b === 0 ? NaN : top(v) / b; };
    }
    case 'pow': {
      if (n.exp.type === 'sym' && (n.exp.latex === '+' || n.exp.latex === '-')) cannot();
      const base = build(n.base, defs), exp = build(n.exp, defs);
      return (v) => power(base(v), exp(v));
    }
    case 'paren': {
      if (n.inner.type === 'list') cannot();
      return build(n.inner, defs);
    }
    case 'abs': { const a = build(n.arg, defs); return (v) => Math.abs(a(v)); }
    case 'sqrt': {
      const inner = build(n.arg, defs);
      if (!n.index) return (v) => { const i = inner(v); return i < 0 ? NaN : Math.sqrt(i); };
      const index = typeof n.index === 'string' ? (() => { const k = Number(n.index); return () => k; })() : build(n.index, defs);
      return (v) => { const i = inner(v); return power(i, 1 / index(v)); };
    }
    case 'fn': {
      if (n.name === 'max' || n.name === 'min') cannot();
      const inverse = isMinusOne(n.power) && INVERSE[n.name];
      const f = SIMPLE_FUNCTIONS[inverse || n.name];
      if (!f) cannot();
      const arg = build(n.arg, defs);
      const base = n.name === 'log' && n.base ? build(n.base, defs) : null;
      const logged = n.name === 'ln' || n.name === 'log';
      const pow = n.power && !inverse ? build(n.power, defs) : null;
      return (v) => {
        const at = arg(v);
        let out = base ? Math.log(at) / Math.log(base(v)) : f(at);
        if (logged && !(at > 0)) out = NaN;
        return pow ? power(out, pow(v)) : out;
      };
    }
    default: return cannot();
  }
}
