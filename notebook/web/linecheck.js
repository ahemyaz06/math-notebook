// The line check: is this line of work still the same maths as the line above it?
//
// A sighted student glances up one line to catch a dropped minus sign. Here both lines are
// worked out at the same fixed numbers and compared. No AI and no algebra system: the lines are
// read by the notebook's own parser (equation.js) and their values are computed.
//
// The numbers are not random. They are a fixed list of awkward values (1.7, minus 2.4, ...), so
// the answer is the same every time; when a line has an interval ("on [0, 2pi]") they are taken
// inside it; and only numbers where both lines have a value count.
//
// What is compared depends on what the lines are:
//   expressions and "y = ...":  the values must agree at every number
//   equations to solve:          the solutions must be the same (2x + 3 = 7, then x = 2)
//   inequalities:                the same x must satisfy both
//   f'(x) = ..., dy/dx = ...:    compared with the measured slope of the function above
//   lim, definite integrals:     worked out by numbers; an integral with no limits is checked
//                                by taking the slope of the answer
//   a line that starts with =:   it carries on from the line above (as when factoring), so it
//                                must equal what the line above ended with, whatever that line is
// A wrong "not the same" would be worse than no answer, so anything unsure says so instead.

import { parsePlain, splitDomain, unreadCommands } from './equation.js';
import { Unsupported, no, slopeOf, slope, heading, headingToZero, headingOverTheTop, settles, limit, area, SIMPLE_FUNCTIONS, INVERSE, unwrap, isMinusOne, letterName, slopeSign, leftmost, withoutLeftmost, primed, power, value, defined, slopeAt, isDx, ONE, withoutDx, strippedTop, integrand } from './maths.js';


// ---------- numbers ----------

// The fixed numbers for a variable with no interval: small ones first (they are the ones said),
// both signs, none a whole number (too many wrong steps happen to agree at 0, 1 or 2).
const DEFAULT_POINTS = [1.7, -1.3, 0.3, -0.7, 2.6, -2.4, 3.9, -3.1, 0.15, -0.05, 5.2, -4.6, 0.9, 1.1, 7.4, -6.8,
  0.52, -0.48, 11.5, -13.5, 23.7, -31.3, 47.5, 104.5];
const DISTANCES = [1.7, 0.3, 0.7, 1.3, 2.6, 3.9, 0.15, 0.05, 5.2, 0.9, 1.1, 7.4, 0.52, 11.5, 23.7, 47.5, 104.5, 2.4, 3.1, 0.02];
const FRACTIONS = [0.31, 0.69, 0.5, 0.19, 0.81, 0.07, 0.93, 0.43, 0.57, 0.12, 0.88, 0.25, 0.75, 0.37, 0.63, 0.03, 0.97, 0.46, 0.54, 0.01, 0.99];
// Letters other than the main one (a, b, C ...) get their own fixed values, different for each.
const OTHER_VALUES = [1.3, -0.6, 2.7, 0.4, -1.9, 3.2, 0.8, -2.2, 1.6, 0.7, -1.1, 2.3];
const EVERY_X = { lo: -Infinity, hi: Infinity, loClosed: false, hiClosed: false, not: [] };

function tidy(v) {
  if (!Number.isFinite(v)) return v;
  const r = Number(v.toPrecision(10));
  return Math.abs(r) < 1e-12 ? 0 : r;
}

// A number as it is said: six digits at most, "minus" as a word.
export function spokenNumber(v) {
  if (v === Infinity) return 'infinity';
  if (v === -Infinity) return 'minus infinity';
  if (!Number.isFinite(v)) return 'no value';
  let r = Number(v.toPrecision(6));
  if (Math.abs(r) < 1e-9) r = 0;
  const text = Math.abs(r) >= 1e9 || (r !== 0 && Math.abs(r) < 1e-6) ? r.toExponential(3).replace('e', ' times 10 to the ').replace('+', '') : String(r);
  return text.replaceAll('-', 'minus ');
}

const inside = (r, x) => (x > r.lo || (r.loClosed && x === r.lo)) && (x < r.hi || (r.hiClosed && x === r.hi))
  && !r.not.some((v) => Math.abs(v - x) < 1e-12);

// The numbers tried for the main variable: inside its interval, a closed end included.
export function samplePoints(range = EVERY_X) {
  const { lo, hi } = range;
  let points;
  if (lo === -Infinity && hi === Infinity) points = DEFAULT_POINTS;
  else if (hi === Infinity) points = [...(range.loClosed ? [lo] : []), ...DISTANCES.map((d) => lo + d)];
  else if (lo === -Infinity) points = [...(range.hiClosed ? [hi] : []), ...DISTANCES.map((d) => hi - d)];
  else {
    const width = hi - lo;
    // Rounded so that a number said aloud is short, but never rounded out of the interval.
    const digits = Math.max(1, 2 - Math.floor(Math.log10(width || 1)));
    points = FRACTIONS.map((f) => {
      const exact = lo + f * width, round = Number(exact.toFixed(digits));
      return round > lo && round < hi ? round : exact;
    });
    if (range.loClosed) points.unshift(lo);
    if (range.hiClosed) points.push(hi);
    if (width === 0) points = [lo];
  }
  return [...new Set(points.map(tidy))].filter((x) => inside(range, x));
}
const isAntiderivative = (n) => { n = unwrap(n); return n?.type === 'large' && n.latex === '\\int' && !n.sub && !n.sup; };

// Every letter a piece of maths uses as a number (not e, not the functions written above, not
// the d of d/dx or the letter a limit or an integral runs over).
function letters(n, defs, out = new Set()) {
  if (!n || typeof n !== 'object') return out;
  if (n.type === 'native') { out.add('x'); return out; }
  if (slopeSign(n)) { out.add(n.den.latex[1]); return out; }
  if (n.type === 'frac' && n.den.type === 'sym' && /^d[a-zA-Z]$/.test(n.den.latex)) { out.add(n.den.latex[1]); return out; }
  if (n.type === 'sym' && /^d[a-zA-Z]$/.test(n.latex)) return out;
  if (n.type === 'lim') {
    const inner = letters(n.arg, defs), under = unwrap(n.under);
    const bound = under?.type === 'rel' ? letterName(under.left) : null;
    for (const name of inner) if (name !== bound) out.add(name);
    if (under?.type === 'rel') letters(under.right, defs, out);
    return out;
  }
  if (n.type === 'large' && n.latex === '\\int' && n.sub && n.sup) {
    let bound = null;
    try { bound = integrand(n).variable; } catch { /* said when it is worked out */ }
    for (const name of letters(n.body, defs)) if (name !== bound) out.add(name);
    letters(n.sub, defs, out); letters(n.sup, defs, out);
    return out;
  }
  if (n.type === 'large' && (n.latex === '\\sum' || n.latex === '\\prod')) {
    const start = unwrap(n.sub);
    const counter = start?.type === 'rel' ? letterName(start.left) : null;
    for (const name of letters(n.body, defs)) if (name !== counter) out.add(name);
    if (start?.type === 'rel') letters(start.right, defs, out);
    letters(n.sup, defs, out);
    return out;
  }
  if (n.type === 'prime') {
    const mark = primed(n), letter = letterName(mark.of);
    if (letter && defs[letter]) { for (const name of letters(defs[letter].body, defs)) out.add(name); return out; }
  }
  const name = ['var', 'sym', 'sub'].includes(n.type) ? letterName(n) : null;
  if (name) {
    if (defs[name]) { if (!defs[name].param) for (const inner of letters(defs[name].body, defs)) out.add(inner); } else if (name !== 'e') out.add(name);
    return out;
  }
  if (n.type === 'mul' && !n.explicit && n.right.type === 'paren') {
    const mark = primed(n.left), letter = letterName(mark ? mark.of : n.left);
    if (letter && defs[letter]?.param) {
      for (const inner of letters(defs[letter].body, defs)) if (inner !== defs[letter].param) out.add(inner);
      return letters(n.right, defs, out);
    }
  }
  for (const key of ['left', 'right', 'arg', 'num', 'den', 'base', 'exp', 'inner', 'index', 'power', 'body', 'sub', 'sup', 'under']) {
    if (n[key] && typeof n[key] === 'object') letters(n[key], defs, out);
  }
  if (n.items) for (const item of n.items) letters(item, defs, out);
  return out;
}

// ---------- reading a line ----------

const INEQUALITIES = new Set(['<', '>', '<=', '>=', '!=']);

// a < b <= c is read by the parser as (a < b) <= c: its parts and the signs between them.
function chain(ast) {
  const parts = [], ops = [];
  let n = ast;
  while (n.type === 'rel') { parts.unshift(n.right); ops.unshift(n.op); n = n.left; }
  parts.unshift(n);
  return { parts, ops };
}

// "0 <= x < 2pi" (as splitDomain writes an interval) to the ends of the interval.
function rangeOf(condition) {
  if (!condition || condition === 'otherwise') return null;
  const range = { lo: -Infinity, hi: Infinity, loClosed: false, hiClosed: false, not: [] };
  const flip = { '<': '>', '>': '<', '<=': '>=', '>=': '<=', '=': '=', '!=': '!=' };
  for (const piece of condition.split(/\band\b|[,;]/i).map((p) => p.trim()).filter(Boolean)) {
    const { parts, ops } = chain(parsePlain(piece));
    for (let i = 0; i < ops.length; i += 1) {
      let op = ops[i], other;
      if (letterName(parts[i]) === 'x') other = parts[i + 1];
      else if (letterName(parts[i + 1]) === 'x') { other = parts[i]; op = flip[op]; } else return null;
      const v = value(other, { vars: {}, defs: {}, pm: 1 });
      if (!Number.isFinite(v) && Math.abs(v) !== Infinity) return null;
      if (op === '<' || op === '<=') { if (v < range.hi) { range.hi = v; range.hiClosed = op === '<=' && Number.isFinite(v); } }
      else if (op === '>' || op === '>=') { if (v > range.lo) { range.lo = v; range.loClosed = op === '>=' && Number.isFinite(v); } }
      else if (op === '=') { range.lo = range.hi = v; range.loClosed = range.hiClosed = true; }
      else if (op === '!=') range.not.push(v);
      else return null;
    }
  }
  return range.lo <= range.hi ? range : null;
}

// What stands left of the = sign as a name: y, f(x), or their derivatives y', f'(x), dy/dx.
function nameOf(part) {
  const n = unwrap(part);
  if (n.type === 'var' && n.name === 'y') return { letter: 'y', param: null, order: 0 };
  if (n.type === 'prime') { const mark = primed(n); if (mark.of.type === 'var') return { letter: mark.of.name, param: null, order: mark.order }; }
  if (n.type === 'frac' && n.den.type === 'sym' && /^d[a-zA-Z]$/.test(n.den.latex)) {
    if (n.num.type === 'sym' && /^d[a-zA-Z]$/.test(n.num.latex)) return { letter: n.num.latex[1], param: null, order: 1, variable: n.den.latex[1] };
    if (n.num.type === 'mul' && n.num.left.type === 'var' && n.num.left.name === 'd' && n.num.right.type === 'var') return { letter: n.num.right.name, param: null, order: 1, variable: n.den.latex[1] };
  }
  if (n.type === 'mul' && !n.explicit && n.right.type === 'paren' && n.right.open === '(') {
    const inner = unwrap(n.right.inner), mark = primed(n.left), head = mark ? mark.of : n.left;
    if (head.type === 'var' && inner.type === 'var' && head.name !== inner.name && head.name !== 'e') return { letter: head.name, param: inner.name, order: mark ? mark.order : 0 };
  }
  return null;
}

// One line of work, read. kind: 'values' (an expression, or parts joined by =), 'solutions'
// (x = 2, x = -2), 'inequality'. Throws Unsupported with words for the user.
function readLine(source, defs, compileFunction) {
  let text = String(source.plain ?? source).trim().replace(/\s*[.;]\s*$/, '');
  const line = { continues: false, range: null, name: null, text };
  if (/^=/.test(text)) { line.continues = true; text = text.replace(/^=\s*/, ''); }
  if (!text) no('The line is empty.');
  // \hat{x}, \vec{v}: read aloud by name, but never worked out (hat x is not h times a times t times x).
  const unread = source.latex ? unreadCommands(source.latex) : [];
  if (unread.length) no(`This line has \\${unread[0]} in it, which the check cannot work out.`);
  // A function in pieces: its value comes from the graph code, which already reads the cases.
  if (source.latex && /\\begin\{cases\}/.test(source.latex)) {
    if (!compileFunction) no('Functions written in pieces are not checked here.');
    let made;
    try { made = compileFunction(source.latex, 'latex'); } catch (error) { no(`This function in pieces could not be read: ${error.message}`); }
    const label = /^([a-z])\(x\)|^y\b/i.exec(made.label || '');
    line.kind = 'values';
    line.values = [{ type: 'native', f: (x) => made.graph.yAt(x) }];
    line.name = { letter: label ? (label[1] || 'y') : 'y', param: label?.[1] ? 'x' : null, order: 0, fresh: true };
    return line;
  }
  let domain = null;
  try { domain = splitDomain(text); } catch { /* not an interval after all */ }
  if (domain) { line.range = rangeOf(domain.condition); text = domain.main; }
  else if (!text.includes('=')) {
    // An expression with its interval, |x - 2| on [2, 9]: read as y = ... is, then the y = taken off.
    try { domain = splitDomain('y = ' + text); } catch { /* not an interval */ }
    if (domain) { line.range = rangeOf(domain.condition); text = domain.main.replace(/^y = /, ''); }
  }
  let ast;
  try { ast = parsePlain(text); } catch (error) { no(`The line could not be read as maths: ${error.message}`); }
  if (ast.type === 'list') {
    const [first, ...rest] = ast.items;
    const isIneq = (n) => n.type === 'rel' && chain(n).ops.every((op) => INEQUALITIES.has(op)) && letters(n, {}).has('x') && letters(n, {}).size === 1;
    if (rest.length && rest.every(isIneq) && first.type === 'rel' && chain(first).ops.every((op) => op === '=')) {
      // y = ln x, 0 < x < 2: the comparisons after the comma say where it applies.
      line.range = rangeOf(text.split(',').slice(1).join(' and '));
      ast = first;
    } else {
      // x = 2, x = -2 (or x = 2, -2): the solutions, one after another.
      const head = first.type === 'rel' && first.op === '=' && first.left.type !== 'rel' ? first.left : null;
      line.kind = 'solutions';
      line.equations = ast.items.map((item) => {
        if (item.type === 'rel' && item.op === '=' && item.left.type !== 'rel') return [item.left, item.right];
        if (item.type !== 'rel' && head) return [head, item];
        return no('In a list of answers, write each one as x = a number.');
      });
      return line;
    }
  }
  const { parts, ops } = chain(ast);
  if (ops.some((op) => op === '->' || op === '~=')) no(ops.includes('~=') ? 'An "about equal" sign cannot be checked exactly.' : 'An arrow outside a limit is not checked.');
  if (ops.some((op) => INEQUALITIES.has(op))) {
    if (ops.includes('=')) no('A line mixing = with an inequality is not checked.');
    line.kind = 'inequality';
    line.parts = parts; line.ops = ops;
    return line;
  }
  line.kind = 'values';
  line.values = parts;
  if (parts.length >= 2) {
    const name = nameOf(parts[0]);
    const rest = new Set(parts.slice(1).flatMap((p) => [...letters(p, {})]));
    const known = name && defs[name.letter] && (!name.param || defs[name.letter].param === name.param);
    // y = and f(x) = name what follows. So does f'(x) =, unless f is written on a line above:
    // then f'(x) can be worked out (its measured slope) and is compared like any other part.
    if (name && name.order > 0 && known) line.derivative = name;
    else if (name && !rest.has(name.letter)) {
      line.name = { ...name, fresh: true };
      line.nameNode = parts[0];
      line.values = parts.slice(1);
    }
  }
  return line;
}

// The functions written on the lines above (f(x) = ..., y = ...), nearest last so it wins.
function definitions(context, compileFunction) {
  const defs = {};
  for (const source of context) {
    try {
      const line = readLine(source, defs, compileFunction);
      if (line.kind === 'values' && line.name && line.name.order === 0) {
        defs[line.name.letter] = { param: line.name.param, body: line.values.at(-1), range: line.range };
      }
    } catch { /* a line that cannot be read defines nothing */ }
  }
  return defs;
}

// The value of one piece of maths (no = in it) at the given letters: valueAt('x^2/2', { x: 3 })
// is 4.5. For the tests, which compare every way of writing an equation with hand-worked values.
export function valueAt(source, vars = {}) {
  const line = readLine(typeof source === 'string' ? { plain: source, latex: null } : source, {}, null);
  if (line.kind !== 'values' || line.values.length !== 1) no('This is not one piece of maths with a value.');
  return value(line.values[0], { vars, defs: {}, pm: 1, main: 'x' });
}

// ---------- comparing values ----------

function scopes(variables, range, defs) {
  const names = [...variables].sort();
  const main = names.includes('x') ? 'x' : names.includes('t') ? 't' : names[0] || null;
  const others = names.filter((n) => n !== main);
  const points = main ? samplePoints(main === 'x' && range ? range : EVERY_X) : [0];
  return points.map((x, k) => {
    const vars = main ? { [main]: x } : {};
    others.forEach((name, j) => { vars[name] = OTHER_VALUES[(k * 5 + j * 7 + 3) % OTHER_VALUES.length]; });
    return { vars, defs, pm: 1, main: main || 'x' };
  });
}

const sameSide = (a, b, loose) => {
  if (a === b) return true;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= (loose ? 1e-5 : 1e-8) * (1 + Math.abs(a) + Math.abs(b));
};
const clearlyApart = (a, b, loose) => {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return a !== b;
  return Math.abs(a - b) > (loose ? 1e-3 : 1e-6) * (1 + Math.abs(a) + Math.abs(b));
};
const hasValue = (v) => Number.isFinite(v) || v === Infinity || v === -Infinity;

function where(vars) {
  const names = Object.keys(vars);
  if (!names.length) return '';
  return `At ${names.map((n) => `${n} = ${spokenNumber(vars[n])}`).join(', ')}`;
}

// Two ways of working out a number, compared at the fixed numbers. Returns
// { result: 'same' | 'different' | 'unsure', at, a, b, onlyA, onlyB, why }.
function compare(fa, fb, variables, range, defs) {
  const all = scopes(variables, range, defs);
  let both = 0, close = null, onlyA = null, onlyB = null, loose = false;
  for (const s of all) {
    const a = fa(s), b = fb(s);
    loose = loose || Boolean(s.measured);
    if (s.usedPm) no('A plus-or-minus sign gives two values; it is checked only in a list of solutions.');
    if (!hasValue(a) && !hasValue(b)) continue;
    if (hasValue(a) !== hasValue(b)) { if (hasValue(a)) onlyA ??= s.vars; else onlyB ??= s.vars; continue; }
    both += 1;
    if (sameSide(a, b, loose)) continue;
    if (clearlyApart(a, b, loose)) return { result: 'different', at: s.vars, a, b };
    close ??= s.vars;
  }
  if (close) return { result: 'unsure', why: 'the two come out too close to tell apart' };
  const enough = variables.size ? Math.min(5, all.length) : 1;
  if (both < enough) {
    const why = !variables.size ? 'one side could not be worked out by numbers' : both ? 'there are too few numbers where both have a value' : 'no number tried gives both of them a value';
    return { result: 'unsure', why, onlyA, onlyB };
  }
  // Whole numbers are not used to compare (wrong steps often agree there), but they are where
  // a value is lost or gained: (x^2 - 4)/(x - 2) has none at 2, x + 2 does.
  if (variables.size === 1) {
    const name = [...variables][0];
    for (let k = -6; k <= 6 && !(onlyA && onlyB); k += 1) {
      if (name === 'x' && range && !inside(range, k)) continue;
      const s = { vars: { [name]: k }, defs, pm: 1, main: name };
      let a, b;
      try { a = fa(s); b = fb(s); } catch { continue; }
      if (hasValue(a) && !hasValue(b)) onlyA ??= s.vars;
      if (hasValue(b) && !hasValue(a)) onlyB ??= s.vars;
    }
  }
  return { result: 'same', onlyA, onlyB };
}

// A part as something to work out; an integral with no limits is known by its slope.
function comparer(a, b, defs) {
  const variables = new Set([...letters(a, defs), ...letters(b, defs)]);
  const antiA = isAntiderivative(a), antiB = isAntiderivative(b);
  if (antiA || antiB) {
    const ia = antiA ? integrand(unwrap(a)) : null, ib = antiB ? integrand(unwrap(b)) : null;
    const variable = (ia || ib).variable;
    variables.add(variable);
    const side = (inner, part) => (inner ? (s) => value(inner.body, s) : (s) => slopeAt(part, variable, s));
    return { fa: side(ia, a), fb: side(ib, b), variables, slopes: true };
  }
  return { fa: (s) => value(a, s), fb: (s) => value(b, s), variables };
}

// ---------- equations to solve ----------

function roots(g, lo, hi) {
  const N = 4000, xs = [], vs = [];
  for (let i = 0; i <= N; i += 1) { xs.push(lo + (hi - lo) * i / N); vs.push(g(xs[i])); }
  const sizes = vs.filter(Number.isFinite).map(Math.abs).sort((a, b) => a - b);
  if (!sizes.length) return [];
  const scale = 1 + sizes[Math.floor(sizes.length / 2)];
  const found = [];
  if (vs.filter((v) => v === 0).length > 40) return null; // true on a whole stretch of x
  for (let i = 0; i <= N; i += 1) {
    if (!Number.isFinite(vs[i])) continue;
    if (vs[i] === 0) { found.push(xs[i]); continue; }
    if (i === 0 || !Number.isFinite(vs[i - 1])) continue;
    if (vs[i - 1] * vs[i] < 0) {
      let a = xs[i - 1], b = xs[i], fa = vs[i - 1];
      for (let k = 0; k < 80; k += 1) {
        const m = (a + b) / 2, fm = g(m);
        if (!Number.isFinite(fm)) { a = NaN; break; }
        if (fm === 0) { a = b = m; break; }
        if (fa * fm < 0) b = m; else { a = m; fa = fm; }
      }
      const r = (a + b) / 2;
      // A sign change at a division by zero is not a solution: the value there is huge, not 0.
      if (Number.isFinite(r) && Math.abs(g(r)) <= 1e-7 * scale) found.push(r);
    } else if (i < N && Number.isFinite(vs[i + 1]) && Math.abs(vs[i]) < Math.abs(vs[i - 1]) && Math.abs(vs[i]) <= Math.abs(vs[i + 1])) {
      // Touching zero without crossing it, as (x - 2)^2 = 0 does: the lowest point is looked for.
      let a = xs[i - 1], b = xs[i + 1];
      const phi = (Math.sqrt(5) - 1) / 2;
      for (let k = 0; k < 70; k += 1) {
        const c = b - phi * (b - a), d = a + phi * (b - a);
        if (Math.abs(g(c)) < Math.abs(g(d))) b = d; else a = c;
      }
      const r = (a + b) / 2;
      if (Math.abs(g(r)) <= 1e-9 * scale) found.push(r);
    }
  }
  const out = [];
  for (const r of found.map((v) => { const near = Math.round(v * 1e6) / 1e6; return Math.abs(v - near) < 1e-8 ? near : v; }).sort((a, b) => a - b)) {
    if (!out.length || Math.abs(r - out.at(-1)) > 1e-6 * (1 + Math.abs(r))) out.push(r === 0 ? 0 : r);
  }
  return out;
}

// A line as "something that is 0 exactly at its solutions": left minus right, and for a list of
// answers (or a plus-or-minus) the product, which is 0 at any of them.
function zeroFunction(line) {
  const pairs = line.kind === 'solutions' ? line.equations : [[line.values[0], line.values[1]]];
  return (s) => {
    let out = 1;
    for (const [l, r] of pairs) {
      const probe = { ...s, pm: 1 };
      let term = value(l, probe) - value(r, probe);
      if (probe.usedPm) { const minus = { ...s, pm: -1 }; term *= value(l, minus) - value(r, minus); }
      if (probe.measured) s.measured = true;
      out *= term;
    }
    return out;
  };
}

function searchRange(range) {
  const r = range || EVERY_X;
  if (Number.isFinite(r.lo) && Number.isFinite(r.hi)) return [r.lo, r.hi, true];
  if (Number.isFinite(r.lo)) return [r.lo, r.lo + 100, false];
  if (Number.isFinite(r.hi)) return [r.hi - 100, r.hi, false];
  return [-50, 50, false];
}

const listed = (name, values) => {
  const shown = values.slice(0, 4).map((v) => `${name} = ${spokenNumber(v)}`);
  return shown.join(shown.length === 2 ? ' and ' : ', ') + (values.length > 4 ? `, and ${values.length - 4} more` : '');
};

function lineLetters(line, defs) {
  const nodes = line.kind === 'solutions' ? line.equations.flat() : line.kind === 'inequality' ? line.parts : line.values;
  return new Set(nodes.flatMap((n) => [...letters(n, defs)]));
}

function compareSolutions(above, current, range, defs) {
  const variables = new Set([...lineLetters(above, defs), ...lineLetters(current, defs)]);
  if (!variables.size) no('Neither line has a letter to solve for.');
  const ga = zeroFunction(above), gc = zeroFunction(current);
  const plain = above.kind === 'values' && current.kind === 'values';
  // The same thing done to both sides (adding, moving a term, multiplying by a number) leaves
  // one line a fixed multiple of the other, whatever the letters are.
  if (plain) {
    let ratio = null, steady = 0, broken = false;
    for (const s of scopes(variables, range, defs)) {
      const a = ga({ ...s }), c = gc({ ...s });
      if (!Number.isFinite(a) || !Number.isFinite(c) || Math.abs(a) < 1e-9) continue;
      const q = c / a;
      if (ratio === null) ratio = q;
      if (q === 0 || Math.abs(q - ratio) > 1e-8 * (1 + Math.abs(ratio))) { broken = true; break; }
      steady += 1;
    }
    if (!broken && steady >= 5) return { verdict: 'same', message: 'Same as the line above: the same was done to both sides.' };
  }
  const names = [...variables].sort();
  const main = names.includes('x') ? 'x' : names.includes('t') ? 't' : names[0];
  const others = names.filter((n) => n !== main);
  const [lo, hi, given] = searchRange(main === 'x' ? range : null);
  const span = given ? '' : ` between ${spokenNumber(lo)} and ${spokenNumber(hi)}`;
  let shown = null;
  for (let round = 0; round < (others.length ? 3 : 1); round += 1) {
    const fixed = {};
    others.forEach((name, j) => { fixed[name] = OTHER_VALUES[(round * 5 + j * 7 + 3) % OTHER_VALUES.length]; });
    const at = (g) => (x) => { try { return g({ vars: { ...fixed, [main]: x }, defs, pm: 1, main }); } catch (error) { if (error instanceof Unsupported) throw error; return NaN; } };
    const ra = roots(at(ga), lo, hi), rc = roots(at(gc), lo, hi);
    if (ra === null || rc === null) return { verdict: 'unsure', message: `Could not compare the solutions: one of the lines is true for a whole stretch of ${main}.` };
    const near = (list, r) => list.some((v) => Math.abs(v - r) <= 1e-6 * (1 + Math.abs(r)));
    const added = rc.filter((r) => !near(ra, r)), lost = ra.filter((r) => !near(rc, r));
    const withOthers = others.length ? `With ${others.map((n) => `${n} = ${spokenNumber(fixed[n])}`).join(', ')}: ` : '';
    if (added.length || lost.length) {
      const partsOut = [];
      if (added.length) partsOut.push(`this line has ${listed(main, added)}, which the line above does not`);
      if (lost.length) partsOut.push(`the line above has ${listed(main, lost)}, which is missing here`);
      const text = partsOut.join('; and ');
      return { verdict: 'different', message: `Not the same solutions as the line above. ${withOthers}${text[0].toUpperCase()}${text.slice(1)}.` };
    }
    if (!ra.length) return { verdict: 'unsure', message: `Could not compare the solutions: ${withOthers.toLowerCase()}neither line has a solution${span || ' in its interval'}.` };
    shown ??= `${withOthers}${listed(main, ra)}`;
  }
  return { verdict: 'same', message: `Same solutions as the line above${span}${others.length ? ' at the values tried' : ''}: ${shown}.` };
}

// ---------- inequalities ----------

function holds(line, s) {
  for (let i = 0; i < line.ops.length; i += 1) {
    const a = value(line.parts[i], s), b = value(line.parts[i + 1], s);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    const ok = { '<': a < b, '>': a > b, '<=': a <= b, '>=': a >= b, '!=': a !== b }[line.ops[i]];
    if (!ok) return false;
  }
  return true;
}

function compareInequalities(above, current, range, defs) {
  const variables = new Set([...lineLetters(above, defs), ...lineLetters(current, defs)]);
  if (variables.size !== 1) no('Inequalities are checked only with one letter.');
  const main = [...variables][0];
  const [lo, hi] = searchRange(main === 'x' ? range : null);
  const at = (x) => ({ vars: { [main]: x }, defs, pm: 1, main });
  // Spread through the range, and the ends themselves (where < and <= differ): where a side of
  // either line equals the next.
  const points = [];
  for (let i = 0; i <= 800; i += 1) points.push(lo + (hi - lo) * (i + 0.37) / 801);
  for (const line of [above, current]) {
    for (let i = 0; i < line.ops.length; i += 1) {
      const found = roots((x) => value(line.parts[i], at(x)) - value(line.parts[i + 1], at(x)), lo, hi) || [];
      points.push(...found);
    }
  }
  // Whole numbers and halves too: they are the ones worth saying.
  for (let k = Math.ceil(lo * 2); k <= hi * 2 && k - lo * 2 <= 400; k += 1) points.push(k / 2);
  const short = (x) => (Number.isInteger(x) ? 0 : Number.isInteger(x * 2) ? 1 : 2);
  for (const x of points.sort((a, b) => short(a) - short(b) || Math.abs(a) - Math.abs(b))) {
    const a = holds(above, at(x)), c = holds(current, at(x));
    if (a === null || c === null || a === c) continue;
    return { verdict: 'different', message: `Not the same as the line above: ${main} = ${spokenNumber(x)} makes ${a ? 'the line above true but not this line' : 'this line true but not the line above'}.` };
  }
  return { verdict: 'same', message: 'Same as the line above: the same numbers make both lines true.' };
}

// ---------- the check ----------

const ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];
const partName = (line, i, count) => (count === 2 ? (i === 0 ? 'left side' : 'right side') : `${ORDINAL[i] || `number ${i + 1}`} part`);

// The parts of one line joined by = signs: all equal, or which two are not.
function insideLine(line, range, defs) {
  const count = line.values.length;
  for (let i = 0; i + 1 < count; i += 1) {
    const c = comparer(line.values[i], line.values[i + 1], defs);
    const out = compare(c.fa, c.fb, c.variables, range, defs);
    if (out.result !== 'same') return { ...out, i, slopes: c.slopes, variables: c.variables };
  }
  return { result: 'same' };
}

function lostAndGained(out, above, here) {
  const notes = [];
  const at = (vars) => where(vars).replace(/^At/, notes.length ? 'At' : 'at');
  if (out.onlyA) notes.push(`${at(out.onlyA)} ${above} has a value and ${here} has none.`);
  if (out.onlyB) notes.push(`${at(out.onlyB)} ${here} has a value and ${above} has none.`);
  return notes.length ? ` One difference: ${notes.join(' ')}` : '';
}

// current and previous: { plain, latex } (previous may be null); context: the equation lines
// further up in the same piece of work, top first, for the functions they name.
// Returns { verdict: 'same' | 'different' | 'unsure' | 'alone', message }.
export function checkLine(current, previous = null, context = [], { compileFunction = null } = {}) {
  try {
    return check(current, previous, context, compileFunction);
  } catch (error) {
    if (!(error instanceof Unsupported)) throw error;
    return { verdict: 'unsure', message: `Could not check this line. ${error.message}` };
  }
}

function check(current, previous, context, compileFunction) {
  const defs = definitions(previous ? [...context, previous] : context, compileFunction);
  const defsAbove = definitions(context, compileFunction);
  const line = readLine(current, defs, compileFunction);
  let above = null, aboveProblem = null;
  if (previous) {
    try { above = readLine(previous, defsAbove, compileFunction); } catch (error) { if (!(error instanceof Unsupported)) throw error; aboveProblem = error.message; }
  }
  const range = line.range || above?.range || null;

  if (line.kind === 'inequality') {
    if (above?.kind === 'inequality') return compareInequalities(above, line, range, defs);
    return { verdict: 'alone', message: above ? 'This line is an inequality and the line above is not, so they are not compared.' : 'There is no line above this one to compare with.' };
  }

  // The parts of this line itself.
  let own = { result: 'same' };
  // x = +-2 is two answers at once: it is compared only as the solutions of an equation above.
  const twoSigns = line.kind === 'values' && line.values.some((n) => /\\pm|"\+-"/.test(JSON.stringify(n)));
  if (twoSigns && line.values.length !== 2) no('A plus-or-minus sign is checked only in a line such as x = +-2.');
  if (twoSigns) own = { result: 'different' };
  else if (line.kind === 'values' && line.values.length >= 2) own = insideLine(line, range, defs);
  const aboveOwn = above?.kind === 'values' && above.values.length === 2 && !above.name ? insideLine(above, above.range || range, defsAbove) : { result: 'same' };
  const aboveIsEquation = above?.kind === 'solutions' || aboveOwn.result === 'different';
  if (aboveIsEquation && line.kind === 'values' && line.name?.fresh && line.name.order === 0 && !line.name.param
      && lineLetters(above, defsAbove).has(line.name.letter)) {
    line.values = [line.nameNode, ...line.values];
    line.name = null;
    if (!twoSigns) own = insideLine(line, range, defs);
  }
  // A line that starts with = is never an equation to solve: it says "equal to the line above".
  const isEquation = line.kind === 'solutions' || (!line.continues && own.result === 'different' && line.values.length === 2 && !line.name && !line.derivative);

  // Two equations to solve, one under the other: the solutions decide.
  if (isEquation && aboveIsEquation) return compareSolutions(above, line, range, defs);

  if (twoSigns) return { verdict: 'alone', message: 'A plus-or-minus line gives two answers. It is compared only with an equation to solve on the line above.' };
  if (own.result === 'unsure') return { verdict: 'unsure', message: `Could not check this line: ${own.why}.` };
  if (own.result === 'different') {
    const count = line.values.length, first = partName(line, own.i, count), second = partName(line, own.i + 1, count);
    let also = '';
    // With one letter, say where the two sides do meet: it may be an equation to solve.
    if (count === 2 && own.variables.size === 1 && !own.slopes) {
      const [lo, hi] = searchRange(range);
      const main = [...own.variables][0];
      let meet = null;
      try { meet = roots((x) => zeroFunction(line)({ vars: { [main]: x }, defs, pm: 1, main }), lo, hi); } catch { /* the sentence is left out */ }
      if (meet?.length) also = ` They are equal only at ${listed(main, meet)}.`;
      else if (meet) also = ` They are never equal between ${spokenNumber(lo)} and ${spokenNumber(hi)}.`;
    }
    if (line.derivative && own.i === 0) {
      const word = line.derivative.order === 2 ? 'second derivative' : 'derivative';
      return { verdict: 'different', message: `Not the ${word} of ${line.derivative.letter} written above. ${where(own.at)} the ${word} is ${spokenNumber(own.a)} and this line gives ${spokenNumber(own.b)}.` };
    }
    const lettersHere = own.variables.size;
    const what = own.slopes ? 'The slope of the answer is not what is inside the integral'
      : !lettersHere ? `The ${first} and the ${second} of this line are not equal`
        : also && /only at/.test(also) ? `The two sides of this line are equal only at ${also.replace(/^.*only at /, '').replace(/\.$/, '')}, not for every ${[...own.variables][0]}`
          : `The ${first} and the ${second} of this line are not equal for every number`;
    if (/only at/.test(also)) also = '';
    const numbers = own.slopes ? `${where(own.at)} the slope of the answer is ${spokenNumber(own.slopes && isAntiderivative(line.values[own.i]) ? own.b : own.a)} and the inside of the integral is ${spokenNumber(isAntiderivative(line.values[own.i]) ? own.a : own.b)}.`
      : `${where(own.at) || `The ${first} is ${spokenNumber(own.a)} and the ${second} is ${spokenNumber(own.b)}.`}${where(own.at) ? ` the ${first} is ${spokenNumber(own.a)} and the ${second} is ${spokenNumber(own.b)}.` : ''}`;
    return { verdict: 'different', message: `${what}. ${numbers}${also}` };
  }
  const ownWords = line.kind === 'values' && line.values.length >= 2
    ? (line.values.length === 2 ? 'The two sides of this line are equal' : `The ${line.values.length} parts of this line are equal`) : '';
  const ownNote = own.onlyA || own.onlyB ? lostAndGained(own, 'the left side', 'the right side') : '';

  if (line.derivative) {
    // f'(x) = ... where f is written above: the measured slope of f has just been compared
    // with the rest of the line. The line above (often f itself) is not a second comparison.
    const word = line.derivative.order === 2 ? 'second derivative' : 'derivative';
    return { verdict: 'same', message: `Right: this is the ${word} of ${line.derivative.letter} written above.${ownNote}` };
  }
  if (!above) {
    if (aboveProblem) return { verdict: 'unsure', message: `${ownWords ? `${ownWords}. ` : ''}The line above could not be read, so it is not compared. ${aboveProblem}` };
    return { verdict: ownWords ? 'same' : 'alone', message: ownWords ? `${ownWords}.${ownNote} There is no line above to compare with.` : 'There is no equation above this line to compare with.' };
  }
  if (line.kind === 'solutions') return { verdict: 'alone', message: 'This line is a list of answers and the line above is not an equation to solve, so they are not compared.' };
  if (line.continues && above.kind !== 'values') {
    return { verdict: 'alone', message: `This line starts with =, but the line above is ${above.kind === 'inequality' ? 'an inequality' : 'a list of answers'}, so there is nothing for it to be equal to.` };
  }
  if ((aboveIsEquation && !line.continues) || above.kind !== 'values') {
    return { verdict: ownWords ? 'same' : 'alone', message: `${ownWords ? `${ownWords}.${ownNote} ` : ''}The line above is ${above.kind === 'inequality' ? 'an inequality' : 'an equation to solve'} and this line is not, so they are not compared.` };
  }

  // This line against the line above: what the line above ended with, and what this one starts with.
  const from = above.values.at(-1), to = line.values[0];
  // f'(x) = ... under f(x) = ...: one derivative further than the line above.
  const order = line.name?.fresh ? Math.max(0, line.name.order - (above.name?.order || above.derivative?.order || 0)) : 0;
  if (!order && !line.continues && line.name?.fresh && above.name?.fresh && above.name.order === 0 && line.name.letter !== above.name.letter) {
    return { verdict: ownWords ? 'same' : 'alone', message: `${ownWords ? `${ownWords}. ` : ''}This line names ${line.name.letter} and the line above names ${above.name.letter}, so they are not compared.` };
  }
  let fa, fb, variables, measuredSlope = false;
  if (order) {
    // f'(x) = ... under f(x) = ...: the measured slope of the line above against this line.
    variables = new Set([...letters(from, defsAbove), ...letters(to, defs)]);
    const names = [...variables].sort();
    const variable = line.name.variable || line.name.param || above.name?.param || (names.includes('x') ? 'x' : names.includes('t') ? 't' : names[0]);
    if (!variable) no('The line above has no letter to take the derivative with.');
    variables.add(variable);
    fa = (s) => { s.measured = true; return slopeOf(from, variable, { ...s, defs: defsAbove }, order); };
    fb = (s) => value(to, s);
    measuredSlope = true;
  } else {
    const c = comparer(from, to, defs);
    ({ fa, fb, variables } = c);
    const inner = fa;
    fa = c.slopes ? inner : (s) => value(from, { ...s, defs: defsAbove });
  }
  const out = compare(fa, fb, variables, range, defs);
  const tail = ownWords && line.values.length >= 2 ? ` ${ownWords} too.${ownNote}` : '';
  if (out.result === 'unsure') return { verdict: 'unsure', message: `Could not compare with the line above: ${out.why}.${tail}` };
  if (measuredSlope) {
    const word = order === 2 ? 'second derivative' : 'derivative';
    if (out.result === 'same') return { verdict: 'same', message: `Right: this is the ${word} of the line above.${tail}` };
    return { verdict: 'different', message: `Not the ${word} of the line above. ${where(out.at)} the ${word} is ${spokenNumber(out.a)} and this line gives ${spokenNumber(out.b)}.` };
  }
  if (out.result === 'same') return { verdict: 'same', message: `${line.continues ? 'Equal to the line above.' : 'Same as the line above.'}${lostAndGained(out, 'the line above', 'this line')}${tail}` };
  if (ownWords) {
    // d/dx (x^3) = 3x^2 under x^3: the line does not repeat the line above, it takes its derivative.
    try {
      const names = [...variables].sort();
      const variable = names.includes('x') ? 'x' : names.includes('t') ? 't' : names[0];
      const sloped = variable && compare((s) => { s.measured = true; return slopeOf(from, variable, { ...s, defs: defsAbove }); },
        (s) => value(to, s), variables, range, defs);
      if (sloped?.result === 'same') return { verdict: 'same', message: `Right: this is the derivative of the line above.${tail}` };
    } catch (error) { if (!(error instanceof Unsupported)) throw error; }
  }
  return { verdict: 'different', message: `${line.continues ? 'Not equal to the line above' : 'Not the same as the line above'}. ${where(out.at) || 'Here'} the line above is ${spokenNumber(out.a)} and this line is ${spokenNumber(out.b)}.${ownWords ? ` ${ownWords} with each other.` : ''}` };
}
