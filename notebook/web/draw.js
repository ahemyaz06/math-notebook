// A graph drawn by hand: points put down with the keyboard, joined by straight lines or
// smooth curves. Rules, not guesses: every height is calculated from the points, and a
// change that would stop the drawing being a function of x is refused with the reason.
//
// drawing = { pieces: [ { points: [ { x, y, smooth?, open? } ] } ] }
//   A piece is one unbroken part of the graph, its points in order of x.
//   smooth: the curve passes through this point without a corner.
//   open:   an open dot: the curve comes to this height, but the point is not on the graph.
//
// Smooth parts are monotone cubic curves (Fritsch-Carlson): between two points the curve
// only rises or only falls, so every peak and valley is exactly at a point that was put
// down, never somewhere in between. A point with a corner on one side and a smooth point on
// the other gives a parabola, so corner, smooth, corner draws a true parabola.

const EPS = 1e-9;
const same = (a, b) => Math.abs(a - b) < EPS;
const num = (v) => String(Number(v.toFixed(4))).replace('-', 'minus ');
const at = (p) => `${num(p.x)}, ${num(p.y)}`;

export const emptyDrawing = () => ({ pieces: [] });
export function cloneDrawing(d) {
  return { pieces: (d?.pieces || []).map((p) => ({ points: p.points.map((q) => ({ ...q })) })) };
}
const sorted = (d) => { d.pieces.sort((a, b) => a.points[0].x - b.points[0].x || a.points.length - b.points.length); return d; };
const lo = (piece) => piece.points[0].x;
const hi = (piece) => piece.points.at(-1).x;

// The point at exactly (x, y), as { piece, point } (indexes), or null.
export function pointAt(d, x, y) {
  for (let i = 0; i < (d?.pieces || []).length; i += 1) {
    const j = d.pieces[i].points.findIndex((q) => same(q.x, x) && same(q.y, y));
    if (j >= 0) return { piece: i, point: j };
  }
  return null;
}

// The piece whose stretch of x holds this x (ends included): its index, or -1.
export function pieceAt(d, x, skipSingle = true) {
  return (d?.pieces || []).findIndex((p) => (!skipSingle || p.points.length > 1) && x >= lo(p) - EPS && x <= hi(p) + EPS);
}

// ---------- is it still a function? ----------

// The first thing wrong with a drawing, in words, or null when it is a function of x.
export function problem(d) {
  for (const piece of d.pieces) {
    for (let i = 1; i < piece.points.length; i += 1) {
      const a = piece.points[i - 1], b = piece.points[i];
      if (same(a.x, b.x)) return `two points at x = ${num(a.x)}, one above the other. A function has only one height at each x, so the line between them would be vertical`;
      if (b.x < a.x) return 'the points of a piece must go from left to right';
    }
  }
  for (let i = 0; i < d.pieces.length; i += 1) {
    for (let j = i + 1; j < d.pieces.length; j += 1) {
      const a = d.pieces[i], b = d.pieces[j];
      // Two stretches of curve over the same x.
      if (a.points.length > 1 && b.points.length > 1 && Math.max(lo(a), lo(b)) < Math.min(hi(a), hi(b)) - EPS) {
        return `two parts of the graph over the same x, from ${num(Math.max(lo(a), lo(b)))} to ${num(Math.min(hi(a), hi(b)))}. A function has only one height at each x`;
      }
      // A single dot over or under another piece: only where that piece has an open dot.
      for (const [dot, other] of [[a, b], [b, a]]) {
        if (dot.points.length !== 1 || other.points.length < 2) continue;
        const x = dot.points[0].x;
        if (x <= lo(other) + EPS || x >= hi(other) - EPS) continue;
        const under = other.points.find((q) => same(q.x, x));
        if (!under || !under.open) return `the graph already has a height at x = ${num(x)}. A function has only one height at each x`;
      }
    }
  }
  // At each x where pieces meet: one solid dot at most, and no more than two pieces.
  const ends = new Map();
  for (const piece of d.pieces) {
    for (const q of piece.points.length === 1 ? piece.points : [piece.points[0], piece.points.at(-1)]) {
      const key = Number(q.x.toFixed(9));
      ends.set(key, [...(ends.get(key) || []), q]);
    }
  }
  for (const [x, list] of ends) {
    if (list.length > 2) return `more than two parts of the graph meet at x = ${num(x)}`;
    const solid = list.filter((q) => !q.open);
    if (solid.length > 1 && !same(solid[0].y, solid[1].y)) return `two solid dots at x = ${num(x)}, at heights ${num(solid[0].y)} and ${num(solid[1].y)}. A function has only one value at each x: one of them must be an open dot`;
    if (list.length === 2 && same(list[0].y, list[1].y)) return `two pieces already meet at ${at(list[0])}`;
  }
  return null;
}

const refuse = (reason) => ({ ok: false, reason });
const accept = (drawing, more = {}) => {
  const wrong = problem(drawing);
  return wrong ? refuse(wrong) : { ok: true, drawing, ...more };
};
const find = (drawing, q) => pointAt(drawing, q.x, q.y);

// ---------- changes; each returns { ok, drawing, ... } or { ok: false, reason } ----------

// Enter: a point at (x, y). Inside a piece's stretch it bends that piece there; outside
// every piece it carries the active piece on to this point; with nothing drawn it starts
// the first piece.
export function addPoint(source, active, x, y, smooth = false) {
  const d = cloneDrawing(source);
  const q = { x, y, ...(smooth ? { smooth: true } : {}) };
  const inside = pieceAt(d, x);
  if (inside >= 0) {
    const piece = d.pieces[inside];
    const there = piece.points.find((p) => same(p.x, x));
    if (there) return refuse(`there is already a point at x = ${num(x)}, at height ${num(there.y)}. A function has only one height at each x. Move left or right, or move that point instead`);
    piece.points.push(q);
    piece.points.sort((a, b) => a.x - b.x);
    return accept(d, { ...find(d, q), how: 'bend' });
  }
  const piece = d.pieces[active];
  if (!piece) {
    d.pieces.push({ points: [q] });
    sorted(d);
    return accept(d, { ...find(d, q), how: 'start' });
  }
  // Another piece between the active piece and here is in the way.
  const right = x > hi(piece);
  const between = d.pieces.find((p) => p !== piece && (right ? lo(p) >= hi(piece) - EPS && lo(p) < x : hi(p) <= lo(piece) + EPS && hi(p) > x));
  if (between) return refuse(`another piece of the graph, from x = ${num(lo(between))} to ${num(hi(between))}, lies between. Connect the pieces from the menu, or start a new piece here`);
  // An open end that gets a neighbour becomes a hole in the middle; that is kept.
  if (right) piece.points.push(q); else piece.points.unshift(q);
  sorted(d);
  return accept(d, { ...find(d, q), how: 'extend' });
}

// A new piece that starts with one point at (x, y). Where another piece ends at this x
// with a solid dot, the new point starts as an open dot (a jump has one value).
export function startPiece(source, x, y) {
  const d = cloneDrawing(source);
  const q = { x, y };
  for (const p of d.pieces) {
    const ends = p.points.length === 1 ? p.points : [p.points[0], p.points.at(-1)];
    if (ends.some((e) => same(e.x, x) && !e.open)) q.open = true;
  }
  d.pieces.push({ points: [q] });
  sorted(d);
  return accept(d, { ...find(d, q), how: 'start' });
}

// A point moved to (x, y). It stays between its neighbours.
export function movePoint(source, pi, qi, x, y) {
  const d = cloneDrawing(source);
  const pts = d.pieces[pi]?.points;
  const q = pts?.[qi];
  if (!q) return refuse('there is no point here');
  const before = pts[qi - 1], after = pts[qi + 1];
  if (before && x <= before.x + EPS) return refuse(`the point cannot pass the point before it, at x = ${num(before.x)}`);
  if (after && x >= after.x - EPS) return refuse(`the point cannot pass the point after it, at x = ${num(after.x)}`);
  q.x = x; q.y = y;
  sorted(d);
  return accept(d, find(d, q));
}

export function deletePoint(source, pi, qi) {
  const d = cloneDrawing(source);
  const pts = d.pieces[pi]?.points;
  if (!pts?.[qi]) return refuse('there is no point here');
  pts.splice(qi, 1);
  if (!pts.length) d.pieces.splice(pi, 1);
  return accept(d, { piece: pts.length ? pi : -1 });
}

// Smooth curve or sharp corner at a point in the middle of a piece.
export function toggleSmooth(source, pi, qi) {
  const d = cloneDrawing(source);
  const pts = d.pieces[pi]?.points;
  if (!pts?.[qi]) return refuse('there is no point here');
  if (qi === 0 || qi === pts.length - 1) return refuse('this is an end of the piece. Smooth or sharp is for a point with the curve on both sides');
  if (pts[qi].smooth) delete pts[qi].smooth; else pts[qi].smooth = true;
  return accept(d, { piece: pi, point: qi, smooth: Boolean(pts[qi].smooth) });
}

// Open dot or solid dot. Making a dot solid where another piece has its solid dot at the
// same x makes that one open, since the function has one value there.
export function toggleOpen(source, pi, qi) {
  const d = cloneDrawing(source);
  const q = d.pieces[pi]?.points[qi];
  if (!q) return refuse('there is no point here');
  let swapped = null;
  if (q.open) {
    delete q.open;
    for (const p of d.pieces) for (const other of p.points) {
      if (other !== q && same(other.x, q.x) && !other.open && !same(other.y, q.y)) { other.open = true; swapped = { x: other.x, y: other.y }; }
    }
  } else q.open = true;
  return accept(d, { piece: pi, point: qi, open: Boolean(q.open), swapped });
}

// Piece pi joined to the piece after it by a line (or curve) between their ends.
export function connect(source, pi) {
  const d = cloneDrawing(source);
  const a = d.pieces[pi], b = d.pieces[pi + 1];
  if (!a || !b) return refuse('there is no piece after this one to connect to');
  const end = a.points.at(-1), start = b.points[0];
  if (same(end.x, start.x) && !same(end.y, start.y)) {
    return refuse(`the two pieces meet at x = ${num(end.x)} at different heights: that is a jump. A line joining them would be vertical, and a function cannot have one`);
  }
  if (start.x < end.x - EPS) return refuse('the next piece starts before this one ends');
  delete end.open; delete start.open;
  const joined = same(end.x, start.x) ? [...a.points, ...b.points.slice(1)] : [...a.points, ...b.points];
  d.pieces.splice(pi, 2, { points: joined });
  return accept(d, { piece: pi, from: { x: end.x, y: end.y }, to: { x: start.x, y: start.y } });
}

// ---------- the function a drawing is ----------

const clamp = (slope, secant) => (secant === 0 || slope * secant <= 0 ? 0 : Math.abs(slope) > 3 * Math.abs(secant) ? 3 * secant : slope);

// The parts between neighbouring points: y = c0 + c1 t + c2 t^2 + c3 t^3, t = x - x0.
function partsOf(pts) {
  const n = pts.length;
  if (n < 2) return [];
  const h = [], m = [];
  for (let i = 0; i < n - 1; i += 1) { h.push(pts[i + 1].x - pts[i].x); m.push((pts[i + 1].y - pts[i].y) / h[i]); }
  // The one slope at a smooth point: 0 at a peak or a valley, otherwise between the two sides'.
  const shared = pts.map((p, i) => {
    if (!p.smooth || i === 0 || i === n - 1) return null;
    if (m[i - 1] * m[i] <= 0) return 0;
    const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1];
    return (w1 + w2) / (w1 / m[i - 1] + w2 / m[i]);
  });
  return m.map((secant, i) => {
    let d0 = shared[i], d1 = shared[i + 1];
    if (d0 === null && d1 === null) { d0 = secant; d1 = secant; } // a straight line
    else if (d0 === null) d0 = clamp(2 * secant - d1, secant); // a parabola into the smooth point
    else if (d1 === null) d1 = clamp(2 * secant - d0, secant);
    const c2 = (3 * secant - 2 * d0 - d1) / h[i], c3 = (d0 + d1 - 2 * secant) / (h[i] * h[i]);
    const tidy = (v) => (Math.abs(v) < 1e-12 ? 0 : v);
    return { x0: pts[i].x, x1: pts[i + 1].x, y0: pts[i].y, y1: pts[i + 1].y, d0, d1, secant, c: [pts[i].y, d0, tidy(c2), tidy(c3)] };
  });
}
const valueOn = (part, x) => { const t = x - part.x0; return part.c[0] + t * (part.c[1] + t * (part.c[2] + t * part.c[3])); };

// The part as y = A x^3 + B x^2 + C x + D, in words and plain text.
function formulaOf(part) {
  const [c0, c1, c2, c3] = part.c, a = part.x0;
  const coef = [c3, c2 - 3 * c3 * a, c1 - 2 * c2 * a + 3 * c3 * a * a, c0 - c1 * a + c2 * a * a - c3 * a * a * a].map((v) => Number(v.toFixed(4)) || 0);
  const names = ['x^3', 'x^2', 'x', ''];
  let text = '';
  coef.forEach((v, i) => {
    if (v === 0) return;
    const size = Math.abs(v), body = `${size === 1 && names[i] ? '' : size}${names[i]}`;
    text += text ? ` ${v < 0 ? '-' : '+'} ${body}` : `${v < 0 ? '-' : ''}${body}`;
  });
  const kind = coef[0] ? 'a cubic curve' : coef[1] ? 'a parabola' : coef[2] ? 'a straight line' : 'a flat line';
  return { kind, text: `y = ${text || '0'}`, from: part.x0, to: part.x1, slope: coef[0] || coef[1] ? null : coef[2] };
}

// What graph mode needs to trace, play and describe the drawing (the same shape as a graph
// read from a PDF: limitAt, piece, landmarks), with exact numbers.
export function drawnFunction(drawing, label = 'your drawing') {
  const pieces = cloneDrawing(drawing).pieces.filter((p) => p.points.length).map((p) => ({ points: p.points, parts: partsOf(p.points) }));
  const all = pieces.flatMap((p) => p.points);
  const holding = (x) => pieces.filter((p) => x >= lo(p) - EPS && x <= hi(p) + EPS);
  const limitAt = (x) => {
    const here = holding(x);
    if (!here.length) return { defined: false, hole: false, y: NaN };
    const points = here.map((p) => p.points.find((q) => same(q.x, x))).filter(Boolean);
    const solid = points.find((q) => !q.open);
    if (solid) return { defined: true, y: solid.y };
    if (points.length) {
      // Only open dots here. A hole when the curve comes to one height from both sides.
      const p = here[0], q = points[0], inner = here.length === 1 && q !== p.points[0] && q !== p.points.at(-1);
      const meet = here.length === 2 && points.length === 2 && same(points[0].y, points[1].y);
      return inner || meet ? { defined: false, hole: true, y: q.y } : { defined: false, hole: false, y: NaN };
    }
    const part = here[0].parts.find((s) => x >= s.x0 && x <= s.x1);
    return part ? { defined: true, y: valueOn(part, x) } : { defined: false, hole: false, y: NaN };
  };
  const partAt = (x) => { for (const p of pieces) { const s = p.parts.find((t) => x >= t.x0 - EPS && x <= t.x1 + EPS); if (s) return s; } return null; };

  function landmarks() {
    const out = [];
    const root = (x, touches) => out.push({ kind: same(x, 0) ? 'origin' : 'x-axis', x: same(x, 0) ? 0 : x, y: 0, touches });
    for (const p of pieces) {
      const pts = p.points, n = pts.length;
      pts.forEach((q, i) => {
        const before = p.parts[i - 1], after = p.parts[i];
        const end = i === 0 || i === n - 1;
        const shared = pieces.some((o) => o !== p && o.points.some((r) => same(r.x, q.x)));
        // Ends, unless another piece meets this one here (that is a jump or a join, said by its dots).
        if (end && n > 1 && !shared) out.push({ kind: 'endpoint', x: q.x, y: q.y, included: !q.open, side: i === 0 ? 'start' : 'end' });
        if (!end && !q.open && before.secant > 0 && after.secant < 0) out.push({ kind: 'maximum', x: q.x, y: q.y });
        if (!end && !q.open && before.secant < 0 && after.secant > 0) out.push({ kind: 'minimum', x: q.x, y: q.y });
        if (!end && Math.abs(before.d1 - after.d0) > 1e-9) out.push({ kind: 'corner', shape: 'sharp corner', x: q.x, y: q.y, slopeLeft: Number(before.d1.toPrecision(6)), slopeRight: Number(after.d0.toPrecision(6)) });
        // On the x-axis (not along a flat stretch lying on it).
        const flat = [before, after].some((s) => s && s.y0 === 0 && s.y1 === 0);
        if (q.y === 0 && !q.open && !flat) root(q.x, Boolean(!end && before.secant * after.secant < 0));
      });
      // Crossings between points: each part only rises or only falls, so one at most.
      for (const s of p.parts) {
        if (s.y0 * s.y1 >= 0) continue;
        let a = s.x0, b = s.x1;
        if (!s.c[2] && !s.c[3]) a = b = s.x0 - s.y0 / s.secant;
        for (let k = 0; k < 80 && b - a > 1e-13; k += 1) { const mid = (a + b) / 2; if (Math.sign(valueOn(s, mid)) === Math.sign(s.y0)) a = mid; else b = mid; }
        root(Number(((a + b) / 2).toPrecision(12)), false);
      }
    }
    const zero = limitAt(0);
    if (zero.defined && zero.y !== 0) out.push({ kind: 'y-axis', x: 0, y: zero.y });
    return out.sort((a, b) => a.x - b.x);
  }

  // The dots a helper sees and graph mode sounds: open dots, single points, and both ends
  // where two pieces meet at one x (a jump).
  function dots() {
    const out = [];
    for (const p of pieces) {
      p.points.forEach((q, i) => {
        const end = i === 0 || i === p.points.length - 1;
        const others = all.filter((r) => r !== q && same(r.x, q.x));
        if (!q.open && p.points.length > 1 && !others.length) return;
        const jump = others.some((r) => !same(r.y, q.y)) && end && p.points.length > 1 && others.length === 1 && holding(q.x).filter((o) => o.points.length > 1).length === 2;
        out.push({ kind: q.open ? 'open dot' : 'solid dot', x: q.x, y: q.y, jump, hole: q.open && !end, single: p.points.length === 1,
          away: !q.open && p.points.length === 1 && others.some((r) => r.open) });
      });
    }
    return out;
  }

  return {
    drawn: true, exact: true, label,
    // For its derivative: every part as a polynomial, and where the drawing can have a slope
    // at a point between two parts (a solid point inside a piece, not an end or a jump).
    segs: pieces.flatMap((p) => p.parts.map((s) => ({ x0: s.x0, x1: s.x1, c: s.c }))),
    solidAt: (x) => pieces.some((p) => p.points.some((q, i) => same(q.x, x) && i > 0 && i < p.points.length - 1 && !q.open)),
    lo: all.length ? Math.min(...all.map((q) => q.x)) : 0, hi: all.length ? Math.max(...all.map((q) => q.x)) : 0,
    piece(x) { return pieces.findIndex((p) => p.points.length > 1 && x >= lo(p) - EPS && x <= hi(p) + EPS); },
    limitAt, landmarks, dots,
    formulaAt(x) { const s = partAt(x); return s ? formulaOf(s) : null; },
    // The whole drawing as formulas, left to right: neighbouring parts with the same formula
    // (points along one line, the two halves of a parabola) are one.
    formulas() {
      return pieces.flatMap((p) => {
        const out = [];
        for (const s of p.parts) {
          const f = formulaOf(s);
          if (out.at(-1)?.text === f.text) out.at(-1).to = f.to; else out.push(f);
        }
        return out;
      });
    },
    slopesAt(pi, qi) { const p = pieces[pi]; return p ? { left: p.parts[qi - 1]?.d1 ?? null, right: p.parts[qi]?.d0 ?? null } : { left: null, right: null }; },
  };
}

// ---------- several drawn functions on one graph, and their derivatives ----------

// A graph's drawn functions: [{ name, pieces, derivative? }]. (The first prototype kept one,
// as graph.drawing.) derivative: 1 shows f', 2 shows f' and f''.
export function drawingsOf(graph) {
  if (Array.isArray(graph?.drawings)) return graph.drawings;
  return graph?.drawing ? [{ name: 'f', pieces: graph.drawing.pieces || [] }] : [];
}

// The next free letter for a drawn function: f, g, h, then p, q, r ...
export function nextName(taken) {
  return [...'fghpqrsuvw'].find((n) => !taken.includes(n)) || `f${taken.length + 1}`;
}

// The derivative of a drawing (or of its derivative): exact, since every part is a polynomial.
// A straight part gives a flat stretch at its slope. At a sharp corner the two sides have
// different slopes, so the derivative jumps and has no value there: two open dots. It has no
// value at the ends of a piece either (a slope needs the curve on both sides).
export function derivativeOf(f, label) {
  const segs = f.segs.map((s) => ({ x0: s.x0, x1: s.x1, c: [s.c[1], 2 * s.c[2], 3 * s.c[3], 0] })).sort((a, b) => a.x0 - b.x0);
  const value = (s, x) => { const v = valueOn(s, x); return Math.abs(v) < 1e-12 ? 0 : Number(v.toPrecision(12)); };
  // What happens at x where parts end: the heights on each side, and whether there is a value.
  const knot = (x) => {
    const left = segs.find((s) => same(s.x1, x)), right = segs.find((s) => same(s.x0, x));
    if (!left && !right) return null;
    const l = left ? value(left, left.x1) : null, r = right ? value(right, right.x0) : null;
    const meets = left && right && Math.abs(l - r) < 1e-9;
    return { x, l, r, meets, defined: Boolean(meets && f.solidAt(x)) };
  };
  const knots = [...new Set(segs.flatMap((s) => [s.x0, s.x1]))].sort((a, b) => a - b).map(knot);
  const inside = (x) => segs.find((s) => x > s.x0 + EPS && x < s.x1 - EPS);
  const limitAt = (x) => {
    const s = inside(x);
    if (s) return { defined: true, y: value(s, x) };
    const k = knots.find((o) => same(o.x, x));
    if (!k) return { defined: false, hole: false, y: NaN };
    if (k.defined) return { defined: true, y: k.r };
    return k.meets ? { defined: false, hole: true, y: k.r } : { defined: false, hole: false, y: NaN };
  };
  // Unbroken stretches, so the picture lifts its pen at a jump.
  const runs = [];
  segs.forEach((s, i) => { const k = knots.find((o) => same(o.x, s.x0)); runs.push(i && k.meets ? runs[i - 1] : (runs[i - 1] ?? -1) + 1); });

  function landmarks() {
    const out = [];
    const root = (x, touches) => out.push({ kind: same(x, 0) ? 'origin' : 'x-axis', x: same(x, 0) ? 0 : x, y: 0, touches });
    const tidy = (x) => Number(x.toPrecision(12));
    for (const s of segs) {
      const N = 48, xs = Array.from({ length: N - 1 }, (_, i) => s.x0 + ((s.x1 - s.x0) * (i + 1)) / N), ys = xs.map((x) => valueOn(s, x));
      if (ys.every((v) => Math.abs(v) < 1e-12)) continue; // lying on the x-axis: no single crossing
      for (let i = 0; i < ys.length; i += 1) {
        const a = ys[i], b = ys[i + 1];
        if (Math.abs(a) < 1e-12 && Math.abs(ys[i - 1] ?? 1) > 1e-12) root(tidy(xs[i]), Math.sign(ys[i - 1] ?? 0) === Math.sign(b ?? 0));
        if (b !== undefined && Math.abs(a) >= 1e-12 && Math.abs(b) >= 1e-12 && Math.sign(a) !== Math.sign(b)) {
          let lo2 = xs[i], hi2 = xs[i + 1];
          for (let n = 0; n < 80; n += 1) { const mid = (lo2 + hi2) / 2; if (Math.sign(valueOn(s, mid)) === Math.sign(a)) lo2 = mid; else hi2 = mid; }
          root(tidy((lo2 + hi2) / 2), false);
        }
        // A turn inside the part (the derivative of a cubic part is a parabola).
        const p = ys[i - 1];
        if (p !== undefined && b !== undefined && ((a > p && a > b) || (a < p && a < b))) {
          const peak = a > p;
          let lo2 = xs[i - 1], hi2 = xs[i + 1];
          for (let n = 0; n < 60; n += 1) { const u = lo2 + (hi2 - lo2) / 3, v = hi2 - (hi2 - lo2) / 3; if ((valueOn(s, u) > valueOn(s, v)) === peak) hi2 = v; else lo2 = u; }
          const x = Number(((lo2 + hi2) / 2).toPrecision(9));
          out.push({ kind: peak ? 'maximum' : 'minimum', x, y: value(s, x) });
        }
      }
    }
    knots.forEach((k, i) => {
      const first = i === 0 || k.l === null, last = k.r === null;
      if (first || last) { out.push({ kind: 'endpoint', x: k.x, y: first ? k.r : k.l, included: false, side: first ? 'start' : 'end' }); return; }
      if (!k.defined) return; // a jump or a hole: said by its dots
      const left = segs.find((s) => same(s.x1, k.x)), right = segs.find((s) => same(s.x0, k.x));
      const d = (right.x1 - right.x0) / 100, e = (left.x1 - left.x0) / 100;
      const before = valueOn(left, k.x - e) - k.r, after = valueOn(right, k.x + d) - k.r;
      if (before < -1e-12 && after < -1e-12) out.push({ kind: 'maximum', x: k.x, y: k.r });
      if (before > 1e-12 && after > 1e-12) out.push({ kind: 'minimum', x: k.x, y: k.r });
      const slopeLeft = left.c[1] + 2 * left.c[2] * (left.x1 - left.x0), slopeRight = right.c[1];
      if (Math.abs(slopeLeft - slopeRight) > 1e-9) out.push({ kind: 'corner', shape: 'sharp corner', x: k.x, y: k.r, slopeLeft: Number(slopeLeft.toPrecision(6)), slopeRight: Number(slopeRight.toPrecision(6)) });
      if (k.r === 0 && (Math.abs(before) > 1e-12 || Math.abs(after) > 1e-12)) root(k.x, before * after > 0);
    });
    const zero = limitAt(0);
    if (zero.defined && zero.y !== 0) out.push({ kind: 'y-axis', x: 0, y: zero.y });
    return out.sort((a, b) => a.x - b.x);
  }

  // Open dots: both sides of every jump, every hole, and the two ends.
  function dots() {
    const out = [];
    for (const k of knots) {
      const dot = (y, more) => out.push({ kind: 'open dot', x: k.x, y, jump: false, hole: false, single: false, away: false, ...more });
      if (k.defined) continue;
      if (k.meets) dot(k.r, { hole: true });
      else if (k.l !== null && k.r !== null) { dot(k.l, { jump: true }); dot(k.r, { jump: true }); } else dot(k.l ?? k.r, {});
    }
    return out;
  }

  const formulas = () => {
    const out = [];
    segs.forEach((s, i) => {
      const g = formulaOf(s);
      if (i && runs[i] === runs[i - 1] && out.at(-1)?.text === g.text) out.at(-1).to = g.to; else out.push(g);
    });
    return out;
  };
  return {
    derived: true, exact: true, label,
    lo: segs.length ? segs[0].x0 : 0, hi: segs.length ? segs.at(-1).x1 : 0,
    piece(x) { const i = segs.findIndex((s) => x >= s.x0 - EPS && x <= s.x1 + EPS); return i < 0 ? -1 : runs[i]; },
    limitAt, landmarks, dots, formulas, segs,
    solidAt: (x) => limitAt(x).defined,
    formulaAt(x) { const s = segs.find((t) => x >= t.x0 - EPS && x <= t.x1 + EPS); return s ? formulaOf(s) : null; },
  };
}

// ---------- the numbers in an equation, to play with ----------

// Every number written in a plain-text function, in order: { value, start, end }. A
// negative number put in by changing one is written (-2), and read back as minus 2.
export function numbersIn(text) {
  const out = [];
  const pattern = /\(-(\d+(?:\.\d+)?)\)|\d+(?:\.\d+)?/g;
  for (let m = pattern.exec(text); m; m = pattern.exec(text)) {
    out.push({ value: m[1] !== undefined ? -Number(m[1]) : Number(m[0]), start: m.index, end: m.index + m[0].length });
  }
  return out;
}

// The same text with its n-th number changed to value.
export function setNumber(text, n, value) {
  const target = numbersIn(text)[n];
  if (!target) return text;
  const v = Number(value.toFixed(6)) || 0;
  return text.slice(0, target.start) + (v < 0 ? `(${v})` : String(v)) + text.slice(target.end);
}
