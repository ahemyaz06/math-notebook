// Drawing on a graph with the keyboard (Ctrl+D in graph mode). Two keys do most of it:
// Enter puts a point where the cursor is (the points are joined as they are put down), and
// M opens a menu of everything else that can be done at that place, each with its own key
// named, so nothing has to be learned by heart. The maths is in draw.js; this is the keys,
// the words and the picture.
import { formatNumber } from '/sound/graph-math.js';
import { compileFunction, exactly, say } from './graphs.js';
import { latexToPlain } from './equation.js';
import { addPoint, connect, deletePoint, drawingsOf, drawnFunction, movePoint, nextName, numbersIn, pointAt, setNumber, startPiece, toggleOpen, toggleSmooth } from './draw.js';

const exact = (n) => formatNumber(Math.abs(n) < 1e-9 ? 0 : n).replace('-', 'minus ');
const pt = (p) => `${exact(p.x)}, ${exact(p.y)}`;

// What is different in graph `to` compared with graph `from`, in words, so that undo and redo
// say what they did: "the point at 1, 2 is taken away".
function changeWords(from, to) {
  const points = (g) => new Map(drawingsOf(g).flatMap((d) => d.pieces.flatMap((p) => p.points.map((q) => [`${d.name}:${q.x},${q.y}`, q]))));
  const a = points(from), b = points(to);
  const gone = [...a.keys()].filter((k) => !b.has(k)).map((k) => a.get(k));
  const back = [...b.keys()].filter((k) => !a.has(k)).map((k) => b.get(k));
  if (gone.length === 1 && back.length === 1) return `the point at ${pt(gone[0])} is at ${pt(back[0])} again`;
  if (gone.length === 1 && !back.length) return `the point at ${pt(gone[0])} is taken away`;
  if (back.length === 1 && !gone.length) return `the point at ${pt(back[0])} is back`;
  if (gone.length && !back.length) return `${gone.length} points are taken away`;
  if (back.length && !gone.length) return `${back.length} points are back`;
  if (gone.length) return 'the drawing is as it was before';
  const equations = (g) => (g.functions || []).map((f) => f.latex);
  const ea = equations(from), eb = equations(to);
  if (eb.length < ea.length) return 'the equation is taken away';
  if (eb.length > ea.length) return 'the equation is back';
  if (ea.join('\n') !== eb.join('\n')) return 'the equation is as it was before';
  const derivatives = (g) => [...drawingsOf(g), ...(g.functions || [])].reduce((sum, f) => sum + (f.derivative || 0), 0);
  if (derivatives(to) < derivatives(from)) return 'the derivative curve is taken away';
  if (derivatives(to) > derivatives(from)) return 'the derivative curve is back';
  const size = (g) => (g.span ? [...g.span.x, ...g.span.y].join() : '');
  if (size(from) !== size(to) && to.span) return `the graph shows x from ${exact(to.span.x[0])} to ${exact(to.span.x[1])} and y from ${exact(to.span.y[0])} to ${exact(to.span.y[1])} again`;
  if (Boolean(from.asEquation) !== Boolean(to.asEquation)) return `the document shows the ${to.asEquation ? 'equation' : 'description'} again`;
  if (drawingsOf(from).length !== drawingsOf(to).length) return drawingsOf(to).length < drawingsOf(from).length ? 'the new function is taken away' : 'the function is back';
  return 'the change to the point';
}
const ARROWS = { ArrowRight: [1, 0, 'Right'], ArrowLeft: [-1, 0, 'Left'], ArrowUp: [0, 1, 'Up'], ArrowDown: [0, -1, 'Down'] };
const MOVE_SPEECH_MS = 120;
const LIMIT = 100; // the graph can grow to minus 100 .. 100

// A line's slope in words: "slope 2, rising".
function slopeWords(m) {
  const r = Number(m.toFixed(4));
  return r === 0 ? 'flat, slope 0' : `slope ${exact(r)}, ${r > 0 ? 'rising' : 'falling'}`;
}

// A drawing in words, for "describe" and for the graph's line in the document.
export function describeDrawn(f) {
  const marks = f.landmarks(), dots = f.dots();
  const list = (kind) => marks.filter((l) => l.kind === kind);
  const parts = [];
  const zeros = marks.filter((l) => l.kind === 'x-axis' || l.kind === 'origin');
  const crossing = zeros.filter((l) => !l.touches).map((l) => say(l.x)), touching = zeros.filter((l) => l.touches).map((l) => say(l.x));
  if (crossing.length) parts.push(`crosses the x-axis at x = ${crossing.join(', ')}`);
  if (touching.length) parts.push(`touches the x-axis at x = ${touching.join(', ')}`);
  const yInt = list('y-axis')[0] || list('origin')[0];
  if (yInt) parts.push(`crosses the y-axis at y = ${say(yInt.y)}`);
  for (const l of list('maximum')) parts.push(`peak at ${say(l.x)}, ${say(l.y)}`);
  for (const l of list('minimum')) parts.push(`valley at ${say(l.x)}, ${say(l.y)}`);
  for (const x of new Set(dots.filter((d) => d.jump).map((d) => d.x))) parts.push(`jump at x = ${say(x)}`);
  for (const d of dots.filter((o) => o.hole)) parts.push(`hole at ${say(d.x)}, ${say(d.y)}`);
  for (const l of list('corner')) parts.push(`sharp corner at ${say(l.x)}, ${say(l.y)}`);
  for (const l of list('endpoint')) parts.push(`${l.side === 'start' ? 'starts' : 'ends'} at ${say(l.x)}, ${say(l.y)}${l.included ? '' : ', not including that point'}`);
  for (const d of dots.filter((o) => !o.jump && o.single)) parts.push(`${d.kind} at ${say(d.x)}, ${say(d.y)}`);
  return parts;
}

export class GraphEditor {
  // mode: the GraphMode this edits. menu, ask: its two dialogs. button: "Edit graph".
  constructor(mode, { menu = null, ask = null, button = null } = {}) {
    this.mode = mode;
    this.menuBox = menu;
    this.askBox = ask;
    this.button = button;
    this.on = false;
    this.reset();
    button?.addEventListener('click', () => { this.toggle(); mode.root.focus(); });
    menu?.addEventListener('keydown', (e) => this.menuKey(e));
    menu?.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) this.choose(Number(b.dataset.index)); });
    menu?.addEventListener('close', () => { if (!mode.root.hidden && !this.askBox?.open) mode.root.focus(); });
    ask?.querySelector('form').addEventListener('submit', (e) => {
      if (e.submitter?.value === 'cancel') return;
      e.preventDefault();
      const error = this.asking?.(ask.querySelector('input').value.trim());
      if (error) ask.querySelector('.error').textContent = error; else ask.close();
    });
    ask?.addEventListener('close', () => { if (!mode.root.hidden) mode.root.focus(); });
  }

  reset() {
    this.which = 0; // the drawn function that Enter draws on (f, g, ...)
    this.active = -1; // its piece that Enter carries on
    this.pen = 'line'; // or 'smooth': how new points are joined
    this.grab = null;
    this.tune = null;
    this.edge = null;
    this.history = [];
    this.stamps = []; // when each was remembered (GraphMode.tick), in step with history
    this.future = [];
  }

  // Keeps the graph as it was before a change, for undo, with when that was: Backspace takes
  // back whatever came last, a change to the drawing or a line added in graph mode.
  remember(graph) {
    this.history.push(graph);
    this.stamps.push(this.mode.tick());
    if (this.history.length > 100) { this.history.shift(); this.stamps.shift(); }
    this.future = [];
  }

  // The graph's drawn functions, and the one being drawn on.
  get drawings() { return drawingsOf(this.mode.graph); }
  get drawing() { return { pieces: this.drawings[this.which]?.pieces || [] }; }
  get fn() { return drawnFunction(this.drawing); }
  // Letters already used by a drawn function or by an equation written as g(x) = ...
  taken() {
    return [...this.drawings.map((d) => d.name), ...this.mode.functions.map((f) => /^([a-z])\(x\)/i.exec(f.source !== undefined ? f.label : '')?.[1]).filter(Boolean)];
  }
  get name() { return this.drawings[this.which]?.name || nextName(this.taken()); }
  // "g(x): " before what is said, once there is more than one drawn function.
  tag() { return this.drawings.length > 1 ? `${this.name}(x): ` : ''; }

  // The graph with the function being drawn on changed to these pieces.
  withDrawing(drawing) {
    const list = this.drawings.map((d) => ({ ...d }));
    if (list[this.which]) list[this.which].pieces = drawing.pieces;
    else { list.push({ name: nextName(this.taken()), pieces: drawing.pieces }); this.which = list.length - 1; }
    const { drawing: old, ...graph } = this.mode.graph;
    return { ...graph, drawings: list };
  }

  // Tab went to another function: when it is a drawn one, Enter now draws on that one.
  follow() {
    const d = this.mode.fn?.drawing;
    if (!this.on || d === undefined || d === this.which) return;
    this.which = d;
    this.active = this.nearestPiece(this.mode.tracing ? this.mode.x : this.mode.free.x);
  }

  // Ctrl+D, or the Edit graph button.
  toggle(on = !this.on) {
    const mode = this.mode;
    if (on === this.on) return;
    if (on && mode.canEdit && !mode.canEdit()) { mode.speak('This is the student preview. Graphs cannot be changed here.'); return; }
    if (this.grab) this.dropGrab(false);
    if (this.tune) this.endTune(false);
    this.on = on;
    this.reset();
    mode.root.classList.toggle('editing', on);
    this.button?.setAttribute('aria-pressed', String(on));
    if (on) {
      mode.pause(false);
      this.here();
      this.which = mode.fn?.drawing ?? 0;
      const pieces = this.drawing.pieces;
      if (pieces.length) this.active = this.nearestPiece(mode.free.x);
      mode.speak(`Editing on. Arrow keys move, Enter puts a point, M opens the menu of everything else. ${mode.where()}.`);
    } else mode.speak('Editing off.');
    mode.draw();
  }

  nearestPiece(x) {
    const pieces = this.drawing.pieces;
    let best = -1, far = Infinity;
    pieces.forEach((p, i) => {
      const d = x < p.points[0].x ? p.points[0].x - x : x > p.points.at(-1).x ? x - p.points.at(-1).x : 0;
      if (d < far) { far = d; best = i; }
    });
    return best;
  }

  // The cursor, as a free point (after stepping along a curve it is where the step ended).
  here() {
    const mode = this.mode;
    if (mode.tracing) {
      const lim = mode.fn?.limitAt(mode.x);
      mode.free = { x: Number(mode.x.toFixed(6)), y: lim?.defined ? Number(lim.y.toFixed(6)) : 0 };
      mode.tracing = false;
    }
    return mode.free;
  }

  onPoint() { const { x, y } = this.here(); return pointAt(this.drawing, x, y); }

  // ---------- changing the graph ----------

  // Show a graph without keeping it as a step (while a point is being moved).
  apply(graph, select = null) {
    const mode = this.mode;
    mode.graph = graph;
    mode.rebuild(select);
    mode.prepareFunction(!Number.isFinite(mode.x)); // the first function: stepping starts on it
    mode.draw();
  }

  // The graph's own words, and the document told.
  settle() {
    const mode = this.mode;
    // A graph read from a page keeps the words it came with, next to what is drawn on it.
    if (mode.graph.read === undefined && mode.functions.some((f) => !f.compiled && !f.dots)) mode.graph.read = mode.graph.summary || '';
    mode.graph.summary = exactly(() => (mode.graph.asEquation ? this.equationWords() : mode.description()));
    mode.onChange?.(mode.graph);
  }

  // The graph as its equations, for its line in the document (the menu chooses this or the
  // description): each drawn part's formula with where it applies, and each equation as written.
  equationWords() {
    const mode = this.mode, span = mode.span;
    const parts = mode.functions.map((f) => {
      if (f.formulas) return `${f.label}: ${f.formulas().map((p) => `${p.text} from x = ${formatNumber(p.from)} to ${formatNumber(p.to)}`).join('; ') || 'single points only'}`;
      if (f.compiled) return `${f.label}${f.compiled.notes.length ? ` (${f.compiled.notes.join('; ')})` : ''}`;
      return null;
    }).filter(Boolean);
    if (!parts.length) return mode.description();
    return `${parts.join('. ')}. Shown for x from ${say(span.x[0])} to ${say(span.x[1])} and y from ${say(span.y[0])} to ${say(span.y[1])}.`;
  }

  // The menu: the document's line shows the equation, or the description again.
  swapWords() {
    const graph = this.mode.graph;
    this.commit({ ...graph, asEquation: !graph.asEquation });
    this.mode.speak(`The document now shows the ${graph.asEquation ? 'description' : 'equation'}: ${this.mode.graph.summary}`);
  }

  commit(graph, select = null) {
    this.remember(this.mode.graph);
    this.apply(graph, select);
    this.settle();
  }

  // A change from draw.js: kept, or refused with its reason. Returns the result when kept.
  change(result) {
    if (!result.ok) { this.mode.speak(`Not possible: ${result.reason}.`); return null; }
    this.before = this.fn.landmarks();
    const graph = this.withDrawing(result.drawing);
    this.commit(graph, `drawn:${this.which}`);
    return result;
  }

  // Peaks and valleys that this change made: "Peak at 1, 2."
  news() {
    const turn = (l) => l.kind === 'maximum' || l.kind === 'minimum';
    const had = (l) => (this.before || []).some((b) => b.kind === l.kind && b.x === l.x && b.y === l.y);
    const fresh = this.fn.landmarks().filter((l) => turn(l) && !had(l));
    return fresh.map((l) => ` ${l.kind === 'maximum' ? 'Peak' : 'Valley'} at ${pt(l)}.`).join('');
  }

  // How two neighbouring points are joined: "Line from 0, 1: slope 2, rising."
  joinWords(from, to, both = false) {
    const f = this.fn.formulaAt((from.x + to.x) / 2);
    if (!f) return '';
    const ends = `from ${pt(from)}${both ? ` to ${pt(to)}` : ''}`;
    return f.slope !== null ? ` Line ${ends}: ${slopeWords(f.slope)}.` : ` Smooth curve ${ends}.`;
  }

  // What a point is: "Point at 1, 2, sharp corner, peak."
  pointWords({ piece, point }, lead = 'Point at ') {
    const pts = this.drawing.pieces[piece].points, q = pts[point];
    const words = lead ? [`${lead}${pt(q)}`] : [];
    if (q.open) words.push('open dot');
    if (pts.length === 1) words.push('a single dot');
    else if (point === 0) words.push('start of a piece');
    else if (point === pts.length - 1) words.push('end of a piece');
    else {
      const { left, right } = this.fn.slopesAt(piece, point);
      words.push(Math.abs(left - right) > 1e-9 ? 'sharp corner' : q.smooth ? 'smooth' : 'on a straight line');
      const turn = this.fn.landmarks().find((l) => l.x === q.x && (l.kind === 'maximum' || l.kind === 'minimum'));
      if (turn) words.push(turn.kind === 'maximum' ? 'a peak' : 'a valley');
    }
    return words.join(', ');
  }

  // Said after the position while moving freely: the cursor is on a point of the drawing.
  hint() {
    if (!this.on) return '';
    const on = pointAt(this.drawing, this.mode.free.x, this.mode.free.y);
    return on ? `. Your point: ${this.pointWords(on, '')}` : '';
  }

  put() {
    const { x, y } = this.here();
    const r = this.change(addPoint(this.drawing, this.active, x, y, this.pen === 'smooth'));
    if (!r) return;
    this.active = r.piece;
    const mode = this.mode, pts = r.drawing.pieces[r.piece].points, q = pts[r.point];
    mode.sound.playLandmarkEffect('solid-point', x, mode.boundary, y);
    let words = `${this.tag()}Point at ${pt(q)}.`;
    if (r.how === 'start') words += ` Move and press Enter again: a ${this.pen === 'smooth' ? 'smooth curve' : 'line'} will join the two points.`;
    else if (r.how === 'extend') words += this.joinWords(pts[r.point - 1] || pts[r.point + 1], q);
    else words += ` It bends the graph between ${pt(pts[r.point - 1])} and ${pt(pts[r.point + 1])}.`;
    mode.speak(words + this.news());
  }

  newPiece() {
    const { x, y } = this.here();
    const r = this.change(startPiece(this.drawing, x, y));
    if (!r) return;
    this.active = r.piece;
    const q = r.drawing.pieces[r.piece].points[r.point];
    this.mode.sound.playLandmarkEffect(q.open ? 'open-point' : 'solid-point', x, this.mode.boundary, y);
    this.mode.speak(`${this.tag()}New piece started at ${pt(q)}${q.open ? ', as an open dot, because the other piece has its solid dot at this x' : ''}. Move and press Enter for its next point.`);
  }

  remove() {
    const on = this.onPoint();
    if (!on) { this.mode.speak('No point here to delete. Period and comma go to the next and previous point.'); return; }
    const q = this.drawing.pieces[on.piece].points[on.point];
    const r = this.change(deletePoint(this.drawing, on.piece, on.point));
    if (!r) return;
    this.active = r.piece >= 0 ? r.piece : this.nearestPiece(q.x);
    this.mode.speak(`Point at ${pt(q)} deleted.${this.news()}`);
  }

  smooth() {
    const on = this.onPoint();
    if (!on) {
      this.pen = this.pen === 'line' ? 'smooth' : 'line';
      this.mode.speak(this.pen === 'smooth' ? 'New points will be joined by smooth curves.' : 'New points will be joined by straight lines.');
      return;
    }
    const r = this.change(toggleSmooth(this.drawing, on.piece, on.point));
    if (r) this.mode.speak(`${r.smooth ? 'Smooth curve through' : 'Sharp corner at'} ${pt(this.here())}.${this.news()}`);
  }

  openDot() {
    const on = this.onPoint();
    if (!on) { this.mode.speak('Move onto a point first. Period and comma go to the next and previous point.'); return; }
    const r = this.change(toggleOpen(this.drawing, on.piece, on.point));
    if (!r) return;
    const { x, y } = this.here(), mode = this.mode;
    mode.sound.playLandmarkEffect(r.open ? 'open-point' : 'solid-point', x, mode.boundary, y);
    mode.speak(r.open ? `Open dot at ${pt({ x, y })}: the curve comes to this height, but the point is not on the graph.`
      : `Solid dot at ${pt({ x, y })}.${r.swapped ? ` The dot at ${pt(r.swapped)} is now open, because a function has one value at each x.` : ''}`);
  }

  // The two pieces to join from here: the piece ending at this point and the next, the
  // piece starting here and the one before, or the pieces on each side of the cursor.
  gapHere() {
    const pieces = this.drawing.pieces, on = this.onPoint(), x = this.here().x;
    if (on && on.point === pieces[on.piece].points.length - 1 && pieces[on.piece + 1]) return on.piece;
    if (on && on.point === 0 && on.piece > 0) return on.piece - 1;
    return pieces.findIndex((p, i) => pieces[i + 1] && x >= p.points.at(-1).x - 1e-9 && x <= pieces[i + 1].points[0].x + 1e-9);
  }

  join(i = this.gapHere()) {
    const r = this.change(connect(this.drawing, i));
    if (!r) return;
    this.active = r.piece;
    this.mode.speak(`Connected.${this.joinWords(r.from, r.to, true)}${this.news()}`);
  }

  formula() {
    const f = this.fn.formulaAt(this.here().x);
    this.mode.speak(f ? `From x = ${exact(f.from)} to ${exact(f.to)} this is ${f.kind}: ${f.text}.${f.slope === null ? ' The numbers are rounded to four decimals.' : ''}`
      : 'No drawn line or curve at this x.');
  }

  // The drawn function being drawn on, taken off the graph (its derivatives go with it).
  erase() {
    const name = this.name;
    const { drawing: old, ...graph } = this.mode.graph;
    this.commit({ ...graph, drawings: this.drawings.filter((_, i) => i !== this.which) });
    this.which = Math.max(0, this.which - 1);
    this.active = this.nearestPiece(this.here().x);
    this.mode.speak(`${name}(x) is erased. Ctrl+Z brings it back.`);
  }

  // Another function to draw on the same graph: g(x) next to f(x). Each is a function of x on
  // its own, so g may pass over or under f.
  newFunction() {
    const list = this.drawings.map((d) => ({ ...d }));
    let at = list.findIndex((d) => !d.pieces.length);
    if (at < 0) { list.push({ name: nextName(this.taken()), pieces: [] }); at = list.length - 1; }
    const { drawing: old, ...graph } = this.mode.graph;
    this.commit({ ...graph, drawings: list });
    this.which = at;
    this.active = -1;
    this.mode.draw();
    this.mode.speak(`New function ${list[at].name}(x). Enter puts its first point. Later, Tab goes between the functions.`);
  }

  // The derivative of the selected function as a curve of its own: none, f', f' and f'', none.
  // It follows the function when a point is moved or a number is changed.
  derive(order = null) {
    const mode = this.mode, key = mode.fn?.of ?? mode.fn?.key;
    const [kind, n] = (key || '').split(':');
    if (kind !== 'drawn' && kind !== 'eq') { mode.speak('Go to a drawn function or an equation first: Tab goes between the functions.'); return; }
    const i = Number(n), { drawing: old, ...graph } = mode.graph;
    const list = (kind === 'drawn' ? this.drawings : this.equations()).map((d) => ({ ...d }));
    const next = order ?? ((list[i].derivative || 0) + 1) % 3;
    if (next) list[i].derivative = next; else delete list[i].derivative;
    const name = mode.functions.find((f) => f.key === key).label.replace(/, drawn$/, '');
    this.commit(kind === 'drawn' ? { ...graph, drawings: list } : { ...graph, functions: list }, next ? `d${next}:${key}` : key);
    const first = mode.fn?.landmarks ? describeDrawn(mode.fn)[0] : null;
    mode.speak(next ? `Added the ${next === 2 ? 'second ' : ''}derivative of ${name}, and it is selected: Space plays it, Tab goes on to the next function.${first ? ` It ${first}.` : ''}`
      : `The derivatives of ${name} are taken away.`);
  }

  undo(back = true) {
    const [from, to] = back ? [this.history, this.future] : [this.future, this.history];
    if (!from.length) { this.mode.speak(back ? 'Nothing to undo.' : 'Nothing to redo.'); return; }
    const was = this.mode.graph;
    to.push(was);
    if (back) this.stamps.pop(); else this.stamps.push(this.mode.tick());
    this.apply(from.pop());
    const what = changeWords(was, this.mode.graph);
    this.mode.onChange?.(this.mode.graph);
    this.which = Math.max(0, Math.min(this.which, this.drawings.length - 1));
    this.active = this.nearestPiece(this.here().x);
    const n = this.drawings.reduce((all, d) => all + d.pieces.reduce((sum, p) => sum + p.points.length, 0), 0);
    this.mode.speak(`${back ? 'Undone' : 'Redone'}: ${what}. ${n} ${n === 1 ? 'point' : 'points'} drawn.`);
  }

  // Period and comma while editing: the next and previous point that was put down.
  nextPoint(dir) {
    const all = this.drawing.pieces.flatMap((p, piece) => p.points.map((q, point) => ({ q, piece, point })))
      .sort((a, b) => a.q.x - b.q.x || a.q.y - b.q.y);
    if (!all.length) return false;
    const { x, y } = this.here();
    const after = (o) => o.q.x > x + 1e-9 || (Math.abs(o.q.x - x) <= 1e-9 && o.q.y > y + 1e-9);
    const before = (o) => o.q.x < x - 1e-9 || (Math.abs(o.q.x - x) <= 1e-9 && o.q.y < y - 1e-9);
    const next = dir > 0 ? all.find(after) : all.filter(before).at(-1);
    const mode = this.mode;
    if (!next) { mode.speak(dir > 0 ? 'No more points to the right.' : 'No more points to the left.'); return true; }
    mode.free = { x: next.q.x, y: next.q.y };
    this.active = next.piece;
    mode.sound.playLandmarkEffect(next.q.open ? 'open-point' : 'solid-point', next.q.x, mode.boundary, next.q.y);
    mode.draw();
    mode.speak(`${this.pointWords(next)}.`);
    return true;
  }

  // ---------- moving a point (G) ----------

  startGrab() {
    const on = this.onPoint();
    if (!on) { this.mode.speak('Move onto a point first. Period and comma go to the next and previous point.'); return; }
    this.grab = { ...on, before: this.mode.graph, from: { ...this.mode.free }, role: this.turnAt(this.mode.free.x) };
    this.mode.speak(`Moving the point at ${pt(this.mode.free)}. Arrow keys move it, Enter puts it down, Escape puts it back.`);
    this.mode.draw();
  }

  // Is the point at x a peak or a valley: 'peak', 'valley' or ''.
  turnAt(x) {
    const turn = this.fn.landmarks().find((l) => l.x === x && (l.kind === 'maximum' || l.kind === 'minimum'));
    return turn ? (turn.kind === 'maximum' ? 'peak' : 'valley') : '';
  }

  moveGrab(dx, dy) {
    const mode = this.mode, [x0, x1] = mode.span.x, [y0, y1] = mode.span.y;
    const x = Number(Math.max(x0, Math.min(x1, mode.free.x + dx * mode.step)).toFixed(6));
    const y = Number(Math.max(y0, Math.min(y1, mode.free.y + dy * mode.step)).toFixed(6));
    if (x === mode.free.x && y === mode.free.y) { mode.speak('Edge of the graph.'); return; }
    const r = movePoint(this.drawing, this.grab.piece, this.grab.point, x, y);
    if (!r.ok) { mode.speak(`Not possible: ${r.reason}.`); return; }
    const prevY = mode.free.y;
    this.apply(this.withDrawing(r.drawing), `drawn:${this.which}`);
    Object.assign(this.grab, { piece: r.piece, point: r.point });
    mode.free = { x, y };
    if (mode.settings.free_move_tones) mode.sound.playSeatedPulse(x, y, mode.boundary, prevY);
    mode.draw();
    // Said only when it changes: the point became a peak or a valley, or stopped being one.
    const role = this.turnAt(x), was = this.grab.role;
    this.grab.role = role;
    mode.speak(`${pt({ x, y })}.${role !== was ? (role ? ` Now a ${role}.` : ` No longer a ${was}.`) : ''}`, MOVE_SPEECH_MS);
  }

  dropGrab(keep) {
    const grab = this.grab, mode = this.mode;
    this.grab = null;
    if (!keep) {
      this.apply(grab.before, `drawn:${this.which}`);
      mode.free = grab.from;
      mode.draw();
      mode.speak(`Put back at ${pt(grab.from)}.`);
      return;
    }
    if (mode.graph !== grab.before) {
      this.remember(grab.before);
      this.settle();
    }
    this.active = grab.piece;
    mode.sound.playLandmarkEffect('solid-point', mode.free.x, mode.boundary, mode.free.y);
    mode.draw();
    mode.speak(`${this.pointWords(grab)}.`);
  }

  // ---------- equations: add, change, remove, play with the numbers ----------

  // The graph with these functions, and the dots their ends make.
  withFunctions(functions) {
    const graph = this.mode.graph;
    const compiled = exactly(() => functions.map((f) => compileFunction(f.latex, 'latex')));
    return { ...graph, functions,
      points: [...(graph.points || []).filter((p) => p.function === undefined || p.function === null),
        ...compiled.flatMap((f, i) => f.dots.map((d) => ({ ...d, function: i })))] };
  }

  equations() { return this.mode.graph.functions || []; }
  labelOf(i) { return this.mode.functions.find((f) => f.source === i)?.label || latexToPlain(this.equations()[i].latex); }

  askEquation(i = null) {
    const old = i === null ? '' : latexToPlain(this.equations()[i].latex);
    this.ask(i === null ? 'Add an equation' : 'Change the equation', 'A function of x, such as y = x^2 - 3 or sin(2x)', old, (text) => {
      if (!text) return 'Write a function of x.';
      let f;
      try { f = compileFunction(text); } catch (error) { return error.message; }
      const list = [...this.equations()];
      if (i === null) list.push({ latex: f.latex }); else list[i] = { ...list[i], latex: f.latex };
      const at = i === null ? list.length - 1 : i;
      this.commit(this.withFunctions(list), `eq:${at}`);
      this.mode.speak(`${i === null ? 'Added' : 'Changed to'} ${f.label}. Space plays it, T plays with its numbers.`);
      return null;
    });
  }

  removeEquation(i) {
    const label = this.labelOf(i);
    this.commit(this.withFunctions(this.equations().filter((_, n) => n !== i)));
    this.mode.speak(`Removed ${label}.`);
  }

  // T: the equation's numbers become dials. Left and Right choose one, Up and Down turn it.
  startTune(i = null) {
    const mode = this.mode, list = this.equations();
    if (!list.length) { mode.speak('There is no equation in this graph yet. E adds one.'); return; }
    if (i === null) i = Number.isInteger(mode.fn?.source) ? mode.fn.source : 0;
    const text = latexToPlain(list[i].latex);
    const numbers = numbersIn(text);
    if (!numbers.length) { mode.speak(`${this.labelOf(i)} has no numbers to change. Change the equation from the menu to write some in, such as 1x^2 + 0.`); return; }
    this.here();
    this.tune = { i, text, n: 0, before: mode.graph };
    mode.rebuild(`eq:${i}`);
    mode.draw();
    mode.speak(`Playing with the numbers of ${this.labelOf(i)}. It has ${numbers.length} ${numbers.length === 1 ? 'number' : 'numbers'}. `
      + `${numbers.length > 1 ? 'Left and Right choose a number, ' : ''}Up and Down change it by the step, Space plays the curve, Escape when done. ${this.numberWords()}`);
  }

  numberWords() {
    const { text, n } = this.tune, numbers = numbersIn(text), k = numbers[n];
    // The term it is in (2x^2 for the 2 in front and for the power), when that is more than the number.
    const from = text.lastIndexOf(' ', k.start) + 1, to = text.indexOf(' ', k.end);
    const term = text.slice(from, to < 0 ? text.length : to);
    return `Number ${n + 1} of ${numbers.length}: ${exact(k.value)}${term !== text.slice(k.start, k.end) ? `, in ${term}` : ''}.`;
  }

  turn(dir) {
    const mode = this.mode, tune = this.tune;
    const value = Number((numbersIn(tune.text)[tune.n].value + dir * mode.step).toFixed(6));
    const text = setNumber(tune.text, tune.n, value);
    let f;
    try { f = compileFunction(text, 'plain'); } catch (error) { mode.speak(`Not possible: ${error.message}`); return; }
    const list = [...this.equations()];
    list[tune.i] = { ...list[tune.i], latex: f.latex };
    tune.text = text;
    this.apply(this.withFunctions(list), `eq:${tune.i}`);
    // The curve's height where the cursor is, as its tone: it is heard moving up and down.
    const lim = mode.fn?.limitAt(mode.free.x);
    if (lim?.defined && mode.settings.free_move_tones) mode.sound.playSeatedPulse(mode.free.x, lim.y, mode.boundary, null);
    mode.speak(`${exact(value)}. ${f.label}`, MOVE_SPEECH_MS);
  }

  endTune(announce = true) {
    const tune = this.tune, mode = this.mode;
    this.tune = null;
    if (mode.graph !== tune.before) {
      this.remember(tune.before);
      this.settle();
    }
    if (announce) mode.speak(`Done. ${this.labelOf(tune.i)}.`);
  }

  // ---------- the size of the graph ----------

  resize(span, words) {
    const mode = this.mode;
    this.commit({ ...mode.graph, span });
    mode.free = { x: Math.max(span.x[0], Math.min(span.x[1], mode.free.x)), y: Math.max(span.y[0], Math.min(span.y[1], mode.free.y)) };
    mode.draw();
    const outside = this.drawings.flatMap((d) => d.pieces).flatMap((p) => p.points).filter((q) => q.x < span.x[0] || q.x > span.x[1] || q.y < span.y[0] || q.y > span.y[1]).length;
    mode.speak(`${words}${outside ? ` ${outside} ${outside === 1 ? 'point is' : 'points are'} now outside it.` : ''}`);
  }

  askSize() {
    const { x, y } = this.mode.span;
    this.ask('Size of the graph', 'x from, x to, y from, y to', `${x[0]}, ${x[1]}, ${y[0]}, ${y[1]}`, (text) => {
      const n = text.replace(/−/g, '-').split(/[\s,;]+|\bto\b/).filter(Boolean).map(Number);
      if (n.length !== 4 || !n.every(Number.isFinite)) return 'Write four numbers: x from, x to, y from, y to. For example -10, 10, -5, 5.';
      if (n[0] >= n[1] || n[2] >= n[3]) return 'Each "from" must be less than its "to".';
      if (n.some((v) => Math.abs(v) > LIMIT)) return `The graph can go from minus ${LIMIT} to ${LIMIT}.`;
      this.resize({ x: [n[0], n[1]], y: [n[2], n[3]] }, `The graph now shows x from ${exact(n[0])} to ${exact(n[1])} and y from ${exact(n[2])} to ${exact(n[3])}.`);
      return null;
    });
  }

  // An arrow key at the edge: the first press says so, the second makes the graph bigger.
  atEdge(e) {
    const mode = this.mode, [dx, dy, name] = ARROWS[e.key];
    if (mode.tracing) return false; // stepping along a curve: the first arrow key leaves it, as always
    const { x, y } = mode.free;
    const tx = x + dx * mode.step, ty = y + dy * mode.step;
    const [x0, x1] = mode.span.x, [y0, y1] = mode.span.y;
    if (tx >= x0 - 1e-9 && tx <= x1 + 1e-9 && ty >= y0 - 1e-9 && ty <= y1 + 1e-9) return false;
    const axis = dx ? 'x' : 'y', sign = dx || dy, limit = sign > 0 ? mode.span[axis][1] : mode.span[axis][0];
    if (e.repeat || this.edge !== e.key) {
      this.edge = e.key;
      mode.speak(`Edge of the graph, ${axis} = ${exact(limit)}. Press ${name} again to make the graph bigger.`);
      return true;
    }
    if (Math.abs(limit) >= LIMIT) { mode.speak(`The graph cannot go past ${exact(limit)}.`); return true; }
    const grown = limit + sign * Math.max(1, mode.step);
    const span = { x: [...mode.span.x], y: [...mode.span.y] };
    span[axis][sign > 0 ? 1 : 0] = grown;
    this.commit({ ...mode.graph, span });
    mode.free = { x: Number(Math.max(span.x[0], Math.min(span.x[1], tx)).toFixed(6)), y: Number(Math.max(span.y[0], Math.min(span.y[1], ty)).toFixed(6)) };
    mode.draw();
    mode.speak(`The graph now goes ${sign > 0 ? 'up' : 'down'} to ${axis} = ${exact(grown)}. ${mode.where()}`.replace(/goes (up|down) to x/, 'goes to x'));
    return true;
  }

  // ---------- keys ----------

  // true when the key was used here; false leaves it to graph mode (J, K, Space, I ...).
  key(e) {
    const mode = this.mode, k = e.key, lower = k.length === 1 ? k.toLowerCase() : k;
    const used = () => { e.preventDefault(); return true; };
    if (e.ctrlKey && !e.altKey && !e.metaKey && lower === 'd') { this.toggle(); return used(); }
    if (!this.on) return false;
    if (e.ctrlKey && !e.altKey && lower === 'z') { if (this.grab) this.dropGrab(false); if (this.tune) this.endTune(false); this.undo(!e.shiftKey); return used(); }
    if (e.ctrlKey && !e.altKey && lower === 'y') { this.undo(false); return used(); }
    if (e.ctrlKey || e.altKey || e.metaKey) return false;
    if (!ARROWS[k]) this.edge = null;

    if (this.grab) {
      if (ARROWS[k]) this.moveGrab(ARROWS[k][0], ARROWS[k][1]);
      else if (k === 'Enter') this.dropGrab(true);
      else if (k === 'Escape') this.dropGrab(false);
      else if (k === 'F1' || k === '?') return false;
      else mode.speak('A point is being moved. Arrow keys move it, Enter puts it down, Escape puts it back.');
      return used();
    }
    if (this.tune) {
      const count = numbersIn(this.tune.text).length;
      if (k === 'ArrowUp' || k === 'ArrowDown') { this.turn(k === 'ArrowUp' ? 1 : -1); return used(); }
      if (k === 'ArrowLeft' || k === 'ArrowRight') {
        this.tune.n = (this.tune.n + (k === 'ArrowRight' ? 1 : count - 1)) % count;
        mode.speak(this.numberWords());
        return used();
      }
      if (k === 'Escape' || k === 'Enter' || lower === 't') { this.endTune(); return used(); }
      if (k === 'Tab' || lower === 'm' || lower === 'e' || lower === 'n' || lower === 'g') { mode.speak('Playing with numbers. Escape when done.'); return used(); }
      return false; // Space, J, K, I, S, L, F1 work as always
    }

    if (ARROWS[k]) return this.atEdge(e) ? used() : false;
    if (k === 'Enter') { if (this.onPoint()) this.openMenu(); else this.put(); return used(); }
    if (lower === 'm' || k === 'ContextMenu' || (k === 'F10' && e.shiftKey)) { this.openMenu(); return used(); }
    // Backspace takes back the last thing done, whatever it was. Delete deletes the point the
    // cursor is on; away from a point it takes back the last thing too.
    if (k === 'Backspace' || (k === 'Delete' && !this.onPoint())) { mode.takeBack(); return used(); }
    if (k === 'Delete') { this.remove(); return used(); }
    if (lower === 'n') { this.newPiece(); return used(); }
    if (lower === 'r') { this.smooth(); return used(); }
    if (lower === 'o') { this.openDot(); return used(); }
    if (lower === 'g') { this.startGrab(); return used(); }
    if (lower === 'e') { this.askEquation(); return used(); }
    if (lower === 't') { this.startTune(); return used(); }
    if (lower === 'w') { this.askSize(); return used(); }
    if (k === "'") { this.derive(); return used(); }
    if (k === '.' || k === ',') return this.nextPoint(k === '.' ? 1 : -1) ? used() : false;
    return false;
  }

  // ---------- the menu (M, or Enter on a point) ----------

  items() {
    const on = this.onPoint(), pieces = this.drawing.pieces, list = [];
    const add = (label, key, run) => list.push({ label: key ? `${label} (${key})` : label, key, run });
    if (on) {
      const pts = pieces[on.piece].points, q = pts[on.point], middle = on.point > 0 && on.point < pts.length - 1;
      add('Move this point', 'G', () => this.startGrab());
      if (middle) add(q.smooth ? 'Make a sharp corner here' : 'Make the curve smooth here', 'R', () => this.smooth());
      add(q.open ? 'Make this a solid dot' : 'Make this an open dot', 'O', () => this.openDot());
      add('Delete this point', 'Delete', () => this.remove());
    } else {
      add('Put a point here', 'Enter', () => this.put());
      if (pieces.length) add('Start a new piece here, not joined to the rest', 'N', () => this.newPiece());
      add(this.pen === 'line' ? 'Join new points with smooth curves from now on' : 'Join new points with straight lines from now on', 'R', () => this.smooth());
    }
    const gap = this.gapHere();
    if (gap >= 0) add(`Connect the piece that ends at ${pt(pieces[gap].points.at(-1))} to the piece that starts at ${pt(pieces[gap + 1].points[0])}`, '', () => this.join(gap));
    if (this.fn.formulaAt(this.here().x)) add('Say the formula of the line or curve here', '', () => this.formula());
    // Another drawn function, and the derivative of the selected function.
    if (pieces.length) add(`Start a new function to draw, ${nextName(this.taken())}(x), on the same graph`, '', () => this.newFunction());
    const chosen = this.mode.fn, source = chosen && this.mode.functions.find((f) => f.key === (chosen.of ?? chosen.key));
    if (source && /^(drawn|eq):/.test(source.key)) {
      const who = source.label.replace(/, drawn$/, '');
      const has = (source.drawing !== undefined ? this.drawings[source.drawing] : this.equations()[source.source]).derivative || 0;
      if (has < 1) add(`Add the derivative of ${who} as a curve`, "'", () => this.derive(1));
      if (has === 1) add(`Add the second derivative of ${who}`, "'", () => this.derive(2));
      if (has > 0) add(`Take away the ${has === 2 ? 'derivatives' : 'derivative'} of ${who}`, '', () => this.derive(0));
    }
    add('Add an equation', 'E', () => this.askEquation());
    this.equations().forEach((_, i) => add(`${this.labelOf(i)}: play with its numbers, change it or remove it`, '', () => this.show(this.labelOf(i), [
      { label: 'Play with its numbers (T)', key: 'T', run: () => this.startTune(i) },
      { label: 'Change the equation', run: () => this.askEquation(i) },
      { label: 'Remove it from the graph', run: () => this.removeEquation(i) },
    ])));
    if (this.mode.functions.some((f) => f.dots || f.compiled)) {
      add(this.mode.graph.asEquation ? 'Show the description in the document instead of the equation' : 'Show the equation in the document instead of the description', '', () => this.swapWords());
    }
    add('Change the size of the graph', 'W', () => this.askSize());
    if (this.history.length || this.mode.lines.length || this.mode.diffOf) add('Take back the last thing you did', 'Backspace', () => this.mode.takeBack());
    if (this.drawings[this.which]) add(`Erase the drawn function ${this.name}(x)`, '', () => this.erase());
    add('Menu for listening, slopes, and tangent and secant lines', 'Ctrl+Enter', () => this.mode.openMenu());
    add('All the keys', 'F1', () => this.mode.onKeys?.());
    add('Stop editing', 'Ctrl+D', () => this.toggle(false));
    return list;
  }

  openMenu() {
    const on = this.onPoint();
    this.show(on ? this.pointWords(on) : `Graph menu, at ${pt(this.here())}`, this.items());
  }

  show(title, items) {
    const box = this.menuBox;
    if (!box) return;
    this.menuItems = items;
    const list = box.querySelector('[role="menu"]');
    list.setAttribute('aria-label', title);
    box.querySelector('h2').textContent = title;
    list.replaceChildren(...items.map((item, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'menuitem');
      b.dataset.index = i;
      b.tabIndex = i ? -1 : 0;
      b.textContent = item.label;
      return b;
    }));
    if (!box.open) box.showModal();
    list.firstElementChild.focus();
  }

  choose(i) {
    const item = this.menuItems?.[i];
    if (!item) return;
    this.menuBox.close();
    this.mode.root.focus();
    item.run();
  }

  menuKey(e) {
    const buttons = [...this.menuBox.querySelectorAll('button')];
    const at = buttons.indexOf(document.activeElement);
    const go = (i) => { e.preventDefault(); buttons[(i + buttons.length) % buttons.length].focus(); };
    if (e.key === 'ArrowDown') return go(at + 1);
    if (e.key === 'ArrowUp') return go(at - 1);
    if (e.key === 'Home') return go(0);
    if (e.key === 'End') return go(buttons.length - 1);
    if (e.key === 'Tab') return go(at + (e.shiftKey ? -1 : 1));
    if (e.ctrlKey || e.altKey || e.metaKey || e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') return undefined;
    // A command's own key works in the menu too.
    const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    const i = this.menuItems.findIndex((item) => item.key === key);
    if (i >= 0) { e.preventDefault(); this.choose(i); }
    return undefined;
  }

  ask(title, label, value, done) {
    const box = this.askBox;
    if (!box) return;
    this.asking = done;
    box.querySelector('h2').textContent = title;
    box.querySelector('label').textContent = label;
    box.querySelector('.error').textContent = '';
    const input = box.querySelector('input');
    input.value = value;
    box.showModal();
    input.focus();
    input.select();
  }

  // ---------- the picture: the points, the piece being drawn, and what Enter would add ----------

  paint(layer, px, py) {
    if (!this.on) { layer.innerHTML = ''; return; }
    const mode = this.mode, cursor = mode.tracing ? null : mode.free;
    let out = '';
    if (cursor) {
      // Lines through the cursor to both axes, so a helper can follow it.
      out += `<line x1="${px(cursor.x)}" y1="0" x2="${px(cursor.x)}" y2="400" class="edit-guide"/><line x1="0" y1="${py(cursor.y)}" x2="600" y2="${py(cursor.y)}" class="edit-guide"/>`;
      // What Enter would draw from here, dashed; a cross where it is not possible.
      if (!this.grab && !this.tune && !pointAt(this.drawing, cursor.x, cursor.y)) {
        const r = addPoint(this.drawing, this.active, cursor.x, cursor.y, this.pen === 'smooth');
        if (r.ok) {
          const pts = r.drawing.pieces[r.piece].points;
          for (const n of [pts[r.point - 1], pts[r.point + 1]]) if (n) out += `<line x1="${px(n.x)}" y1="${py(n.y)}" x2="${px(cursor.x)}" y2="${py(cursor.y)}" class="edit-preview"/>`;
        } else {
          const x = px(cursor.x), y = py(cursor.y);
          out += `<path d="M${x - 7},${y - 7}L${x + 7},${y + 7}M${x - 7},${y + 7}L${x + 7},${y - 7}" class="edit-blocked"/>`;
        }
      }
    }
    this.drawings.forEach((d, n) => d.pieces.forEach((p, i) => p.points.forEach((q, j) => {
      const mine = n === this.which;
      const x = px(q.x), y = py(q.y), cls = `edit-point${mine ? '' : ' other'}${mine && i === this.active ? ' active' : ''}${q.open ? ' open' : ''}${mine && this.grab?.piece === i && this.grab.point === j ? ' grabbed' : ''}`;
      // Round for a smooth point, square for a corner or an end.
      out += q.smooth ? `<circle cx="${x}" cy="${y}" r="5" class="${cls}"/>` : `<rect x="${x - 4.5}" y="${y - 4.5}" width="9" height="9" class="${cls}"/>`;
    })));
    if (cursor) out += `<text x="${Math.min(520, px(cursor.x) + 10)}" y="${Math.max(12, py(cursor.y) - 10)}" class="edit-label">(${formatNumber(cursor.x)}, ${formatNumber(cursor.y)})</text>`;
    layer.innerHTML = out;
  }
}
