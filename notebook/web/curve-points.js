// A function kept as points: a curve read from a PDF's drawing (up to about 200 points for each
// piece, each rounded to 0.01) or a student copy's curve (600 points, with null where it breaks).
// Rules, not guesses: heights are the points joined by straight pieces; slopes come from a curve
// fitted through many points, so the rounding of one point does not decide the slope; a dot
// drawn at the end of a piece is that end; an open dot on the curve is a hole.

const EPS = 1e-9;

// The polynomial of this degree in (x - x0) that fits the points best (least squares):
// its coefficients [c0, c1, ...], so c0 is the height at x0 and c1 the slope there. null when
// the points do not decide it. x is scaled by the width of the points, for steady arithmetic.
export function fitPolynomial(pts, x0, degree) {
  const n = degree + 1;
  if (pts.length < n) return null;
  const w = Math.max(...pts.map((p) => Math.abs(p.x - x0))) || 1;
  const A = Array.from({ length: n }, () => new Array(n + 1).fill(0));
  for (const p of pts) {
    const t = (p.x - x0) / w, pow = [1];
    for (let k = 1; k <= 2 * degree; k += 1) pow.push(pow[k - 1] * t);
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) A[i][j] += pow[i + j];
      A[i][n] += pow[i] * p.y;
    }
  }
  for (let c = 0; c < n; c += 1) {
    let best = c;
    for (let r = c + 1; r < n; r += 1) if (Math.abs(A[r][c]) > Math.abs(A[best][c])) best = r;
    if (Math.abs(A[best][c]) < 1e-12) return null;
    [A[c], A[best]] = [A[best], A[c]];
    for (let r = 0; r < n; r += 1) {
      if (r === c) continue;
      const k = A[r][c] / A[c][c];
      for (let j = c; j <= n; j += 1) A[r][j] -= k * A[c][j];
    }
  }
  return A.map((row, i) => row[n] / row[i] / w ** i);
}

// How far the points are from a fitted polynomial, squared and added up.
function misfit(pts, x0, c) {
  let sum = 0;
  for (const p of pts) {
    let y = 0;
    for (let k = c.length - 1; k >= 0; k -= 1) y = y * (p.x - x0) + c[k];
    sum += (p.y - y) ** 2;
  }
  return sum;
}

// The size of the rounding in the points: 0.01 for a curve read from a PDF before November 2026
// (every number has two decimals), 0.0005 for one read since (four decimals, and the page's own
// numbers are about that exact), almost nothing for a student copy (seven digits).
function roundingOf(pts) {
  const decimals = (k) => pts.every((p) => Math.abs(p.x * k - Math.round(p.x * k)) < 1e-6 * k && Math.abs(p.y * k - Math.round(p.y * k)) < 1e-6 * k);
  return decimals(100) ? 0.01 : decimals(10000) ? 0.0005 : 1e-6 * Math.max(1, ...pts.map((p) => Math.abs(p.y)));
}

// The slope at x of a smooth run of points (numbers first to last of pts), or null.
//
// A curve is fitted through the points around x, and its slope at x is the answer. How many
// points, and which way round, is decided by the points themselves:
//   - the longest stretch that one smooth curve (a cubic) still fits to within the rounding of
//     the points. Too few points and the rounding decides the slope; too many and the curve
//     cannot follow (the slope of 1/(x - 2) at 2.2 was "minus 17", it is minus 25);
//   - y fitted along x, or x fitted along y (the slope is then one over that curve's slope).
//     Where a curve is steep its points are far apart in height and close in x, and x along y
//     is the surer; where it is flat only y along x can be used. The surer of the two is taken.
// Where x does not change with y at all, the curve goes straight up or down there (the start of
// a square root, which was "slope 1.9"): Infinity or minus Infinity.
function fittedSlope(piece, first, last, x) {
  const pts = piece.pts;
  let i = pts.findIndex((p) => p.x >= x - EPS);
  if (i < 0) i = pts.length - 1;
  i = Math.max(first, Math.min(last, i));
  const sigma = piece.rounding / Math.sqrt(12);
  const found = {};
  for (const way of ['yx', 'xy']) {
    let fallback = null;
    for (const half of [14, 10, 7, 5, 4, 3, 2]) {
      let a = Math.max(first, i - half), b = Math.min(last, i + half);
      if (b - a < 2 * half) { if (a === first) b = Math.min(last, a + 2 * half); else a = Math.max(first, b - 2 * half); }
      let some = pts.slice(a, b + 1);
      const n = some.length;
      if (n < 3) continue;
      let at = x;
      if (way === 'xy') {
        // x is a function of y only where the height keeps going one way.
        const dir = Math.sign(some.at(-1).y - some[0].y);
        if (!dir || !some.every((p, k) => k === 0 || (p.y - some[k - 1].y) * dir > 0)) continue;
        at = heightOn(piece, x);
        some = some.map((p) => ({ x: p.y, y: p.x }));
      }
      const degree = n >= 9 ? 3 : n >= 4 ? 2 : 1;
      const c = fitPolynomial(some, at, degree);
      if (!c) continue;
      const free = n - (degree + 1);
      const off = free > 0 ? Math.sqrt(misfit(some, at, c) / free) : 0;
      // Rounding in the other direction shows too, by as much as the curve is steep.
      const rough = sigma * Math.sqrt(1 + c[1] * c[1]);
      const lo = Math.min(...some.map((p) => p.x)), hi = Math.max(...some.map((p) => p.x));
      const atEdge = Math.min(at - lo, hi - at) < 0.15 * (hi - lo);
      const unsure = (Math.max(rough, off) * Math.sqrt(3) * (1 + degree) * (atEdge ? 3 : 1) * (free > 0 ? 1 : 3)) / (((hi - lo) / 2) * Math.sqrt(n));
      fallback = { c1: c[1], unsure, n, fits: false };
      if (off <= 2.2 * rough + 1e-12) { found[way] = { ...fallback, fits: true }; break; }
    }
    found[way] ||= fallback; // no stretch fits that well: the shortest one
  }
  const { yx, xy } = found;
  if (!yx && !xy) return null;
  // (Only when the curve fitted along y really fits: beside an asymptote none does, and the
  // slope there is steep but not straight down.)
  if (xy && xy.fits && xy.n >= 5 && Math.abs(xy.c1) <= 2.5 * xy.unsure && (!yx || Math.abs(yx.c1) >= 2)) {
    const a = pts[Math.max(first, i - 3)], b = pts[Math.min(last, i + 3)];
    return Math.sign(b.y - a.y) * Infinity;
  }
  // (How sure a slope is, as a part of itself: the same measure for both ways round. A slope
  // near 0 has no x along y to compare with.)
  const share = (f) => (f ? f.unsure / Math.max(Math.abs(f.c1), 1e-12) : Infinity);
  if (yx && (!xy || Math.abs(yx.c1) < 1 || share(yx) <= share(xy))) return yx.c1;
  return 1 / xy.c1;
}

// The sharp corners of a smooth curve kept as points (|x| printed as a curve): [{ x, y, left,
// right, before, after }]: where it is, the slope on each side of it, and the last point before
// it and the first after it. The corner is where the curves fitted to its two sides meet, which
// need not be one of the points (|sin x| at pi lies between two of them). A corner is a change of slope that happens all at one point: a straight
// run of points on each side fits well, and one curve through both sides does not. A curve that
// only bends quickly (near an asymptote) fits one curve as well as two.
function findCorners(pts, rounding) {
  const n = pts.length;
  const m = Math.max(4, Math.min(10, Math.round(n / 25)));
  if (n < 4 * m + 1) return [];
  const slopeOf = (from, to) => fitPolynomial(pts.slice(from, to + 1), pts[from].x, 1)?.[1] ?? NaN;
  const D = new Array(n).fill(NaN), left = new Array(n).fill(NaN), right = new Array(n).fill(NaN);
  for (let k = m; k < n - m; k += 1) { left[k] = slopeOf(k - m, k); right[k] = slopeOf(k, k + m); D[k] = right[k] - left[k]; }
  const found = [];
  for (let k = m; k < n - m; k += 1) {
    if (!Number.isFinite(D[k])) continue;
    // The change of slope here, beyond the steady bending of the curve on each side of it.
    const beside = [D[k - m], D[k + m]].filter(Number.isFinite);
    const jump = D[k] - (beside.length ? beside.reduce((a, b) => a + b, 0) / beside.length : 0);
    const steep = 1 + Math.abs(left[k]) + Math.abs(right[k]);
    const width = Math.min(pts[k].x - pts[k - m].x, pts[k + m].x - pts[k].x);
    const noise = (rounding * steep) / (width * Math.sqrt(m));
    // (The change must be here itself, not only missing beside a corner a few points away.)
    const least = Math.max(6 * noise, 0.06 * steep);
    if (!(Math.abs(jump) > least && Math.abs(D[k]) > least && Math.sign(jump) === Math.sign(D[k]))) continue;
    found.push({ k, jump: Math.min(Math.abs(jump), Math.abs(D[k])) });
  }
  // Of the places beside each other that see the same corner, the one that sees it most.
  const peaks = found.filter((c) => !found.some((o) => o !== c && Math.abs(o.k - c.k) <= m && (o.jump > c.jump || (o.jump === c.jump && o.k < c.k))));
  return peaks.filter(({ k }) => {
    const a = Math.max(0, k - 2 * m), b = Math.min(n - 1, k + 2 * m);
    const whole = pts.slice(a, b + 1), before = pts.slice(a, k + 1), after = pts.slice(k, b + 1);
    const one = fitPolynomial(whole, pts[k].x, 3);
    const two = [fitPolynomial(before, pts[k].x, 2), fitPolynomial(after, pts[k].x, 2)];
    if (!one || !two[0] || !two[1]) return false;
    const single = misfit(whole, pts[k].x, one);
    const double = misfit(before, pts[k].x, two[0]) + misfit(after, pts[k].x, two[1]);
    const steep = 1 + Math.abs(left[k]) + Math.abs(right[k]);
    const floor = whole.length * ((rounding * steep) / 3.5) ** 2; // what rounding alone leaves
    return single > 6 * Math.max(double, floor / 4) && single > 1.5 * floor;
  }).map(({ k }) => {
    // Each side's own curve, without the point at the corner; they meet at the corner.
    const x0 = pts[k].x;
    const L = fitPolynomial(pts.slice(Math.max(0, k - 2 * m), k), x0, 2), R = fitPolynomial(pts.slice(k + 1, Math.min(n, k + 2 * m + 1)), x0, 2);
    if (!L || !R) return { x: x0, y: pts[k].y, left: left[k], right: right[k], before: k - 1, after: k + 1 };
    const [c, b, a] = [L[0] - R[0], L[1] - R[1], L[2] - R[2]];
    const reach = Math.max(pts[k + 1].x - x0, x0 - pts[k - 1].x);
    const roots = Math.abs(a) < 1e-12 ? (Math.abs(b) < 1e-12 ? [] : [-c / b])
      : b * b - 4 * a * c < 0 ? [] : [(-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a), (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * a)];
    const t = roots.filter((r) => Math.abs(r) <= reach).sort((p, q) => Math.abs(p) - Math.abs(q))[0] ?? 0;
    // Within the rounding of the points of one of them, the corner is that point.
    const x = Math.abs(t) <= 1.5 * rounding ? x0 : x0 + t;
    const at = x - x0;
    return { x, y: at === 0 ? pts[k].y : L[0] + L[1] * at + L[2] * at * at, left: L[1] + 2 * L[2] * at, right: R[1] + 2 * R[2] * at,
      before: pts.findLastIndex((q) => q.x < x - EPS), after: pts.findIndex((q) => q.x > x + EPS) };
  });
}

// One unbroken piece: its points from left to right, and how to measure it.
function makePiece(points, smooth) {
  let pts = [...points].sort((a, b) => a.x - b.x);
  if (smooth) {
    // Points with the same x (a steep stretch after rounding, an arrow's tip added at the end)
    // are one point, at their middle height: a smooth curve has one height at each x.
    const merged = [];
    for (const p of pts) {
      const last = merged.at(-1);
      if (last && Math.abs(last.x - p.x) < EPS) { last.sum += p.y; last.count += 1; last.y = last.sum / last.count; } else merged.push({ x: p.x, y: p.y, sum: p.y, count: 1 });
    }
    pts = merged.map(({ x, y }) => ({ x, y }));
  }
  const rounding = roundingOf(pts);
  const piece = { pts, smooth, rounding, lo: pts[0].x, hi: pts.at(-1).x, corners: null };
  piece.cornerList = () => (piece.corners ||= smooth ? findCorners(pts, rounding)
    : pts.slice(1, -1).map((p, i) => ({ x: p.x, y: p.y, before: i, after: i + 2 })).filter((c) => c.x - pts[c.before].x > EPS && pts[c.after].x - c.x > EPS));
  return piece;
}

const has = (piece, x) => x >= piece.lo - EPS && x <= piece.hi + EPS;

function heightOn(piece, x) {
  const pts = piece.pts;
  if (pts.length === 1) return Math.abs(pts[0].x - x) < EPS ? pts[0].y : NaN;
  if (Math.abs(x - piece.lo) < EPS) return pts[0].y;
  if (Math.abs(x - piece.hi) < EPS) return pts.at(-1).y;
  const k = pts.findIndex((p) => p.x >= x);
  if (k <= 0) return pts[0].y;
  const a = pts[k - 1], b = pts[k];
  const y = b.x === a.x ? b.y : a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
  return Math.abs(y) < 1e-12 ? 0 : y; // what is left of arithmetic is not a height
}

// The slope of one piece at x from each side: { left, right }, null where the piece has no
// such side (its ends). Straight pieces: the piece's own slope. A smooth curve: the slope of
// the curve fitted through the points around x, never across a corner.
function slopesOn(piece, x) {
  const pts = piece.pts, n = pts.length;
  if (n < 2) return { left: null, right: null };
  const atStart = Math.abs(x - piece.lo) < EPS, atEnd = Math.abs(x - piece.hi) < EPS;
  if (!piece.smooth) {
    const chord = (i) => (pts[i + 1].y - pts[i].y) / (pts[i + 1].x - pts[i].x);
    const k = pts.findIndex((p) => Math.abs(p.x - x) < EPS);
    if (k >= 0) return { left: k > 0 ? chord(k - 1) : null, right: k < n - 1 ? chord(k) : null };
    const i = pts.findIndex((p, j) => j < n - 1 && x > p.x && x < pts[j + 1].x);
    return i < 0 ? { left: null, right: null } : { left: chord(i), right: chord(i) };
  }
  if (n === 2) { const m = (pts[1].y - pts[0].y) / (pts[1].x - pts[0].x); return { left: atStart ? null : m, right: atEnd ? null : m }; }
  const corners = piece.cornerList();
  // A corner is "here" within the rounding of the points (0.01 for a PDF's), or a small part of
  // the gap between them (a student copy's points are exact, its corners between two of them).
  const gap = (piece.hi - piece.lo) / (n - 1);
  const corner = corners.find((c) => Math.abs(c.x - x) <= Math.max(1.5 * piece.rounding, 0.05 * gap));
  if (corner) return { left: atStart ? null : corner.left, right: atEnd ? null : corner.right };
  // The stretch between corners (or ends) that x lies in, as point numbers.
  let first = 0, last = n - 1;
  for (const c of corners) { if (c.x < x && c.after > first) first = c.after; if (c.x > x && c.before < last) last = c.before; }
  const m = fittedSlope(piece, first, last, x);
  return { left: atStart ? null : m, right: atEnd ? null : m };
}

// curves: the records of one function's pieces (one curve, or several of one colour that follow
// each other along x). dots: the graph's dots. span: the graph's window. asymptotes: the x of
// dashed vertical lines and of asymptotes the record names.
export function pointsFunction(curves, dots = [], span = null, asymptotes = []) {
  const first = curves[0];
  const xSpan = span ? span.x[1] - span.x[0] : 10, ySpan = span ? span.y[1] - span.y[0] : 10;
  const sameColour = (d) => !d.color || !first.color || d.color === first.color;
  const mine = dots.filter(sameColour);
  const pieces = [];
  for (const curve of curves) {
    const smooth = curve.kind === 'curve' && !curve.corners;
    const segments = [[]];
    for (const p of curve.corners || curve.samples || []) {
      if (p === null) { if (segments.at(-1).length) segments.push([]); } else segments.at(-1).push({ x: p[0], y: p[1] });
    }
    for (const s of segments) if (s.length) pieces.push(makePiece(s, smooth));
  }
  pieces.sort((a, b) => a.lo - b.lo || a.hi - b.hi);
  // Ends with an arrow (the curve goes on past them). An arrow's tip that stops just short of
  // the edge of the graph (x = 4.99 where the grid ends at 5) is at the edge: the piece is
  // carried on along its own direction, so "x = 5" is on the curve.
  const arrows = [];
  for (const curve of curves) {
    for (const side of curve.continues || []) {
      const at = curve[side];
      if (!at) continue;
      const piece = pieces.find((p) => [p.pts[0], p.pts.at(-1)].some((q) => Math.abs(q.x - at[0]) < 0.011 && Math.abs(q.y - at[1]) < 0.011));
      if (!piece) continue;
      const start = Math.abs(piece.pts[0].x - at[0]) < 0.011 && Math.abs(piece.pts[0].y - at[1]) < 0.011;
      const pts = piece.pts, end = start ? pts[0] : pts.at(-1), inner = start ? pts[1] : pts.at(-2);
      const edge = span ? (start ? span.x[0] : span.x[1]) : NaN;
      if (inner && Number.isFinite(edge) && Math.abs(end.x - edge) > EPS && Math.abs(end.x - edge) <= 0.012 * xSpan && Math.abs(end.x - inner.x) > EPS) {
        const slope = (end.y - inner.y) / (end.x - inner.x);
        end.y = Math.round((end.y + slope * (edge - end.x)) * 100) / 100;
        end.x = edge;
        piece.lo = pts[0].x; piece.hi = pts.at(-1).x; piece.corners = null;
      }
      arrows.push({ x: end.x, y: end.y });
    }
  }
  // A dot drawn at the end of a piece is that end: the line is drawn up to the dot's edge, a
  // little short of its middle. (The piece then ends at the dot's own x and height.)
  const near = (p, d) => Math.hypot((p.x - d.coordinate[0]) / xSpan, (p.y - d.coordinate[1]) / ySpan) <= 0.016;
  for (const piece of pieces) {
    for (const end of [0, 1]) {
      const pts = piece.pts, p = end ? pts.at(-1) : pts[0];
      const dot = mine.filter((d) => near(p, d)).sort((a, b) => Math.hypot(p.x - a.coordinate[0], p.y - a.coordinate[1]) - Math.hypot(p.x - b.coordinate[0], p.y - b.coordinate[1]))[0];
      if (!dot) continue;
      const [dx, dy] = dot.coordinate;
      // Points of the line that lie on or past the dot's middle give way to the dot.
      while (pts.length > 1 && (end ? pts.at(-1).x >= dx - EPS : pts[0].x <= dx + EPS)) { if (end) pts.pop(); else pts.shift(); }
      if (end ? pts.at(-1).x >= dx - EPS : pts[0].x <= dx + EPS) pts[0] = { x: dx, y: dy };
      else if (end) pts.push({ x: dx, y: dy }); else pts.unshift({ x: dx, y: dy });
      piece.lo = pts[0].x; piece.hi = pts.at(-1).x; piece.corners = null;
    }
  }
  const lo = pieces[0]?.lo ?? 0, hi = Math.max(...pieces.map((p) => p.hi), lo);
  const yTol = Math.max(0.012 * ySpan, 0.03);
  const dotsAt = (x) => mine.filter((d) => Math.abs(d.coordinate[0] - x) < EPS);
  const isOpen = (d) => d.kind === 'open dot';

  // What the pieces and the dots say at x: the heights the pieces have there, with the dot on
  // each; the solid dot that is the value; whether the value is away from the curve.
  const read = (x) => {
    const here = pieces.filter((p) => has(p, x));
    const at = dotsAt(x);
    const heights = here.map((p) => {
      const y = heightOn(p, x);
      const dot = at.filter((d) => Math.abs(d.coordinate[1] - y) < yTol).sort((a, b) => Math.abs(a.coordinate[1] - y) - Math.abs(b.coordinate[1] - y))[0] || null;
      return { piece: p, y: dot ? dot.coordinate[1] : y, dot, end: Math.abs(x - p.lo) < EPS || Math.abs(x - p.hi) < EPS };
    });
    return { here, at, heights };
  };

  const limitAt = (x) => {
    const { at, heights } = read(x);
    if (!heights.length) return { defined: false, hole: false, y: NaN };
    const onSolid = heights.find((h) => h.dot && !isOpen(h.dot));
    if (onSolid) return { defined: true, y: onSolid.y };
    const closed = heights.filter((h) => !h.dot); // the curve is there, with no open dot on it
    // Every height the curve has here is an open dot: the value is a solid dot away from the
    // curve when one is drawn at this x, otherwise there is no point (a hole).
    if (!closed.length) {
      const away = at.find((d) => !isOpen(d));
      if (away) return { defined: true, y: away.coordinate[1], away: true };
      const ys = heights.map((h) => h.y);
      const one = Math.max(...ys) - Math.min(...ys) < yTol;
      return { defined: false, hole: one, y: one ? ys[0] : NaN };
    }
    return { defined: true, y: closed[0].y };
  };

  // The piece that lies on this side of x (dir -1: to the left), if x is on or at the end of one.
  const pieceBeside = (x, dir) => pieces.find((p) => (dir < 0 ? x > p.lo + EPS && x <= p.hi + EPS : x >= p.lo - EPS && x < p.hi - EPS));

  // An asymptote: the curve runs off the top or the bottom of the graph just beside a dashed
  // vertical line (or an asymptote the record names). Which way it goes on this side of x:
  // 1 up, -1 down, 0 when it is no asymptote here.
  const asymptoteSide = (x, dir) => {
    if (!asymptotes.some((a) => Math.abs(a - x) < 1e-6) || !span) return 0;
    const piece = pieces.filter((p) => (dir < 0 ? p.hi <= x + EPS && x - p.hi <= 0.08 * xSpan : p.lo >= x - EPS && p.lo - x <= 0.08 * xSpan))
      .sort((a, b) => (dir < 0 ? b.hi - a.hi : a.lo - b.lo))[0];
    if (!piece) return 0;
    const end = dir < 0 ? piece.pts.at(-1) : piece.pts[0];
    if (dotsAt(end.x).some((d) => Math.abs(d.coordinate[1] - end.y) < yTol)) return 0;
    if (end.y >= span.y[1] - 0.03 * ySpan) return 1;
    if (end.y <= span.y[0] + 0.03 * ySpan) return -1;
    return 0;
  };

  const f = {
    label: first.label && first.color ? `${first.label}, ${first.color}` : first.label || `${first.color} ${first.kind === 'curve' ? 'curve' : 'line'}`,
    lo, hi, points: true,
    // How exactly the points are known: 0.01 for a curve read from a PDF.
    rounding: Math.max(...pieces.map((p) => p.rounding), 0),
    // Which piece x is on, so the picture lifts its pen between pieces (a jump).
    piece(x) { return pieces.findIndex((p) => has(p, x)); },
    limitAt,
    // The limit from one side, where the points and dots decide it better than nearby heights do:
    // at the end of a piece (the dot there, or the last point), and at an asymptote.
    sideAt(x, dir) {
      const up = asymptoteSide(x, dir);
      if (up) return { infinite: up };
      const p = pieceBeside(x, dir);
      if (!p) return null;
      const atEnd = dir < 0 ? Math.abs(x - p.hi) < EPS : Math.abs(x - p.lo) < EPS;
      return atEnd ? { value: (dir < 0 ? p.pts.at(-1) : p.pts[0]).y } : { value: heightOn(p, x) };
    },
    slopeSides(x) {
      const l = pieceBeside(x, -1), r = pieceBeside(x, 1);
      return { left: l ? slopesOn(l, x).left : null, right: r ? slopesOn(r, x).right : null };
    },
    // Is the curve a jump here (two pieces meet at different heights, or end at a dot away)?
    jumpAt(x) {
      const l = pieceBeside(x, -1), r = pieceBeside(x, 1);
      return Boolean(l && r && l !== r && Math.abs(heightOn(l, x) - heightOn(r, x)) >= yTol);
    },
    // Each dot of this function in words that say what it is: a hole, a jump, a value away from
    // the curve. [{ dot, words }], words as dotWords() in graph-mode.js reads them.
    dotKinds() {
      const out = [];
      for (const d of mine) {
        const [x, y] = d.coordinate;
        const { heights } = read(x);
        if (!heights.length) continue;
        const on = heights.some((h) => h.dot === d);
        const sides = [pieceBeside(x, -1), pieceBeside(x, 1)].filter(Boolean).map((p) => heightOn(p, x));
        const jump = sides.length === 2 && Math.abs(sides[0] - sides[1]) >= yTol;
        const openHere = heights.some((h) => h.dot && isOpen(h.dot));
        if (on && jump) out.push({ dot: d, words: 'jump at' });
        else if (on && isOpen(d) && sides.length === 2) out.push({ dot: d, words: 'hole at' });
        else if (on) out.push({ dot: d, words: '' });
        else if (!isOpen(d) && openHere) out.push({ dot: d, words: 'the value at' });
      }
      return out;
    },
    asymptotesBeside() {
      return asymptotes.filter((a) => asymptoteSide(a, -1) || asymptoteSide(a, 1));
    },
    // The asymptote a piece that ends at x is running off the graph towards (tan x drawn up to
    // the top of the grid, its dashed line a little further on), or null.
    asymptoteToward(x) {
      const piece = pieces.find((p) => Math.abs(p.lo - x) < EPS || Math.abs(p.hi - x) < EPS);
      if (!piece) return null;
      const atEnd = Math.abs(piece.hi - x) < EPS;
      return asymptotes.find((a) => (atEnd ? a >= x - EPS && asymptoteSide(a, -1) : a <= x + EPS && asymptoteSide(a, 1))) ?? null;
    },
    cornersOf() { return pieces.flatMap((p) => p.cornerList().map((c) => ({ x: c.x, y: c.y, smooth: p.smooth, ...slopesOn(p, c.x) }))); },
    // How the curve stops at x, when a piece ends there with no dot: 'arrow' (an arrow shows it
    // goes on), 'edge' (it runs off the top or bottom of the graph), or null.
    endNote(x) {
      const piece = pieces.find((p) => Math.abs(p.lo - x) < EPS || Math.abs(p.hi - x) < EPS);
      if (!piece) return null;
      const end = Math.abs(piece.lo - x) < EPS ? piece.pts[0] : piece.pts.at(-1);
      if (dotsAt(x).some((d) => Math.abs(d.coordinate[1] - end.y) < yTol)) return null;
      if (arrows.some((q) => Math.abs(q.x - end.x) < EPS && Math.abs(q.y - end.y) < yTol)) return 'arrow';
      if (span && (end.y >= span.y[1] - 0.03 * ySpan || end.y <= span.y[0] + 0.03 * ySpan)) return 'edge';
      return null;
    },
  };
  return f;
}
