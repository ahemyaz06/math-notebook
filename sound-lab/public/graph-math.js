const FUNCTIONS = {
  sin: Math.sin,
  cos: Math.cos,
  tan: (x) => (Math.abs(Math.cos(x)) <= 4 * Number.EPSILON ? NaN : Math.tan(x)),
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  arcsec: (x) => Math.acos(1 / x),
  arccsc: (x) => Math.asin(1 / x),
  arccot: (x) => Math.atan2(1, x),
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  asinh: Math.asinh,
  acosh: Math.acosh,
  atanh: Math.atanh,
  sech: (x) => 1 / Math.cosh(x),
  csch: (x) => 1 / Math.sinh(x),
  coth: (x) => 1 / Math.tanh(x),
  sqrt: Math.sqrt,
  abs: Math.abs,
  log: Math.log10,
  ln: Math.log,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sign: Math.sign,
  cbrt: Math.cbrt,
};

const finite = (value) => (Number.isFinite(value) ? value : NaN);
const unaryValue = (fn, value) => (Number.isFinite(value) ? finite(fn(value)) : NaN);

function binaryValue(operator, left, right) {
  if (!Number.isFinite(left) || !Number.isFinite(right)) return NaN;
  if (operator === '+') return finite(left + right);
  if (operator === '-') return finite(left - right);
  if (operator === '*') return finite(left * right);
  if (operator === '/') return right === 0 ? NaN : finite(left / right);
  if (operator === '^') {
    if (left === 0 && right === 0) return NaN;
    const result = left < 0 && !Number.isInteger(right) ? oddRootPower(left, right) : left ** right;
    return finite(result);
  }
  return NaN;
}

// Real powers of negative bases: x^(1/3) = cbrt(x), x^(2/3) = cbrt(x)^2.
// JavaScript returns NaN for (-8) ** (1/3); calculus courses expect the real
// odd root. Only exponents that are (numerically) p/q with an odd q qualify.
function oddRootPower(base, exponent) {
  for (let q = 3; q <= 99; q += 2) {
    const p = Math.round(exponent * q);
    if (Math.abs(exponent * q - p) <= 1e-9 * q) {
      const magnitude = Math.abs(base) ** exponent;
      return Math.abs(p) % 2 === 1 ? -magnitude : magnitude;
    }
  }
  return NaN;
}

export function addCoordinate(value, delta) {
  if (delta === 0) return value;
  const sum = value + delta;
  if (Math.abs(sum) <= 4 * Number.EPSILON * (Math.abs(value) + Math.abs(delta))) return 0;
  return Number(sum.toPrecision(15));
}

export function formatNumber(value) {
  if (!Number.isFinite(value)) return 'undefined';
  return Number(value.toPrecision(6)).toString();
}

function tokenize(source) {
  const text = String(source || '')
    .toLowerCase()
    .replaceAll('\u03c0', 'pi')
    .replaceAll('\u2212', '-')
    .replaceAll('\u00d7', '*')
    .replaceAll('\u00f7', '/')
    .replaceAll('\u00b2', '^2')
    .replaceAll('\u00b3', '^3')
    .replace(/arcsin/g, 'asin')
    .replace(/arccos/g, 'acos')
    .replace(/arctan/g, 'atan');
  const tokens = [];
  let index = 0;
  while (index < text.length) {
    if (/\s/.test(text[index])) {
      index += 1;
      continue;
    }
    const number = text.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i)?.[0];
    if (number) {
      if (!Number.isFinite(Number(number))) throw new Error('Number is outside the supported range.');
      if (tokens.at(-1)?.type === 'number') throw new Error('Put an operator between numbers.');
      tokens.push({ type: 'number', value: Number(number) });
      index += number.length;
      continue;
    }
    const identifier = text.slice(index).match(/^[a-z]+/i)?.[0];
    if (identifier) {
      tokens.push({ type: 'identifier', value: identifier });
      index += identifier.length;
      continue;
    }
    if ('+-*/^(),'.includes(text[index])) {
      tokens.push({ type: text[index], value: text[index] });
      index += 1;
      continue;
    }
    throw new Error(`Unsupported symbol: ${text[index]}`);
  }
  tokens.push({ type: 'end' });
  return tokens;
}

export function compileExpression(source) {
  // Long enough for functions written from LaTeX, which carry many brackets.
  if (String(source || '').length > 400) throw new Error('Expression is too long.');
  const tokens = tokenize(source);
  const variables = new Set();
  const domainChecks = [];
  let hasSteps = false;
  let position = 0;
  const peek = () => tokens[position];
  const take = (type) => {
    if (peek().type !== type) throw new Error(`Expected ${type}.`);
    return tokens[position++];
  };

  function primary() {
    if (peek().type === 'number') {
      const value = take('number').value;
      return () => value;
    }
    if (peek().type === 'identifier') {
      const name = take('identifier').value;
      if (name === 'pi') return () => Math.PI;
      if (name === 'e') return () => Math.E;
      if (name === 'x' || name === 'y') {
        variables.add(name);
        return (scope) => finite(scope[name]);
      }
      const fn = Object.hasOwn(FUNCTIONS, name) ? FUNCTIONS[name] : null;
      if (!fn) throw new Error(`Unsupported function: ${name}.`);
      take('(');
      const argument = expression();
      take(')');
      if (name === 'ln' || name === 'log') domainChecks.push({ kind: 'positive', evaluate: argument });
      if (name === 'tan') {
        domainChecks.push({ kind: 'zero', evaluate: (scope) => unaryValue(Math.cos, argument(scope)) });
      }
      if (['floor', 'ceil', 'round', 'sign'].includes(name)) {
        hasSteps = true;
        domainChecks.push({ kind: 'step', evaluate: (scope) => unaryValue(fn, argument(scope)) });
      }
      return (scope) => unaryValue(fn, argument(scope));
    }
    if (peek().type === '(') {
      take('(');
      const value = expression();
      take(')');
      return value;
    }
    throw new Error('Expected a number, x, function, or parentheses.');
  }

  function power() {
    const left = primary();
    if (peek().type !== '^') return left;
    take('^');
    const right = unary();
    // A negative exponent divides by the base: x^(-1) has a pole where x = 0,
    // exactly like 1/x. Register it so asymptotes are detected and not joined.
    domainChecks.push({
      kind: 'zero',
      evaluate: (scope) => {
        const exponent = right(scope);
        return Number.isFinite(exponent) && exponent < 0 ? left(scope) : 1;
      },
    });
    return (scope) => binaryValue('^', left(scope), right(scope));
  }

  function unary() {
    if (peek().type === '+') {
      take('+');
      return unary();
    }
    if (peek().type === '-') {
      take('-');
      const value = unary();
      return (scope) => unaryValue((x) => -x, value(scope));
    }
    return power();
  }

  function multiplication() {
    let left = unary();
    while (true) {
      const type = peek().type;
      if (type === '*' || type === '/') {
        take(type);
        const right = unary();
        const previous = left;
        if (type === '/') domainChecks.push({ kind: 'zero', evaluate: right });
        left = (scope) => binaryValue(type, previous(scope), right(scope));
      } else if (type === 'number' || type === 'identifier' || type === '(') {
        const right = unary();
        const previous = left;
        left = (scope) => binaryValue('*', previous(scope), right(scope));
      } else {
        break;
      }
    }
    return left;
  }

  function expression() {
    let left = multiplication();
    while (peek().type === '+' || peek().type === '-') {
      const operator = take(peek().type).type;
      const right = multiplication();
      const previous = left;
      left = (scope) => binaryValue(operator, previous(scope), right(scope));
    }
    return left;
  }

  const evaluateRaw = expression();
  if (peek().type !== 'end') throw new Error(`Unexpected ${peek().value || peek().type}.`);

  return {
    variables,
    hasSteps,
    domainChecks,
    isContinuousBetween(first, second) {
      const middle = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
      return domainChecks.every((check) => {
        const values = [first, middle, second].map((scope) => check.evaluate(scope));
        if (!values.every(Number.isFinite)) return false;
        if (check.kind === 'positive') return values.every((v) => v > 0);
        return check.kind === 'step'
          ? values.every((v) => v === values[0])
          : values.every((v) => v !== 0 && Math.sign(v) === Math.sign(values[0]));
      });
    },
    evaluate(scope = {}) {
      const value = evaluateRaw(scope);
      return Number.isFinite(value) ? value : NaN;
    },
  };
}

// Estimate a one-sided limit from successive changes as the distance shrinks by ten.
// Extrapolating the remaining change also works for slowly closing roots and steep lines.
export function estimateSide(fn, x, dir, roundoff = 0) {
  const step = Math.max(1e-3, Math.abs(x) * Number.EPSILON * 1e6);
  const probes = Array.from({ length: 6 }, (_, i) => x + dir * step / 10 ** i);
  const values = probes.map(fn);
  if (values.every((v) => !Number.isFinite(v))) return null;
  const [a, b, c, d] = values.slice(-4);
  if (![a, b, c, d].every(Number.isFinite)) return { uncertain: true };
  if (c === d && b === c) return { value: d };
  // Secant slopes divide rounding error in the height by the probe distance.
  // If the estimates agree within that error, use a less cancellation-prone
  // sample instead of extrapolating from the closest, noisiest pair.
  const errorAt = (i) => roundoff * 10 ** i / step;
  if (roundoff && Math.abs(b - a) <= errorAt(3) &&
      Math.abs(c - b) <= errorAt(4) && Math.abs(d - c) <= errorAt(5)) {
    return { value: b };
  }
  const prev = c - b, last = d - c;
  const earlierRatio = prev / (b - a), ratio = last / prev;
  const [u, v, w] = probes.slice(-3);
  const prevSlope = prev / (v - u), lastSlope = last / (w - v);
  if (Math.abs(prevSlope - lastSlope) <= 1e-6 * Math.max(Math.abs(prevSlope), Math.abs(lastSlope))) {
    return { value: d - lastSlope * (w - x) };
  }
  if (ratio >= 0 && ratio < 0.97 && Math.abs(ratio - earlierRatio) < 0.08) {
    return { value: d + last * ratio / (1 - ratio) };
  }
  const scale = Math.max(Math.abs(b), Math.abs(c), Math.abs(d));
  if (Math.abs(last) <= scale * 1e-8 && Math.abs(prev) <= scale * 1e-8) return { value: d };
  if (ratio >= 0.98 && earlierRatio >= 0.98 && Math.sign(last) === Math.sign(d) &&
      Math.abs(last) > Math.abs(d) * 0.03) return { infinite: Math.sign(d) };
  return { uncertain: true };
}

function holeLimit(fn, x) {
  const left = estimateSide(fn, x, -1)?.value;
  const right = estimateSide(fn, x, 1)?.value;
  const d = Math.max(1e-5, Math.abs(x) * Number.EPSILON * 1000);
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    // A damped oscillation has no stable ratio between successive samples.
    // Compare its envelope at two distances and multiple offsets instead.
    const envelope = (radius) => Math.max(...[-1.63, -1, -0.71, 0.71, 1, 1.63]
      .map((m) => Math.abs(fn(x + m * radius))));
    const far = envelope(d * 100);
    const near = envelope(d);
    return Number.isFinite(far) && far > 0 && near < far / 16 && envelope(d / 10) < near / 2 ? 0 : null;
  }
  const scale = Math.max(Math.abs(left), Math.abs(right));
  const closest = Math.max(1e-8, Math.abs(x) * Number.EPSILON * 10);
  const probeScale = Math.max(Math.abs(fn(x - closest)), Math.abs(fn(x + closest)));
  if (Math.abs(left - right) > 1e-7 * scale + 8 * Number.EPSILON * probeScale) return null;
  return Number((left / 2 + right / 2).toPrecision(9));
}

export function compileEquation(value) {
  const cleaned = String(value || '')
    .trim()
    .replace(/^f\s*\(\s*x\s*\)\s*=/i, 'y=')
    .replace(/^g\s*\(\s*x\s*\)\s*=/i, 'y=');
  if (!cleaned) throw new Error('Enter an equation in x, such as y = x^2 - 4.');
  const pieces = cleaned.split('=');
  if (pieces.length > 2) throw new Error('Use only one equals sign.');
  if (pieces.length === 1) pieces.unshift('y');
  const [leftText, rightText] = pieces.map((p) => p.trim());
  if (!leftText || !rightText) throw new Error('Both sides of the equation are required.');

  const left = compileExpression(leftText);
  const right = compileExpression(rightText);
  const explicit =
    leftText.toLowerCase() === 'y' && !right.variables.has('y')
      ? right
      : rightText.toLowerCase() === 'y' && !left.variables.has('y')
        ? left
        : null;
  if (!explicit) {
    throw new Error('Enter an explicit function of x, such as y = x^2 - 4 or (x^2 - 4)/(x - 2).');
  }
  const functionText = explicit === right ? rightText : leftText;
  return {
    type: 'function',
    label: `y = ${functionText}`,
    equation: `y = ${functionText}`,
    variables: explicit.variables,
    hasSteps: explicit.hasSteps,
    domainChecks: explicit.domainChecks,
    isContinuousBetween(a, b) {
      return explicit.isContinuousBetween({ x: a, y: 0 }, { x: b, y: 0 });
    },
    yAt(x) {
      return explicit.evaluate({ x });
    },
    limitAt(x) {
      const direct = explicit.evaluate({ x });
      if (Number.isFinite(direct)) return { defined: true, y: direct };
      const y = holeLimit((v) => explicit.evaluate({ x: v }), x);
      return { defined: false, hole: y !== null, y: y ?? NaN };
    },
  };
}

function refineZeroOfFn(fn, left, right) {
  let a = left;
  let b = right;
  let fa = fn(a);
  const fb = fn(b);
  if (!Number.isFinite(fa) || !Number.isFinite(fb)) return null;
  if (fa === 0) return a;
  if (fb === 0) return b;
  if (Math.sign(fa) === Math.sign(fb)) return null;
  const linear = (a * fb - b * fa) / (fb - fa);
  if (linear > a && linear < b && fn(linear) === 0) return linear;
  const startScale = Math.max(Math.abs(fa), Math.abs(fb));
  let best = Math.abs(fa) < Math.abs(fb) ? a : b;
  let smallest = Math.min(Math.abs(fa), Math.abs(fb));
  for (let i = 0; i < 64; i += 1) {
    const mid = a + (b - a) / 2;
    if (mid === a || mid === b) break;
    const fm = fn(mid);
    if (!Number.isFinite(fm)) return null;
    if (fm === 0) return mid;
    if (Math.abs(fm) < smallest) {
      best = mid;
      smallest = Math.abs(fm);
    }
    if (Math.sign(fa) === Math.sign(fm)) {
      a = mid;
      fa = fm;
    } else {
      b = mid;
    }
  }
  // A change of sign across a jump or pole is not evidence of a root. The values
  // must also approach zero, even when the whole function is very small or large.
  const rounded = Number(best.toPrecision(10));
  if (rounded > left && rounded < right && fn(rounded) === 0) return rounded;
  return smallest / startScale < 1e-8 ? best : null;
}

function refineTouchOfFn(fn, left, center, right) {
  let lo = left;
  let hi = right;
  let best = center;
  let smallest = Math.abs(fn(center));
  for (let i = 0; smallest !== 0 && i < 96; i += 1) {
    const p = lo + (hi - lo) / 3;
    const q = hi - (hi - lo) / 3;
    if (p === lo || q === hi || p >= q) break;
    const yp = Math.abs(fn(p));
    const yq = Math.abs(fn(q));
    if (!Number.isFinite(yp) || !Number.isFinite(yq)) return null;
    if (yp < smallest || yq < smallest) {
      best = yp <= yq ? p : q;
      smallest = Math.min(yp, yq);
    }
    if (yp < yq) hi = q;
    else lo = p;
  }
  if (smallest === 0) return best;
  // A touching root may lie between two representable numbers (sin(x)^2 near pi).
  // Accept a nonzero minimum only if its residual is tiny compared with the values
  // a few representable x positions away. A small positive floor stays positive.
  const dx = Math.max(Number.MIN_VALUE, 8 * Number.EPSILON * Math.abs(best));
  const neighbours = [Math.abs(fn(best - dx)), Math.abs(fn(best + dx))];
  return neighbours.every((v) => Number.isFinite(v) && smallest < v / 16) ? best : null;
}

export function detectLandmarks(graph, boundary = 10, customPoints = []) {
  const landmarks = [];
  const addLandmark = (kind, x, y, label) => {
    if (!Number.isFinite(x) || Math.abs(x) > boundary + 1e-9) return;
    const cleanX = x;
    const cleanY = Number.isFinite(y) ? Number(y.toPrecision(10)) : null;
    const existing = landmarks.find((item) => Math.abs(item.x - cleanX) <= 1e-5 && item.kind === kind);
    if (existing) return;
    landmarks.push({ kind, x: cleanX, y: cleanY, label });
  };

  // 1. Detect holes and vertical asymptotes from denominator zeros.
  const steps = 800;
  const step = (boundary * 2) / steps;
  const xs = Array.from({ length: steps + 1 }, (_, i) => addCoordinate(-boundary, i * step));
  for (const check of graph.domainChecks || []) {
    if (!['zero', 'positive'].includes(check.kind)) continue;
    const evalDenom = (x) => check.evaluate({ x, y: 0 });
    const values = xs.map(evalDenom);
    if (!values.some((v) => Number.isFinite(v) && v !== 0)) continue;
    const addBreak = (x) => {
      const lim = graph.limitAt(x);
      // At an off-grid denominator zero, the closest representable x can
      // still evaluate. Probe both sides there as for an exact zero.
      const y = lim.defined ? holeLimit((v) => graph.yAt(v), x) : lim.hole ? lim.y : null;
      if (y !== null) {
        addLandmark('open-point', x, y, `Open point (hole) at (${formatNumber(x)}, ${formatNumber(y)})`);
      } else {
        const left = estimateSide((v) => graph.yAt(v), x, -1);
        const right = estimateSide((v) => graph.yAt(v), x, 1);
        if (left?.infinite || right?.infinite) {
          addLandmark('asymptote', x, null, `Vertical asymptote at x = ${formatNumber(x)}`);
        } else if (left?.value !== undefined && right?.value !== undefined) {
          addLandmark('jump', x, null, `Jump at x = ${formatNumber(x)}`);
        } else {
          addLandmark('asymptote', x, null, `Undefined at x = ${formatNumber(x)}`);
        }
      }
    };
    for (let i = 0; i <= steps; i += 1) {
      const [before, val, after] = [values[i - 1], values[i], values[i + 1]];
      if (!Number.isFinite(val)) continue;
      if (val === 0 && (before !== 0 || after !== 0)) addBreak(xs[i]);
      if (Number.isFinite(after) && val !== 0 && after !== 0 && Math.sign(val) !== Math.sign(after)) {
        const x = refineZeroOfFn(evalDenom, xs[i], xs[i + 1]);
        if (x !== null) addBreak(x);
      }
      // An even power such as (x-0.31)^2 has a zero without a change of sign.
      if (val !== 0 && Math.sign(val) === Math.sign(before) && Math.sign(val) === Math.sign(after) &&
          Math.abs(val) <= Math.abs(before) && Math.abs(val) <= Math.abs(after) &&
          (Math.abs(val) < Math.abs(before) || Math.abs(val) < Math.abs(after))) {
        const x = refineTouchOfFn(evalDenom, xs[i - 1], xs[i], xs[i + 1]);
        if (x !== null) addBreak(x);
      }
    }
  }

  // 2. Check Origin (0,0) and Y-intercept (x = 0)
  const atZero = graph.limitAt(0);
  if (atZero.defined) {
    if (atZero.y === 0) {
      addLandmark('origin', 0, 0, 'Origin (0, 0)');
    } else {
      addLandmark('y-axis', 0, atZero.y, `Y-axis crossing at (0, ${formatNumber(atZero.y)})`);
    }
  } else if (atZero.hole && atZero.y === 0) {
    addLandmark('origin', 0, 0, 'Origin (0, 0) (open hole)');
  }

  // 3. Sample for X-intercepts (roots) and Extrema (Peaks & Valleys)
  const samples = xs.map((x) => {
    const lim = graph.limitAt(x);
    return { x, y: lim.defined ? lim.y : lim.hole ? lim.y : NaN, defined: lim.defined };
  });

  const allZero = samples.every((s) => s.y === 0);
  if (!allZero && !graph.hasSteps) {
    const addRoot = (x) => {
      if (x !== 0) addLandmark('x-axis', x, 0, `X-axis root at (${formatNumber(x)}, 0)`);
    };
    for (let i = 0; i <= steps; i += 1) {
      const a = samples[i];
      const b = samples[i + 1];
      if (!a.defined) continue;
      if (a.y === 0 && samples[i - 1]?.y !== 0 && b?.y !== 0) addRoot(a.x);
      if (b?.defined && a.y !== 0 && b.y !== 0 && Math.sign(a.y) !== Math.sign(b.y) &&
          graph.isContinuousBetween(a.x, b.x)) {
        const rootX = refineZeroOfFn((x) => graph.yAt(x), a.x, b.x);
        if (rootX !== null) addRoot(rootX);
      }
    }

    for (let i = 1; i < steps; i += 1) {
      const prev = samples[i - 1];
      const curr = samples[i];
      const next = samples[i + 1];
      if (!Number.isFinite(prev.y) || !Number.isFinite(curr.y) || !Number.isFinite(next.y)) continue;
      const isMin = curr.y < prev.y && curr.y < next.y;
      const isMax = curr.y > prev.y && curr.y > next.y;
      if (!isMin && !isMax) continue;
      // A peak or valley must lie on one continuous piece. Across a pole the
      // samples only look like a turn (tan(x), 1/(x-a)); that is not an extremum.
      if (!graph.isContinuousBetween(prev.x, curr.x) || !graph.isContinuousBetween(curr.x, next.x)) continue;
      if (landmarks.some((l) => ['open-point', 'asymptote', 'jump'].includes(l.kind) && l.x >= prev.x && l.x <= next.x)) continue;

      let lo = prev.x;
      let hi = next.x;
      const evalY = (x) => {
        const lim = graph.limitAt(x);
        return lim.defined || lim.hole ? lim.y : NaN;
      };
      for (let iter = 0; iter < 48; iter += 1) {
        const p = lo + (hi - lo) / 3;
        const q = hi - (hi - lo) / 3;
        const yp = evalY(p);
        const yq = evalY(q);
        if (!Number.isFinite(yp) || !Number.isFinite(yq)) break;
        if (isMin ? yp < yq : yp > yq) hi = q;
        else lo = p;
      }
      let rx = (lo + hi) / 2;
      let ry = evalY(rx);
      // Ternary search on a flat top stops a few nanounits away from the
      // true turning point (x^2 gives x = 7e-12). Prefer a rounded x when it
      // is at least as extreme, so the user hears "(0, 0)" not "(7.03e-12, 0)".
      const rounded = Number(rx.toFixed(Math.max(0, 6 - Math.ceil(Math.log10(boundary + 1)))));
      const roundedY = evalY(rounded);
      if (Number.isFinite(roundedY) && (isMin ? roundedY <= ry : roundedY >= ry)) {
        rx = rounded;
        ry = roundedY;
      }
      // Reject a value that explodes inside one sampling step: a pole hiding
      // between samples (1/(x-a)^2 with a off the grid) is not a peak.
      const neighbourScale = Math.max(Math.abs(prev.y), Math.abs(curr.y), Math.abs(next.y), 1);
      if (Number.isFinite(ry) && Math.abs(ry) <= neighbourScale * 1e4) {
        // Verify slope actually changes sign across rx
        const leftSlope = evalY(rx) - evalY(rx - step * 0.5);
        const rightSlope = evalY(rx + step * 0.5) - evalY(rx);
        if (Number.isFinite(leftSlope) && Number.isFinite(rightSlope) && Math.sign(leftSlope) !== Math.sign(rightSlope)) {
          addLandmark(
            isMax ? 'maximum' : 'minimum',
            rx,
            ry,
            `${isMax ? 'Peak (local max)' : 'Valley (local min)'} at (${formatNumber(rx)}, ${formatNumber(ry)})`
          );
          const scale = Math.max(Math.abs(prev.y), Math.abs(next.y));
          if (ry === 0 && Number.isFinite(graph.yAt(rx))) addRoot(rx);
          else if (Math.abs(ry) < scale / 100) {
            const x = refineTouchOfFn((x) => graph.yAt(x), prev.x, rx, next.x);
            if (x !== null) addRoot(x);
          }
        }
      }
    }
  }

  // 4. Add custom solid points and open points
  for (const pt of customPoints) {
    if (!pt || !Number.isFinite(pt.x)) continue;
    const lim = graph.limitAt(pt.x);
    const py = Number.isFinite(pt.y) ? pt.y : lim.y;
    const kind = pt.kind === 'open-point' ? 'open-point' : 'solid-point';
    addLandmark(
      kind,
      pt.x,
      py,
      `${kind === 'open-point' ? 'Open point (hole)' : 'Solid point'} at (${formatNumber(pt.x)}, ${formatNumber(py)})`
    );
  }

  return landmarks.sort((a, b) => a.x - b.x);
}

export function findStepEvents(landmarks, fromX, toX) {
  const eps = 1e-5;
  const lo = Math.min(fromX, toX);
  const hi = Math.max(fromX, toX);
  const passedOver = [];
  const landedOn = [];

  for (const item of landmarks) {
    if (Math.abs(item.x - toX) <= eps) {
      landedOn.push(item);
    } else if (item.x > lo + eps && item.x < hi - eps) {
      passedOver.push(item);
    }
  }

  if (toX < fromX) {
    passedOver.reverse();
  }
  return { passedOver, landedOn };
}

export function sampleFunctionPath(graph, boundary = 10, count = 320) {
  const segments = [];
  let current = [];
  const step = (boundary * 2) / count;
  for (let i = 0; i <= count; i += 1) {
    const x = addCoordinate(-boundary, i * step);
    const y = graph.yAt(x);
    if (Number.isFinite(y) && Math.abs(y) <= boundary * 1.5) {
      if (current.length > 0 && !graph.isContinuousBetween(current.at(-1).x, x)) {
        if (current.length > 1) segments.push(current);
        current = [];
      }
      current.push({ x, y });
    } else {
      if (current.length > 1) segments.push(current);
      current = [];
    }
  }
  if (current.length > 1) segments.push(current);
  return segments;
}
