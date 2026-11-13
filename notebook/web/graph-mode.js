// Graph mode: explore a graph by sound, using Sound Lab's engine and math.
// J/K trace the selected function; arrow keys move freely (no bass) and the curve's
// tone plays when the cursor lands on it; Space plays with the bass and reads the
// coordinate when it stops; Tab switches functions.
import { CalculusSoundEngine } from '/sound/sound-engine.js';
import { compileEquation, detectLandmarks, estimateSide, findStepEvents, formatNumber } from '/sound/graph-math.js';
import { HIDEABLE, compileFunction, derivativeFunction, describeFunction, exactly, landmarksOf, say, setNumberStyle, spokenLabel } from './graphs.js';
import { derivativeOf, drawingsOf, drawnFunction } from './draw.js';
import { GraphEditor, describeDrawn } from './graph-edit.js';

const STEPS = [0.1, 0.25, 0.5, 1];
// Keys that act once however long they are held (see key()).
const ONCE_KEYS = ['t', 'T', '-', '_', 'd', 'D', 'Backspace', 'Delete', "'", 'Enter'];
// The new sound design: the first function on a graph has the sound chosen in Settings, and each
// further one (another function, a derivative) its own from this list, so the ear knows which
// function it is on without two ever sounding together. Clearly different kinds of sound first.
const OTHER_VOICES = ['marimba', 'cello', 'harp', 'flute', 'piano', 'vibraphone', 'guitar', 'beep', 'chiptune'];
// A function's short name for speech: "g(x)" from "g(x) = x^2", "f(x)" from "f(x), drawn".
const shortName = (f) => { if (f.short) return f.short; const n = f.label.split(/\s*=|,/)[0].trim(); return n.length > 1 ? n : f.label; };

// The line y = m x + c in words: "y = 2x minus 1", "y = minus x plus 3", "y = 4".
function lineWords(m, c) {
  const n = (v) => exact(Number(v.toFixed(6)));
  if (m === 0) return `y = ${n(c)}`;
  const mx = m === 1 ? 'x' : m === -1 ? 'minus x' : `${n(m)}x`;
  return c === 0 ? `y = ${mx}` : `y = ${mx} ${c < 0 ? 'minus' : 'plus'} ${n(Math.abs(c))}`;
}

// A tangent or secant line as a function to trace and to see. spec: { key, kind, m, c, a, b,
// label, short }. It is traced where it is on the graph (with half a graph's height of room,
// as the picture draws it), not far above or below it.
function lineFunction(spec, span) {
  const { m, c } = spec;
  const room = (span.y[1] - span.y[0]) * 0.5;
  let lo = span.x[0], hi = span.x[1];
  if (Math.abs(m) > 1e-12) {
    const ends = [(span.y[0] - room - c) / m, (span.y[1] + room - c) / m].sort((p, q) => p - q);
    lo = Math.max(lo, ends[0]); hi = Math.min(hi, ends[1]);
  }
  const tidy = (v) => (Math.abs(v) < 1e-12 ? 0 : Number(v.toPrecision(12)));
  return {
    label: spec.label, short: spec.short, lo, hi, exact: true, line: spec, key: spec.key, owner: spec.key,
    limitAt: (x) => ({ defined: true, y: tidy(m * x + c) }),
    landmarks() {
      const out = [];
      if (c === 0) out.push({ kind: 'origin', x: 0, y: 0 });
      else {
        if (m !== 0) out.push({ kind: 'x-axis', x: tidy(-c / m), y: 0, touches: false });
        out.push({ kind: 'y-axis', x: 0, y: c });
      }
      return out;
    },
  };
}
const heightAt = (f, x) => { const l = f.limitAt(x); return l.defined ? l.y : NaN; };
// Is the curve unbroken from a to b (no jump, asymptote or gap between)?
const unbroken = (f, a, b) => {
  const [lo, hi] = a < b ? [a, b] : [b, a];
  if (f.graph) return f.graph.isContinuousBetween(lo, hi);
  if (f.isContinuousBetween) return f.isContinuousBetween(lo, hi);
  return !f.piece || f.piece(lo) === f.piece(hi);
};

// The heights a curve takes between x0 and x1: [lowest, highest], or null when it has none.
// Where it runs off (towards an asymptote) the far tails are left out, as the window does.
function heightRange(f, x0, x1) {
  const ys = [];
  for (let i = 0; i <= 400; i += 1) { const y = heightAt(f, x0 + ((x1 - x0) * i) / 400); if (Number.isFinite(y)) ys.push(y); }
  if (!ys.length) return null;
  ys.sort((a, b) => a - b);
  const pick = (q) => ys[Math.round(q * (ys.length - 1))];
  const inner = [pick(0.03), pick(0.97)];
  return ys.at(-1) - ys[0] <= 3 * (inner[1] - inner[0]) + 1e-9 ? [ys[0], ys.at(-1)] : inner;
}

// Where two functions have the same height, between lo and hi: [{ x, y }]. Nothing when they
// are the same curve over a stretch (every point would be a crossing).
function crossingsOf(f, g, lo, hi) {
  if (!(hi > lo)) return [];
  const N = 800, out = [];
  const d = (x) => heightAt(f, x) - heightAt(g, x);
  let prevX = lo, prev = d(lo), same = 0;
  const add = (x) => { if (!out.length || Math.abs(out.at(-1).x - x) > 1e-6) out.push({ x: Number(x.toFixed(9)), y: heightAt(f, x) }); };
  if (prev === 0) add(lo);
  for (let i = 1; i <= N; i += 1) {
    const x = lo + ((hi - lo) * i) / N, v = d(x);
    if (v === 0) { add(x); same += 1; } else if (Number.isFinite(v) && Number.isFinite(prev) && prev !== 0 && Math.sign(v) !== Math.sign(prev)) {
      let a = prevX, b = x, da = prev;
      for (let k = 0; k < 50; k += 1) { const mid = (a + b) / 2, dm = d(mid); if (!Number.isFinite(dm)) break; if (Math.sign(dm) === Math.sign(da)) { a = mid; da = dm; } else b = mid; }
      const at = (a + b) / 2;
      // A change of sign across a jump or an asymptote is no meeting: the two heights must agree there.
      if (Math.abs(d(at)) < 1e-6 * (1 + Math.abs(heightAt(f, at)))) add(Math.abs(at - Math.round(at * 1e6) / 1e6) < 1e-9 ? Math.round(at * 1e6) / 1e6 : at);
    }
    prevX = x; prev = v;
  }
  return same > N / 20 || out.length > 40 ? [] : out;
}

// The difference of two functions as a function to trace: above zero where the first is
// higher, zero where they cross.
function differenceFunction(f, g, [x0, x1]) {
  const label = `${shortName(f)} minus ${shortName(g)}`;
  return {
    label, lo: Math.max(f.lo, g.lo), hi: Math.min(f.hi, g.hi), difference: true, key: 'difference', owner: 'difference',
    limitAt(x) {
      const a = f.limitAt(x), b = g.limitAt(x);
      if (a.defined && b.defined) return { defined: true, y: a.y - b.y };
      const y = Number.isFinite(a.y) && Number.isFinite(b.y) ? a.y - b.y : NaN;
      return { defined: false, hole: Boolean((a.defined || a.hole) && (b.defined || b.hole)) && Number.isFinite(y), y };
    },
    piece(x) { return (f.piece ? f.piece(x) : 0) * 1000 + (g.piece ? g.piece(x) : 0); },
    isContinuousBetween: (a, b) => unbroken(f, a, b) && unbroken(g, a, b),
    landmarks() {
      return crossingsOf(f, g, Math.max(this.lo, x0), Math.min(this.hi, x1)).map(({ x }) => ({ kind: 'crossing', x, y: 0,
        label: `zero at x = ${say(x)}: ${shortName(f)} and ${shortName(g)} cross` }));
    },
  };
}
// After a step the position is read this soon. It was 650 ms, which felt like NVDA lagging
// behind every arrow press (owner's report, homework 4.1). A held key repeats faster than
// this, so it still reads once, where you stop; the next key press cuts NVDA off anyway.
const MOVE_SPEECH_MS = 120;
// say() rounds as Settings asks (nearest half by default); exact() is for what you chose
// yourself: where the cursor is along x (already on your step) and the step size.
const exact = (n) => formatNumber(Math.abs(n) < 1e-9 ? 0 : n).replace('-', 'minus ');
// Numbers inside a stored description, rounded the same way (descriptions without a formula).
// A dot in words, numbers rounded; what the stored words say it is (a jump, a hole) is kept.
function dotWords(p) {
  const [x, y] = p.coordinate;
  const dot = `${p.kind} at ${say(x)}, ${say(y)}`;
  const was = p.label || '';
  if (/^jump at/.test(was)) return `jump at x = ${say(x)}: ${dot}`;
  if (/^hole at/.test(was)) return `hole at ${say(x)}, ${say(y)}: both sides go to ${say(y)}`;
  if (/^the value at/.test(was)) return `the value at x = ${say(x)} is ${say(y)}, away from the curve`;
  return dot;
}
const roundWords = (text) => text.replace(/(minus )?(\d+(?:\.\d+)?(?:e(?:minus |\+)?\d+)?)/g, (m, minus, num) => {
  const v = Number(num.replace('eminus ', 'e-')) * (minus ? -1 : 1);
  return Number.isFinite(v) ? say(v) : m;
});

// A slope in words, to one decimal: "slope 2, rising", "flat, slope 0".
function slopeWords(m, about = '') {
  if (!Number.isFinite(m)) return `vertical, going straight ${m > 0 ? 'up' : 'down'}`;
  if (Math.abs(m) > 1000) return `${about}nearly vertical, ${m > 0 ? 'rising' : 'falling'} very steeply`;
  const r = Math.round(m * 10) / 10;
  if (r === 0) return `flat, slope ${about}0`;
  const how = Math.abs(r) < 0.5 ? ' gently' : Math.abs(r) > 3 ? ' steeply' : '';
  return `slope ${about}${formatNumber(r).replace('-', 'minus ')}, ${r > 0 ? 'rising' : 'falling'}${how}`;
}

// A function made from the exact points the PDF reader found (straight pieces or samples).
function sampledFunction(curve, dots = []) {
  // Samples may have null between pieces (a student copy's curve breaks at a jump or an
  // asymptote); between pieces there is no point.
  const segments = [[]];
  for (const p of curve.corners || curve.samples || []) {
    if (p === null) { if (segments.at(-1).length) segments.push([]); } else segments.at(-1).push({ x: p[0], y: p[1] });
  }
  const pieces = segments.filter((s) => s.length).map((s) => s.sort((a, b) => a.x - b.x));
  const lo = pieces[0]?.[0].x ?? 0, hi = pieces.at(-1)?.at(-1).x ?? 0;
  return {
    label: curve.label && curve.color ? `${curve.label}, ${curve.color}` : curve.label || `${curve.color} ${curve.kind === 'curve' ? 'curve' : 'line'}`,
    lo, hi,
    // Which piece x is on, so the picture lifts its pen between pieces (a jump).
    piece(x) { return pieces.findIndex((s) => x >= s[0].x - 1e-9 && x <= s.at(-1).x + 1e-9); },
    limitAt(x) {
      // Where two pieces meet (a jump), the drawn dots say which height is the point: the
      // solid dot's, and an open dot's height is only approached.
      const here = pieces.filter((s) => x >= s[0].x - 1e-9 && x <= s.at(-1).x + 1e-9);
      const ends = here.map((s) => (Math.abs(s[0].x - x) < 1e-9 ? s[0].y : Math.abs(s.at(-1).x - x) < 1e-9 ? s.at(-1).y : null)).filter((v) => v !== null);
      const dotAt = (kind) => dots.find((d) => d.kind === kind && Math.abs(d.coordinate[0] - x) < 1e-9 && ends.some((v) => Math.abs(v - d.coordinate[1]) < 1e-6));
      if (ends.length) {
        const solid = dotAt('solid dot');
        if (solid) return { defined: true, y: solid.coordinate[1] };
        const open = dotAt('open dot');
        const other = ends.find((v) => !open || Math.abs(v - open.coordinate[1]) >= 1e-6);
        if (open && other === undefined) return { defined: false, hole: true, y: open.coordinate[1] };
        if (open) return { defined: true, y: other };
      }
      const pts = here[0];
      if (!pts || (pts.length < 2 && Math.abs(pts[0].x - x) > 1e-9)) return { defined: false, hole: false, y: NaN };
      let k = pts.findIndex((p) => p.x >= x);
      if (k <= 0) return { defined: true, y: pts[0].y };
      const a = pts[k - 1], b = pts[k];
      const y = b.x === a.x ? b.y : a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x);
      return { defined: true, y };
    },
    landmarks() {
      const out = [];
      for (const t of curve.turning_points || []) out.push({ kind: t.kind === 'peak' ? 'maximum' : 'minimum', x: t.at[0], y: t.at[1], label: `${t.kind} at ${say(t.at[0])}, ${say(t.at[1])}` });
      const roots = [...(curve.crosses_x_axis_at || []).map((x) => ({ x, touches: false })),
        ...(curve.touches_x_axis_at || []).map((x) => ({ x, touches: true }))];
      for (const { x, touches } of roots) out.push({ kind: x === 0 ? 'origin' : 'x-axis', x, y: 0, touches,
        label: (touches ? 'touches' : 'crosses') + ' the x-axis at ' + say(x) });
      if (Number.isFinite(curve.crosses_y_axis_at) && !roots.some(({ x }) => x === 0)) {
        out.push({ kind: 'y-axis', x: 0, y: curve.crosses_y_axis_at, label: `crosses the y-axis at ${say(curve.crosses_y_axis_at)}` });
      }
      for (const a of curve.asymptotes || []) out.push({ kind: 'asymptote', x: a, y: null, label: `vertical asymptote at x = ${say(a)}` });
      for (const sh of curve.shapes || []) out.push({ ...sh, x: sh.at[0], y: sh.at[1] });
      if (curve.kind !== 'curve') {
        const c = curve.corners || [];
        for (let i = 1; i < c.length - 1; i += 1) {
          if (!c[i - 1] || !c[i] || !c[i + 1]) continue; // a break between pieces is no corner
          const [x, y] = c[i];
          out.push({ kind: 'corner', x, y, slopeLeft: (y - c[i - 1][1]) / (x - c[i - 1][0]), slopeRight: (c[i + 1][1] - y) / (c[i + 1][0] - x), label: `corner at ${say(x)}, ${say(y)}` });
        }
      }
      return out;
    },
  };
}

function equationFunction(text) {
  const graph = compileEquation(text);
  return { label: graph.label, lo: -Infinity, hi: Infinity, limitAt: (x) => graph.limitAt(x), graph };
}

// A function written in the document (LaTeX, piecewise too), see graphs.js.
function latexFunction({ latex }) {
  const f = compileFunction(latex, 'latex');
  return { label: f.label, lo: -Infinity, hi: Infinity, limitAt: (x) => f.graph.limitAt(x), graph: f.graph, compiled: f };
}

export class GraphMode {
  // onChange(graph): the graph was edited (Ctrl+D); canEdit(): may it be; edit: the editor's
  // menu and question dialogs and its button.
  constructor({ root, status, onExit, onKeys = null, reading = null, onChange = null, canEdit = null, edit = {} }) {
    this.root = root;
    this.status = status;
    this.reading = reading; // the same words on screen, for sighted helpers
    this.onExit = onExit;
    this.onKeys = onKeys; // F1 or question mark: the keys, as a table
    this.onChange = onChange;
    this.canEdit = canEdit;
    this.editor = new GraphEditor(this, edit);
    this.sound = new CalculusSoundEngine();
    this.applySettings({});
    this.timer = null;
    this.speakTimer = null;
    root.addEventListener('keydown', (e) => this.key(e));
    root.addEventListener('blur', () => this.pause(false));
  }

  // Help > Settings > Graph sound.
  applySettings(s) {
    this.settings = { sound_profile: 'gentle', bass_mode: 'x-and-y', step: 0.5, play_speed_ms: 400, cues: true,
      volume: 0.25, bass_volume: 0.35, free_move_tones: true, dot_sounds: 'new', graph_numbers: 'half', pitch_glide: true, slope_sound: false, stereo_width: 'original', sound_design: 'fitted', ...this.settings, ...s };
    const v = this.settings;
    this.sound.setDesign(v.sound_design);
    this.sound.setSoundProfile(v.sound_profile);
    this.sound.setBassOutlineMode(v.bass_mode);
    this.sound.setCuesEnabled(v.cues);
    this.sound.setVolume(v.volume);
    this.sound.setBassOutlineVolume(v.bass_volume);
    this.sound.setStepDelayMs(v.play_speed_ms);
    this.sound.setDotSounds(v.dot_sounds);
    this.sound.setPitchGlide(v.pitch_glide);
    this.sound.setStereoWidth(v.stereo_width);
    if ('slope_sound' in s) this.slopeSound = Boolean(v.slope_sound); // D in graph mode turns it on or off for now
    setNumberStyle(v.graph_numbers);
  }

  // Help > Settings > Graph sound: hear a sound before saving it. The example climbs from 0 to 3,
  // falls to minus 2 and comes back to 0, from left to right; then a solid dot and an open dot.
  // short: just a climb and a fall, when moving through the choices.
  previewEngineFor(values) {
    const engine = this.previewEngine ||= new CalculusSoundEngine();
    const v = { ...this.settings, ...values };
    engine.setDesign(v.sound_design);
    engine.setSoundProfile(v.sound_profile);
    engine.setVolume(v.volume);
    engine.setBassOutlineVolume(v.bass_volume);
    engine.setBassOutlineMode(v.bass_mode === 'off' ? 'x-and-y' : v.bass_mode);
    engine.setCuesEnabled(true);
    engine.setPitchGlide(v.pitch_glide);
    engine.setStereoWidth(v.stereo_width);
    engine.setDotSounds(v.dot_sounds);
    engine.setStepDelayMs(300);
    engine.setWindow({ x: [-4, 4], y: [-6, 6] });
    for (const t of this.previewTimers || []) clearTimeout(t);
    engine.stopBassOutline();
    this.previewTimers = [];
    return engine;
  }

  // The sound guide (Help > Sound guide): one sound, played as graph mode would play it.
  // name: one of GUIDE_SOUNDS' names.
  guide(name, values) {
    const e = this.previewEngineFor(values);
    const v = { ...this.settings, ...values };
    const at = (ms, f) => this.previewTimers.push(setTimeout(f, ms));
    const notes = (ys, gap = 300, xs = null, withSlope = false) => ys.forEach((y, i) => at(i * gap, () => {
      const x = xs ? xs[i] : -3 + (6 * i) / Math.max(1, ys.length - 1);
      e.playSeatedPulse(x, y, 4, i ? ys[i - 1] : null);
      if (withSlope) e.playSlopeNote(x, 2 * x, 4, i ? 2 * (xs ? xs[i - 1] : 0) : null, 0.13);
    }));
    const effect = (kind, y = 1, mark = null, x = 0) => e.playLandmarkEffect(kind, x, 4, y, mark);
    switch (name) {
      case 'above': return notes([1, 3, 6], 450, [0, 0, 0]);
      case 'zero': return notes([0], 300, [0]);
      case 'below': return notes([-1, -3, -6], 450, [0, 0, 0]);
      case 'up': return notes([0, 0.5, 1, 1.5, 2, 2.5, 3]);
      case 'down': return notes([3, 2.5, 2, 1.5, 1, 0.5, 0, -0.5, -1]);
      case 'leftright': return notes([1, 1, 1], 500, [-4, 0, 4]);
      case 'gear': return notes([9, 9.5, 10, 10.5, 11], 400, [0, 0, 0, 0, 0]);
      case 'bass': {
        const ys = [0, 0.5, 1, 1.5, 2, 1.5, 1, 0.5, 0, -0.5, -1];
        ys.forEach((y, i) => at(i * 300, () => {
          const x = -3 + (6 * i) / (ys.length - 1);
          e.playStepSequence({ x, lim: { defined: true, y }, boundary: 4, prevY: i ? ys[i - 1] : null, withBassOutline: true });
        }));
        return at(ys.length * 300 + 200, () => e.stopBassOutline());
      }
      case 'peak': return effect('maximum', 2);
      case 'valley': return effect('minimum', -2);
      case 'x-axis': return effect('x-axis', 0, null, 1);
      case 'y-axis': return effect('y-axis', 1);
      case 'origin': return effect('origin', 0);
      case 'solid': return effect('solid-point', 1);
      case 'open': return effect('open-point', 1);
      case 'corner': return effect('corner', 0, { slopeLeft: -1, slopeRight: 1 }, 1);
      case 'asymptote': return effect('asymptote', 0, null, 1);
      case 'end': return effect('endpoint', 1, { included: true });
      case 'crossing': return effect('crossing', 2, null, 1);
      case 'scale': return notes([-6, 0, 6], 600, [0, 0, 0]);
      case 'voices': {
        // The same rise three times: the first function's sound, then the second's and the third's.
        const voices = [null, ...OTHER_VOICES.filter((name) => name !== v.sound_profile).slice(0, 2)];
        voices.forEach((voice, n) => [0, 1, 2, 3].forEach((y, i) => at(n * 1300 + i * 280, () => e.playSeatedPulse(-2 + i, y, 4, i ? y - 1 : null, { voice }))));
        return undefined;
      }
      case 'slope': {
        // y = x^2 from -2 to 2: the slope note falls, passes the middle note at the valley, then rises.
        const xs = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2];
        return notes(xs.map((x) => x * x), 450, xs, true);
      }
      default: return undefined;
    }
  }

  // The lessons (Help > Sound guide): the sound for one lesson's question. variant is the right
  // answer. Always in the fitted design, on a graph from minus 4 to 4 and minus 6 to 6.
  lesson(name, variant, values) {
    const e = this.previewEngineFor({ ...values, sound_design: 'fitted' });
    const v = { ...this.settings, ...values };
    e.setStepDelayMs(350);
    const B = 4;
    const at = (ms, f) => this.previewTimers.push(setTimeout(f, ms));
    // A curve stepped from left to right, as K or Space would play it. Returns when it ends.
    const curve = (f, { from = -3, to = 3, n = 7, gap = 350, start = 0, voice = null, bass = false, marks = [] } = {}) => {
      let prev = null;
      for (let i = 0; i < n; i += 1) {
        const x = from + ((to - from) * i) / (n - 1), y = f(x), last = prev;
        at(start + i * gap, () => {
          const path = last ? Array.from({ length: 13 }, (_, k) => f(last.x + ((x - last.x) * k) / 12)) : null;
          e.playStepSequence({ x, lim: { defined: true, y }, boundary: B, prevY: last ? last.y : null, landedOn: marks.filter((m) => Math.abs(m.x - x) < 1e-9), withBassOutline: bass, path, voice });
        });
        prev = { x, y };
      }
      if (bass) at(start + n * gap + 150, () => e.stopBassOutline());
      return start + n * gap;
    };
    const note = (ms, x, y, opts = {}) => at(ms, () => e.playSeatedPulse(x, y, B, null, { path: null, ...opts }));
    switch (name) {
      case 'pitch': { const [a, b] = variant === 'higher' ? [1, 4] : [4, 1]; note(0, 0, a); note(700, 0, b); return; }
      case 'side': note(0, { left: -4, middle: 0, right: 4 }[variant], 2); return;
      case 'direction': curve({ up: (x) => x, down: (x) => -x, flat: () => 2 }[variant]); return;
      case 'steep': {
        const gentle = (x) => 0.5 * x, steep = (x) => 1.8 * x;
        const end = curve(variant === 'first' ? steep : gentle, { n: 5 });
        curve(variant === 'first' ? gentle : steep, { n: 5, start: end + 500 });
        return;
      }
      case 'bend': curve(variant === 'steeper' ? (x) => (x + 3) ** 2 / 6 : (x) => 6 - (3 - x) ** 2 / 6); return;
      case 'sign': { const y = { above: 2.5, below: -2.5, zero: 0 }[variant]; [0, 600, 1200].forEach((ms) => note(ms, 0, y)); return; }
      case 'turn': {
        const s = variant === 'valley' ? 1 : -1;
        curve((x) => s * ((x * x) / 1.5 - 3), { marks: [{ kind: s > 0 ? 'minimum' : 'maximum', x: 0, y: -3 * s }] });
        return;
      }
      case 'dots': {
        // The line y = x + 2 from minus 1 to 1, with the dot (or the gap) in the middle, at 0.
        note(0, -1, 1); note(400, -0.5, 1.5);
        at(800, () => {
          if (variant === 'solid') e.playStepSequence({ x: 0, lim: { defined: true, y: 2 }, boundary: B, prevY: 1.5, landedOn: [{ kind: 'solid-point', x: 0, y: 2 }] });
          else e.playStepSequence({ x: 0, lim: { defined: false, hole: variant === 'open', y: variant === 'open' ? 2 : NaN }, boundary: B, prevY: 1.5 });
        });
        note(1300, 0.5, 2.5); note(1700, 1, 3);
        return;
      }
      case 'two': {
        // The first function's note, then (as Tab would) the second function's at the same x.
        const [a, b] = variant === 'higher' ? [1, 4] : [4, 1];
        note(0, 0, a); note(800, 0, b, { voice: OTHER_VOICES.find((n) => n !== v.sound_profile) });
        return;
      }
      case 'slope': {
        // The middle note (flat) on its own first; then a step's note and its slope note.
        at(0, () => e.playSlopeNote(0, 0, B, null, 0));
        note(900, 0, 2);
        at(900, () => e.playSlopeNote(0, variant === 'rising' ? 1.5 : -1.5, B, null, 0.3));
        return;
      }
      case 'shape': {
        const f = { lineUp: (x) => 1.2 * x, lineDown: (x) => -1.2 * x, valley: (x) => (x * x) / 1.5 - 3, peak: (x) => 3 - (x * x) / 1.5, wave: (x) => 3 * Math.sin(1.6 * x) }[variant];
        curve(f, { n: 13, gap: 300, bass: v.bass_mode !== 'off' });
        return;
      }
      default:
    }
  }

  // Help > Settings > Graph sound > Stereo: one note walking from the left edge to the right edge of a
  // graph from minus 10 to 10, with the bass line under it.
  previewStereo(values) {
    const e = this.previewEngineFor(values);
    e.setWindow({ x: [-10, 10], y: [-3, 4] });
    const xs = [-10, -7.5, -5, -2.5, 0, 2.5, 5, 7.5, 10];
    xs.forEach((x, i) => this.previewTimers.push(setTimeout(() => {
      e.playStepSequence({ x, lim: { defined: true, y: 1 }, boundary: 10, prevY: i ? 1 : null, withBassOutline: true });
    }, i * 350)));
    this.previewTimers.push(setTimeout(() => e.stopBassOutline(), xs.length * 350 + 200));
    return 'Left edge to right edge of a graph from minus 10 to 10.';
  }

  preview(values, short = false) {
    const engine = this.previewEngineFor(values);
    const ys = short ? [0, 1, 2, 1, 0] : [0, 0.5, 1, 1.5, 2, 2.5, 3, 2.5, 2, 1.5, 1, 0.5, 0, -0.5, -1, -1.5, -2, -1.5, -1, -0.5, 0];
    const gap = short ? 220 : 300;
    this.previewTimers = ys.map((y, i) => setTimeout(() => {
      const x = -4 + (8 * i) / (ys.length - 1);
      engine.playSeatedPulse(x, y, 4, i ? ys[i - 1] : null);
    }, i * gap));
    if (!short) {
      const end = ys.length * gap + 300;
      this.previewTimers.push(setTimeout(() => engine.playLandmarkEffect('solid-point', 0, 4, 1), end));
      this.previewTimers.push(setTimeout(() => engine.playLandmarkEffect('open-point', 0, 4, 1), end + 700));
    }
    return short ? '' : 'Up from 0 to 3, down to minus 2, back to 0; then a solid dot and an open dot.';
  }

  // graph: { title, summary, span: {x:[a,b], y:[c,d]}, curves: [...], points: [...], equations: [...] }
  open(graph) {
    this.editor.toggle(false);
    this.graph = graph;
    this.index = 0;
    this.lastKey = null; // the function Tab came from, for the difference (minus key)
    this.diffOf = null;
    this.lines = []; // tangent and secant lines added here (T, or the menu); not saved in the document
    this.lineCount = 0;
    this.clock = 0; // counts the things done here, so Backspace knows which came last (tick)
    this.rebuild();
    this.step = STEPS.includes(this.settings.step) ? this.settings.step : 0.5;
    this.free = { x: 0, y: 0 };
    this.x = NaN;
    this.tracing = this.functions.length > 0;
    this.prepareFunction(true);
    this.root.hidden = false;
    this.root.focus();
    const names = this.functions.map((f) => f.label).join('; ');
    this.speak(`Graph mode. ${this.functions.length} ${this.functions.length === 1 ? 'function' : 'functions'}${names ? `: ${names}` : ''}. `
      + `J and K step, Space plays, Control Enter opens a menu of everything, Escape goes back.`);
    this.seedSlide();
    this.draw();
  }

  // The functions, dots and window from this.graph: when it opens, and after every edit.
  // select: a function's key, to make that the selected function.
  rebuild(select = null) {
    const graph = this.graph;
    this.drawn = null; // the same graph may have been edited since
    const span = graph.span || { x: [-5, 5], y: [-5, 5] };
    this.span = span;
    this.sound.setWindow(span);
    this.boundary = Math.max(Math.abs(span.x[0]), Math.abs(span.x[1]), 1);
    // Each function has a key ('drawn:0', 'eq:1', 'd1:eq:1' for a derivative) to select it by,
    // and an owner that its dots carry, so each function sounds only its own dots.
    const made = [], dots = [];
    const derivativeName = (n, name) => `${n === 2 ? 'second ' : ''}derivative of ${name}`;
    const ownDots = (f) => f.dots().map((d) => ({ kind: d.kind === 'open dot' ? 'open-point' : 'solid-point', x: d.x, y: d.y, owner: f.owner,
      label: d.jump ? `jump at x = ${say(d.x)}: ${d.kind} at ${say(d.x)}, ${say(d.y)}` : d.hole ? `hole at ${say(d.x)}, ${say(d.y)}`
        : d.away ? `the value at x = ${say(d.x)} is ${say(d.y)}, away from the curve` : `${d.kind} at ${say(d.x)}, ${say(d.y)}` }));
    // Drawn functions (f, g, ...), each followed by its derivatives when it has them: exact.
    drawingsOf(graph).forEach((d, i) => {
      if (!d.pieces.length) return;
      const name = `${d.name}(x)`;
      let f = { ...drawnFunction(d, `${name}, drawn`), drawing: i, key: `drawn:${i}`, owner: `drawn:${i}` };
      made.push(f);
      dots.push(...ownDots(f));
      for (let n = 1; n <= (d.derivative || 0); n += 1) {
        f = { ...derivativeOf(f, derivativeName(n, name)), of: `drawn:${i}`, order: n, key: `d${n}:drawn:${i}`, owner: `d${n}:drawn:${i}` };
        made.push(f);
        dots.push(...ownDots(f));
      }
    });
    // Equations, each followed by its derivatives: measured from the curve.
    (graph.functions || []).forEach((g, i) => {
      const f = { ...latexFunction(g), source: i, key: `eq:${i}`, owner: i };
      made.push(f);
      const name = /^([a-z]\(x\))\s*=/i.exec(f.label)?.[1] || f.label;
      for (let n = 1; n <= (g.derivative || 0); n += 1) {
        const c = derivativeFunction(f.compiled, n, this.boundary, derivativeName(n, name));
        const key = `d${n}:eq:${i}`;
        made.push({ label: c.label, lo: -Infinity, hi: Infinity, limitAt: (x) => c.graph.limitAt(x), graph: c.graph, compiled: c, derived: true, of: `eq:${i}`, order: n, key, owner: key });
        dots.push(...c.dots.map((p) => ({ kind: 'open-point', x: p.coordinate[0], y: p.coordinate[1], label: dotWords(p), owner: key })));
      }
    });
    this.functions = [
      ...(graph.curves || []).filter((c) => !(c.kind !== 'curve' && c.corners?.length === 2 && c.corners[0][0] === c.corners[1][0])).map((c, i) => ({ ...sampledFunction(c, graph.points || []), key: `curve:${i}` })),
      ...(graph.equations || []).map((text, i) => ({ ...equationFunction(text), key: `plain:${i}` })),
      ...made,
    ];
    // Tangent and secant lines, worked out again from their function (so they follow it when it
    // is changed); one whose function is gone, or has no slope there any more, goes too.
    this.lines = (this.lines || []).filter((entry) => {
      const spec = this.lineSpec(entry);
      if (spec) this.functions.push(lineFunction(spec, span));
      return Boolean(spec);
    });
    // The difference of two of them (the minus key), while both are still there.
    if (this.diffOf) {
      const [a, b] = this.diffOf.map((key) => this.functions.find((f) => f.key === key));
      if (a && b) this.functions.push(differenceFunction(a, b, span.x)); else this.diffOf = null;
    }
    // The pitch scale is the graph's window: the same height is the same note for every function
    // the window was made for. A curve made afterwards from them (a derivative, the difference)
    // can lie well outside it (the derivative of x squared goes to minus 10 where the window
    // stops at minus 2.5) and would be squeezed into the last few notes; for such a curve the
    // scale reaches as far as the curve does, for that curve only.
    for (const f of this.functions) {
      f.pitch = span.y;
      if (!f.of && !f.difference) continue;
      const r = heightRange(f, Math.max(f.lo, span.x[0]), Math.min(f.hi, span.x[1]));
      if (r && (r[0] < span.y[0] || r[1] > span.y[1])) f.pitch = [Math.min(span.y[0], r[0]), Math.max(span.y[1], r[1])];
    }
    // Every function's holes and open ends, for the picture.
    this.shapes = this.functions.flatMap((f) => (f.graph ? landmarksOf(f.graph, this.boundary) : []));
    this.verticals = (graph.curves || []).filter((c) => c.kind !== 'curve' && c.corners?.length === 2 && c.corners[0][0] === c.corners[1][0]);
    this.dots = [...(graph.points || []).map((p) => ({ kind: p.kind === 'open dot' ? 'open-point' : 'solid-point', x: p.coordinate[0], y: p.coordinate[1],
      label: dotWords(p), owner: p.function ?? null })), ...dots];
    const chosen = select ? this.functions.findIndex((f) => f.key === select) : -1;
    if (chosen >= 0) this.index = chosen;
    this.index = Math.max(0, Math.min(this.index || 0, this.functions.length - 1));
  }

  close() {
    this.editor.toggle(false);
    this.pause(false);
    clearTimeout(this.speakTimer); // a position not yet read is not read after leaving
    for (const t of this.scaleTimers || []) clearTimeout(t);
    this.sound.stopBassOutline();
    this.root.hidden = true;
    this.onExit?.();
  }

  get fn() { return this.functions[this.index]; }

  // The new sound design (Help > Settings > Graph sound): one scale for the graph, a slide along
  // the curve into each note, a sound of its own for each function.
  get fittedSound() { return this.settings.sound_design === 'fitted'; }

  // The sound of the selected function: null is the one chosen in Settings.
  voice() {
    if (!this.fittedSound || this.index < 1) return null;
    const others = OTHER_VOICES.filter((name) => name !== this.settings.sound_profile);
    return others[(this.index - 1) % others.length];
  }

  // The heights the lowest and the highest note stand for, for the selected function.
  get pitchSpan() { return this.fn?.pitch || this.span.y; }

  // Has the selected function a scale of its own (see rebuild)?
  get ownScale() { return this.fittedSound && this.pitchSpan !== this.span.y; }

  // The slide into the next step's note starts from where the cursor is now, also for the
  // first step after opening the graph or changing function.
  seedSlide() {
    const lim = this.fn && Number.isFinite(this.x) ? this.fn.limitAt(this.x) : null;
    this.prevY = this.fittedSound && lim?.defined ? lim.y : null;
  }

  // N: the scale by ear. The lowest note, zero when it is on the graph, and the highest note.
  playScale() {
    this.pause(false);
    const [y0, y1] = this.pitchSpan;
    const zero = y0 < 0 && y1 > 0;
    const ys = zero ? [y0, 0, y1] : [y0, y1];
    for (const t of this.scaleTimers || []) clearTimeout(t);
    this.scaleTimers = ys.map((y, i) => setTimeout(() => this.sound.playSeatedPulse(0, y, this.boundary, null, { path: null }), 150 + i * 650));
    const how = this.fittedSound ? '' : ' With the original sound design the notes start again every 10 units, so these are only the notes of those heights.';
    const own = this.ownScale ? ` This curve goes outside the graph, so these are its own notes, not those of the other functions.` : '';
    this.speak(`Lowest note: y ${say(y0)}. ${zero ? 'Then zero. ' : ''}Then the highest note: y ${say(y1)}.${how}${own}`);
  }

  // Minus: the difference between the selected function and the one Tab came from (or the next
  // one), as a function of its own to trace. Minus again takes it away.
  toggleDifference() {
    this.pause(false);
    if (this.diffOf) {
      const back = this.diffOf[0];
      this.diffOf = null;
      this.rebuild(this.fn?.difference ? back : this.fn?.key);
      this.prepareFunction(false);
      this.x = this.onGrid(Math.max(this.lo, Math.min(this.hi, this.x)));
      this.seedSlide();
      this.speak(`Difference removed. ${this.fn ? `${this.fn.label}. ${this.where()}` : ''}`);
      this.draw();
      return;
    }
    const base = this.functions.filter((f) => f.key);
    const first = this.fn;
    if (!first?.key || base.length < 2) { this.speak('The difference needs two functions on the graph, written or drawn here.'); return; }
    const second = base.find((f) => f.key === this.lastKey && f !== first) || base[(base.indexOf(first) + 1) % base.length];
    this.diffOf = [first.key, second.key];
    this.diffSeq = this.tick();
    const keepX = this.tracing ? this.x : this.free.x;
    this.rebuild('difference');
    this.prepareFunction(false);
    this.x = this.onGrid(Math.max(this.lo, Math.min(this.hi, keepX)));
    this.tracing = true;
    this.speak(`${this.fn.label}${this.ownScale ? ', on its own scale' : ''}: above zero where ${shortName(first)} is higher, zero where they cross. Minus takes it away. ${this.where()}`);
    this.sayNote();
    this.draw();
  }

  // The selected function's note where the cursor is, on its own (after Tab).
  sayNote() {
    const lim = this.fn?.limitAt(this.x);
    if (lim?.defined && this.fittedSound) this.sound.playSeatedPulse(this.x, lim.y, this.boundary, null, { path: null, voice: this.voice() });
    this.seedSlide();
  }

  // The curve's heights from one x to another, for the slide into a step's note: null where
  // the curve breaks on the way (a jump, an asymptote, a gap), so nothing slides across it.
  pathBetween(from, to) {
    const f = this.fn;
    if (!this.fittedSound || !Number.isFinite(from) || from === to) return null;
    // Twelve stretches for one step; a longer way (Home, End, a jump to a point of interest)
    // has as many for each step it covers, so a wave is not flattened into a straight slide.
    const n = Math.min(96, 12 * Math.max(1, Math.round(Math.abs(to - from) / this.step)));
    const ys = [];
    for (let i = 0; i <= n; i += 1) {
      const y = heightAt(f, from + ((to - from) * i) / n);
      if (!Number.isFinite(y)) return null;
      ys.push(y);
    }
    // (Asked after the heights: a jump between two of them is a break even where every one exists.)
    return unbroken(f, from, to) ? ys : null;
  }

  // The slope of a curve that was itself measured from another one (an equation's derivative).
  // Its heights are rounded (8 decimals, 5 for a second derivative), so the usual way, which
  // looks a hundred-millionth to each side, would measure the rounding and not the curve.
  // Here the two sides are taken a thousandth (a hundredth) away, closer where a break is near.
  measuredSlope(f, x) {
    const y0 = heightAt(f, x);
    if (!Number.isFinite(y0)) return { slope: null, left: null, right: null };
    const side = (dir) => {
      for (let h = (f.order === 2 ? 1e-2 : 1e-3) * Math.max(1, Math.abs(x)), tries = 0; tries < 3; h /= 10, tries += 1) {
        const y = heightAt(f, x + dir * h);
        if (Number.isFinite(y) && unbroken(f, x, x + dir * h)) return (y - y0) / (dir * h);
      }
      return null;
    };
    const left = side(-1), right = side(1);
    if (left === null || right === null) return { slope: null, left, right };
    const same = Math.abs(left - right) <= 0.02 * (1 + Math.abs(left) + Math.abs(right));
    const tidy = (v) => (Math.abs(v) < 1e-4 ? 0 : Number(v.toFixed(f.order === 2 ? 2 : 4)));
    return same ? { slope: tidy((left + right) / 2), left, right } : { slope: null, left: tidy(left), right: tidy(right) };
  }

  prepareFunction(start) {
    const f = this.fn;
    if (!f) { this.landmarks = []; return; }
    this.sound.setWindow({ x: this.span.x, y: f.pitch || this.span.y });
    let lo = Math.max(f.lo, this.span.x[0]), hi = Math.min(f.hi, this.span.x[1]);
    const own = f.graph ? landmarksOf(f.graph, this.boundary) : f.landmarks();
    // Only where the curve is: y = 1/x on [-4.5, -0.22] is stepped from -4.5 to -0.22, not
    // across the whole window (that started off the curve, at x = 0, and stuck at the edge).
    const defined = (x) => f.limitAt(x).defined;
    const N = 2000;
    const xs = Array.from({ length: N + 1 }, (_, i) => lo + ((hi - lo) * i) / N);
    const firstIn = xs.findIndex(defined);
    if (firstIn >= 0) {
      const lastIn = N - [...xs].reverse().findIndex(defined);
      // The exact end, from the points of interest when one is there (the curve starts at -4.5).
      const edge = (inside, outside) => {
        let a = outside, b = inside;
        for (let k = 0; k < 60; k += 1) { const mid = (a + b) / 2; if (defined(mid)) b = mid; else a = mid; }
        const end = own.find((l) => l.kind === 'endpoint' && Math.abs(l.x - b) < 1e-6);
        return end && defined(end.x) ? end.x : b;
      };
      if (firstIn > 0) lo = edge(xs[firstIn], xs[firstIn - 1]);
      if (lastIn < N) hi = edge(xs[lastIn], xs[lastIn + 1]);
    }
    this.lo = lo; this.hi = hi;
    // A function's own dots (a piecewise jump's open end is off the curve), or any dot it passes through.
    const owner = f.owner;
    const onCurve = this.dots.filter((d) => (d.owner !== null ? d.owner === owner
      : Math.abs((f.limitAt(d.x).y ?? NaN) - d.y) < 0.15 || !f.limitAt(d.x).defined
        || (f.piece && f.piece(d.x - 1e-6) !== f.piece(d.x + 1e-6) && f.piece(d.x - 1e-6) >= 0))); // both dots of a drawn jump
    // A student copy can keep some points of interest for the student to find.
    const hidden = new Set(this.graph.hidden || []);
    // Where this function crosses each other one. (Not on a student copy that hides anything:
    // where two curves meet may be the question. Not for the difference: its zeros are these.)
    // A tangent touches its curve without crossing it, which the search for crossings cannot
    // see; that point is known, so it is given by name (from the curve and from the line).
    const touch = (g) => { const [line, other] = f.line ? [f, g] : [g, f]; return line.line?.kind === 'tangent' && line.line.of === other.key ? line.line : null; };
    const crossings = hidden.size || f.difference ? [] : this.functions.filter((g) => g !== f && !g.difference).flatMap((g) => {
      const t = touch(g);
      const found = crossingsOf(f, g, lo, hi).filter(({ x }) => !t || Math.abs(x - t.a) > 1e-4)
        .map(({ x, y }) => ({ kind: 'crossing', x, y, label: `crosses ${shortName(g)} at ${say(x)}, ${say(y)}` }));
      if (t && t.a >= lo - 1e-9 && t.a <= hi + 1e-9) found.push({ kind: 'crossing', x: t.a, y: t.ya, label: `${f.line ? `touches ${shortName(g)}` : `${shortName(g)} touches`} here, at ${say(t.a)}, ${say(t.ya)}` });
      return found;
    });
    this.landmarks = [...own.map((l) => ({ ...l, label: spokenLabel(l) })), ...onCurve, ...crossings]
      .filter((l) => !hidden.has(l.kind) && l.x >= lo - 1e-9 && l.x <= hi + 1e-9).sort((a, b) => a.x - b.x);
    if (start) {
      // At x = 0 when the curve is there, otherwise at the first step on the curve.
      const at = this.onGrid(Math.max(lo, Math.min(hi, 0)));
      const firstStep = Math.ceil((lo - 1e-9) / this.step) * this.step;
      this.x = at >= lo - 1e-9 && at <= hi + 1e-9 ? at : firstStep <= hi ? firstStep : lo;
    }
    this.prevY = null;
    this.prevSlope = null;
  }

  onGrid(x) { return Math.round(x / this.step) * this.step; }

  speak(text, delay = 0) {
    clearTimeout(this.speakTimer);
    const write = () => {
      this.status.textContent = '';
      setTimeout(() => { this.status.textContent = text; }, 20);
      if (this.reading) this.reading.textContent = text;
    };
    if (delay) this.speakTimer = setTimeout(write, delay); else write();
  }

  where() {
    if (!this.tracing) {
      const on = this.functionsAt(this.free.x, this.free.y);
      return `x ${exact(this.free.x)}, y ${exact(this.free.y)}${on.length ? `, on ${on.map((f) => f.label).join(' and ')}` : ''}`;
    }
    const lim = this.fn.limitAt(this.x);
    if (lim.defined) return `x ${exact(this.x)}, y ${say(lim.y)}`;
    if (lim.hole) return `x ${exact(this.x)}: a hole; the curve approaches y ${say(lim.y)}`;
    return `x ${exact(this.x)}: no point on ${this.fn.label} here`;
  }

  functionsAt(x, y) {
    return this.functions.filter((f) => { const l = f.limitAt(x); return l.defined && Math.abs(l.y - y) <= this.step / 2 + 1e-9; });
  }

  // One step along the selected function, Sound Lab style.
  traceTo(x, withBass) {
    const f = this.fn;
    if (!f) return;
    const clamped = Math.max(this.lo, Math.min(this.hi, x));
    const events = findStepEvents(this.landmarks, this.x, clamped);
    // The slide into the note follows the curve from the last step, when that step was sounded.
    const path = this.prevY === null ? null : this.pathBetween(this.x, clamped);
    // Home, End and other long ways fly over many points of interest; sounding one of them (the
    // origin's chime, say) as if it were here would mislead. A step or two sounds what it passes.
    const far = Math.abs(clamped - this.x) > this.step * 2 + 1e-9;
    this.x = clamped;
    const lim = f.limitAt(this.x);
    this.sound.playStepSequence({ x: this.x, lim, boundary: this.boundary, prevY: this.prevY, passedOver: far ? [] : events.passedOver, landedOn: events.landedOn, withBassOutline: withBass,
      path: this.fittedSound ? path : undefined, voice: this.voice() });
    if (lim.defined || lim.hole) this.prevY = lim.y;
    if (this.slopeSound) {
      const m = lim.defined ? this.slopeAt(this.x).slope : null;
      // New design: the slope note comes after the height's note, half a step later; original: over it.
      this.sound.playSlopeNote(this.x, m, this.boundary, this.prevSlope, this.fittedSound ? this.settings.play_speed_ms * 0.0005 : Math.min(0.15, this.settings.play_speed_ms * 0.00045), this.voice());
      this.prevSlope = m;
    }
    this.draw();
    const landed = events.landedOn.map((l) => l.label).join('; ');
    if (!withBass) this.speak(`${this.where()}${landed ? `. ${landed}` : ''}`, MOVE_SPEECH_MS);
  }

  moveFree(dx, dy) {
    this.pause(false);
    if (this.tracing) {
      const lim = this.fn?.limitAt(this.x);
      this.free = { x: this.x, y: lim?.defined ? this.onGrid(lim.y) : 0 };
      this.tracing = false;
    }
    const x = Math.max(this.span.x[0], Math.min(this.span.x[1], this.free.x + dx * this.step));
    const y = Math.max(this.span.y[0], Math.min(this.span.y[1], this.free.y + dy * this.step));
    this.free = { x: Number(x.toFixed(6)), y: Number(y.toFixed(6)) };
    // No bass while you move yourself; a curve's own tone plays when you land on it.
    const on = this.functionsAt(this.free.x, this.free.y);
    const dot = this.dots.find((d) => Math.abs(d.x - this.free.x) < this.step / 2 && Math.abs(d.y - this.free.y) < this.step / 2);
    if (!this.settings.free_move_tones) { /* tones turned off in Settings; the position is still read */ }
    else if (Math.abs(this.free.x) < 1e-9 && Math.abs(this.free.y) < 1e-9) this.sound.playLandmarkEffect('origin', 0, this.boundary, 0);
    else if (dot) this.sound.playLandmarkEffect(dot.kind, dot.x, this.boundary, dot.y, dot);
    else if (on.length) this.sound.playSeatedPulse(this.free.x, on[0].limitAt(this.free.x).y, this.boundary, null);
    this.draw();
    this.speak(this.where() + (dot ? `, ${dot.label}` : '') + this.editor.hint(), MOVE_SPEECH_MS);
  }

  play() {
    if (this.timer) { this.pause(true); return; }
    if (!this.fn) return;
    this.tracing = true;
    if (this.x >= this.hi - 1e-9) this.x = this.onGrid(this.lo) < this.lo ? this.onGrid(this.lo) + this.step : this.onGrid(this.lo);
    this.speak('Playing.');
    this.timer = setInterval(() => {
      if (this.x >= this.hi - 1e-9) { this.pause(true); return; }
      this.traceTo(Math.min(this.hi, this.onGrid(this.x) + this.step), true);
    }, this.settings.play_speed_ms);
  }

  pause(announce) {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
    this.sound.stopBassOutline();
    if (announce) this.speak(`Stopped at ${this.where()}.`); // the coordinate where it stopped
  }

  jumpLandmark(direction) {
    this.pause(false);
    this.tracing = true;
    const list = direction > 0 ? this.landmarks.filter((l) => l.x > this.x + 1e-9) : this.landmarks.filter((l) => l.x < this.x - 1e-9).reverse();
    if (!list.length) { this.speak(direction > 0 ? 'No more points of interest to the right.' : 'No more points of interest to the left.'); return; }
    this.traceTo(list[0].x, false);
    // Everything at that x is read together: a jump's two dots and the axis crossing there.
    const here = this.landmarks.filter((l) => Math.abs(l.x - list[0].x) < 1e-9);
    this.speak([...new Set(here.map((l) => l.label))].join('; '));
  }

  sideLimit(x, dir, f = this.fn) {
    return estimateSide((t) => heightAt(f, t), x, dir);
  }

  // L: the limits at the cursor from the left and the right, and the value there.
  limits() {
    if (!this.fn) return 'No function to read.';
    const x = this.tracing ? this.x : this.free.x;
    const words = (l) => (!l ? 'no limit' : l.uncertain ? 'could not estimate' : l.infinite ? (l.infinite > 0 ? 'goes up to infinity' : 'goes down to minus infinity') : say(l.value));
    const left = this.sideLimit(x, -1), right = this.sideLimit(x, 1);
    const here = this.fn.limitAt(x);
    const value = here.defined ? `the value is ${say(here.y)}` : 'there is no point here';
    const same = left && right && !left.infinite && !right.infinite && Math.abs(left.value - right.value) <= 1e-4 * (1 + Math.abs(left.value));
    let verdict;
    if (left?.uncertain || right?.uncertain) verdict = 'Could not estimate the limit reliably.';
    else if (same) verdict = here.defined && Math.abs(here.y - left.value) <= 1e-4 * (1 + Math.abs(here.y)) ? 'Continuous here.' : here.defined ? 'The limit and the value differ.' : 'A hole: the limit exists, but there is no point.';
    else if (left && right && left.infinite && left.infinite === right.infinite) verdict = 'A vertical asymptote.';
    else if (left && right) verdict = left.infinite || right.infinite ? 'A vertical asymptote: the two sides differ.' : 'No limit: the two sides differ, a jump.';
    else if (left?.infinite || right?.infinite) verdict = 'A vertical asymptote.';
    else verdict = !left && !right ? 'No curve on either side.' : `The curve is only on the ${left ? 'left' : 'right'}.`;
    const sides = same ? `from both sides ${say(left.value)}` : `from the left ${words(left)}, from the right ${words(right)}`;
    return `At x = ${exact(x)}: ${sides}; ${value}. ${verdict}`;
  }

  // The slope at x from the curve's heights on each side: { slope } where both sides agree,
  // otherwise { left, right } (a corner, a jump or an end), each null where there is none.
  slopeAt(x, f = this.fn) {
    if (f.derived) return this.measuredSlope(f, x);
    const y = (t) => { const l = f.limitAt(t); return l.defined ? l.y : NaN; };
    const y0 = y(x);
    if (!Number.isFinite(y0)) return { slope: null, left: null, right: null };
    const limits = [-1, 1].map((dir) => this.sideLimit(x, dir, f));
    const jump = limits.some((limit) => Number.isFinite(limit?.value) &&
      Math.abs(limit.value - y0) > 1e-6 * (1 + Math.abs(y0)));
    if (jump) return { slope: null, left: null, right: null, jump };
    const side = (dir) => estimateSide((t) => (y(t) - y0) / (t - x), x, dir, Math.abs(y0) * Number.EPSILON * 2);
    const estimates = [side(-1), side(1)];
    if (estimates.some((limit) => limit?.uncertain)) return { slope: null, left: null, right: null, uncertain: true };
    const [left, right] = estimates.map((limit) => limit?.infinite ? limit.infinite * Infinity : limit?.value ?? null);
    const same = left !== null && right !== null && (left === right ||
      (Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= 0.02 * (1 + Math.abs(left) + Math.abs(right))));
    if (same) return { slope: Number.isFinite(left) ? (left + right) / 2 : left, left, right };
    return { slope: null, left, right };
  }

  // S: the slope at the cursor, in words. A graph drawn on the page (no formula) gives an estimate.
  slope() {
    if (!this.fn) return 'No function to read.';
    const x = this.tracing ? this.x : this.free.x;
    const about = this.fn.compiled || this.fn.graph || this.fn.exact ? '' : 'about ';
    const { slope, left, right, jump, uncertain } = this.slopeAt(x);
    if (uncertain) return `At x = ${exact(x)}: could not estimate the slope reliably.`;
    if (jump) return `At x = ${exact(x)}: no single slope, the curve jumps here.`;
    if (slope !== null) return `At x = ${exact(x)}: ${slopeWords(slope, about)}.`;
    if (left === null && right === null) return `At x = ${exact(x)}: no slope, there is no point here.`;
    if (left === null || right === null) return `At x = ${exact(x)}: the curve ${left === null ? 'starts' : 'ends'} here; from the ${left === null ? 'right' : 'left'}, ${slopeWords(left ?? right, about)}.`;
    return `At x = ${exact(x)}: no single slope, a corner. From the left, ${slopeWords(left, about)}; from the right, ${slopeWords(right, about)}.`;
  }

  describe() {
    // Functions with their formula are described afresh, a stored description (a student copy,
    // a PDF graph) as written. Its points have two decimals whatever Settings asks for moving
    // along the curve: a zero at minus 0.67 said "minus 0.5" was a wrong answer (owner's report).
    this.speak(exactly(() => this.description()));
  }

  description() {
    const span = this.span;
    const own = this.functions.filter((f) => f.compiled || f.dots);
    const hiddenKinds = new Set(this.graph.hidden || []);
    const hide = Object.keys(HIDEABLE).filter((k) => HIDEABLE[k].kinds.every((kind) => hiddenKinds.has(kind)));
    const shown = `Shown for x from ${say(span.x[0])} to ${say(span.x[1])} and y from ${say(span.y[0])} to ${say(span.y[1])}.`;
    // A graph read from a page keeps the words it came with (read: as they were before it was drawn on).
    const read = this.functions.some((f) => !f.compiled && !f.dots && !f.difference && !f.line) ? roundWords(this.graph.read ?? this.graph.summary ?? '') : '';
    const words = own.length
      ? `${read ? `${read} ` : ''}${own.map((f) => { const p = f.dots ? describeDrawn(f) : describeFunction(f.compiled, span.x, hide); return `${f.label}${p.length ? `: ${p.join('; ')}` : ''}`; }).join('. ')}. ${shown}`
      : this.functions.length ? read : this.graph.drawing || this.graph.drawings ? `Empty graph, ready to draw on. ${shown}` : roundWords(this.graph.summary || '');
    const parts = [words];
    if (this.verticals.length) parts.push(`${this.verticals.length} vertical ${this.verticals.length === 1 ? 'line is' : 'lines are'} not traced, because a vertical line is not a function of x.`);
    return parts.join(' ').trim() || 'No description.';
  }

  // Tab: the next function (back: the previous one), at the same x.
  nextFunction(back = false) {
    if (!this.functions.length) return;
    this.pause(false);
    this.lastKey = this.fn.key ?? null;
    this.index = (this.index + (back ? this.functions.length - 1 : 1)) % this.functions.length;
    const keepX = this.tracing ? this.x : this.free.x;
    this.prepareFunction(false);
    this.x = this.onGrid(Math.max(this.lo, Math.min(this.hi, keepX)));
    this.tracing = true;
    this.editor.follow();
    this.speak(`${this.fn.label}${this.ownScale ? ', on its own scale' : ''}. ${this.where()}`);
    // Its note at the same x, in its own sound: higher or lower than the function you left
    // (unless the curve has a scale of its own, which the words then say).
    this.sayNote();
    this.draw();
  }

  toggleSlopeSound() {
    this.slopeSound = !this.slopeSound;
    this.prevSlope = null;
    this.speak(this.slopeSound ? 'Slope sound on: after each note, a soft second note for the slope. High is rising, the middle note is flat, low is falling.' : 'Slope sound off.');
  }

  setStep(step) {
    this.step = step;
    this.speak(`Step ${exact(this.step)}.`);
  }

  // ---------- tangent and secant lines ----------

  // The line for an entry of this.lines ({ id, kind, of, a, b }), from its function as it is
  // now: null when the function is gone or the line cannot be drawn there any more.
  lineSpec(entry) {
    const f = this.functions.find((g) => g.key === entry.of);
    const ya = f ? heightAt(f, entry.a) : NaN;
    if (!Number.isFinite(ya)) return null;
    let m, yb;
    if (entry.kind === 'tangent') m = this.slopeAt(entry.a, f).slope;
    else { yb = heightAt(f, entry.b); m = (yb - ya) / (entry.b - entry.a); }
    if (typeof m !== 'number' || !Number.isFinite(m)) return null;
    m = Number(m.toFixed(6)) || 0;
    const c = Number((ya - m * entry.a).toFixed(6)) || 0;
    const several = this.lines.filter((l) => l.kind === entry.kind).length > 1;
    const at = entry.kind === 'tangent' ? `at x = ${exact(entry.a)}` : `through x = ${exact(entry.a)} and x = ${exact(entry.b)}`;
    return { ...entry, key: `line:${entry.id}`, m, c, ya, yb,
      label: `${entry.kind} line to ${shortName(f)} ${at}, ${lineWords(m, c)}`,
      short: `the ${entry.kind} line${several ? ` ${at}` : ''}` };
  }

  // Adds a line and stays on the function it belongs to. A line that is already there (the
  // same tangent, the secant through the same two points) is not added again: its words are said.
  addLine(entry, words) {
    const f = this.fn;
    const same = (p, q) => Math.abs(p - q) < 1e-9;
    const had = this.lines.find((l) => l.of === f.key && l.kind === entry.kind
      && (entry.kind === 'tangent' ? same(l.a, entry.a) : (same(l.a, entry.a) && same(l.b, entry.b)) || (same(l.a, entry.b) && same(l.b, entry.a))));
    if (had) {
      const line = this.functions.find((g) => g.line?.id === had.id);
      this.speak(exactly(() => `Already on the graph: ${line ? line.label : `that ${entry.kind} line`}. Tab goes to it.`));
      return;
    }
    this.lines.push({ id: this.lineCount += 1, of: f.key, seq: this.tick(), ...entry });
    this.rebuild(f.key);
    this.prepareFunction(false);
    this.seedSlide();
    const spec = this.functions.find((g) => g.line?.id === this.lineCount)?.line;
    this.speak(spec ? exactly(() => words(spec)) : 'The line could not be added here.');
    this.draw();
  }

  // T: the tangent line to the selected function where the cursor is.
  addTangent() {
    this.pause(false);
    const f = this.fn;
    if (!f) { this.speak('No function to draw a tangent to.'); return; }
    if (f.line) { this.speak('This is a straight line already: its tangent is the line itself.'); return; }
    const a = this.tracing ? this.x : this.free.x;
    if (!f.limitAt(a).defined) { this.speak(`No point on ${shortName(f)} at x = ${exact(a)}, so no tangent line.`); return; }
    const { slope, left, right, jump, uncertain } = this.slopeAt(a, f);
    if (slope === null) {
      this.speak(jump ? 'The curve jumps here, so it has no tangent line.'
        : uncertain ? 'The slope here could not be measured reliably, so no tangent line was added.'
          : left !== null && right !== null ? `A corner: ${slopeWords(left)} from the left, ${slopeWords(right)} from the right. There is no single tangent line here.`
            : 'The curve starts or ends here, so it has no tangent line on both sides.');
      return;
    }
    if (!Number.isFinite(slope)) { this.speak(`The tangent here is vertical: the line x = ${exact(a)}. A vertical line is not a function of x, so it cannot be added.`); return; }
    this.addLine({ kind: 'tangent', a }, (l) => `Tangent line at x = ${exact(a)}, where y is ${say(l.ya)}: ${lineWords(l.m, l.c)}. It touches the curve here with the same slope. Tab goes to it.`);
  }

  // The secant line through the curve at the cursor and at another x. Returns what is wrong
  // with that x, in words, or null when the line was added.
  addSecant(text) {
    const f = this.fn;
    const a = this.tracing ? this.x : this.free.x;
    const b = typeof text === 'number' ? text : Number(String(text).trim().replace(/−/g, '-').replace(/^minus\s*/i, '-'));
    if (!Number.isFinite(b)) return 'Write a number, such as 3 or -1.5.';
    if (Math.abs(b - a) < 1e-9) return `The other x must be different from ${exact(a)}: a secant line goes through two points.`;
    if (!Number.isFinite(heightAt(f, b))) return `${shortName(f)} has no point at x = ${exact(b)}.`;
    this.addLine({ kind: 'secant', a, b }, (l) => `Secant line through ${exact(a)}, ${say(l.ya)} and ${exact(b)}, ${say(l.yb)}: ${lineWords(l.m, l.c)}. Its slope, ${exact(l.m)}, is the average rate of change between them. Tab goes to it.`);
    return null;
  }

  askSecant() {
    this.pause(false);
    const f = this.fn;
    if (!f) { this.speak('No function to draw a secant to.'); return; }
    if (f.line) { this.speak('This is a straight line already. Go to a function with Tab first.'); return; }
    const a = this.tracing ? this.x : this.free.x;
    if (!f.limitAt(a).defined) { this.speak(`No point on ${shortName(f)} at x = ${exact(a)}, so no secant line from here.`); return; }
    const other = a + 1 <= this.hi ? a + 1 : a - 1;
    this.editor.ask('Secant line', `The line goes through the curve at x = ${exact(a)} and at another x. The other x`, String(Number(other.toFixed(6))), (text) => this.addSecant(text));
  }

  tick() { return (this.clock = (this.clock || 0) + 1); }

  // Delete or Backspace: takes back the last thing done here, whichever it was: a change to
  // the drawing (while drawing is on), a tangent or secant line, or the difference curve.
  takeBack() {
    if (this.editor.grab || this.editor.tune) { this.speak('Finish moving the point or changing the numbers first: Enter or Escape.'); return; }
    this.pause(false);
    const edit = this.editor.on && this.editor.stamps.length ? this.editor.stamps.at(-1) : 0;
    const line = this.lines.reduce((best, l) => (!best || l.seq > best.seq ? l : best), null);
    const diff = this.diffOf ? this.diffSeq || 0 : 0;
    const last = Math.max(edit, line?.seq || 0, diff);
    if (!last) { this.speak(this.editor.on ? 'Nothing to take back.' : 'Nothing to take back. Backspace takes back the last line or curve you added here.'); return; }
    if (last === edit) this.editor.undo();
    else if (last === diff) this.toggleDifference();
    else this.removeLine(line);
  }

  removeLine(entry) {
    const back = this.fn?.line?.id === entry.id ? entry.of : this.fn?.key;
    const at = entry.kind === 'tangent' ? `at x = ${exact(entry.a)}` : `through x = ${exact(entry.a)} and x = ${exact(entry.b)}`;
    this.lines = this.lines.filter((l) => l !== entry);
    this.rebuild(back);
    this.prepareFunction(false);
    this.x = this.onGrid(Math.max(this.lo, Math.min(this.hi, this.x)));
    this.seedSlide();
    this.speak(`Taken away: the ${entry.kind} line ${at}. ${this.fn ? `${this.fn.label}. ${this.where()}` : ''}`);
    this.draw();
  }

  removeLines() {
    this.pause(false);
    const back = this.fn?.line ? this.fn.line.of : this.fn?.key;
    this.lines = [];
    this.rebuild(back);
    this.prepareFunction(false);
    this.x = this.onGrid(Math.max(this.lo, Math.min(this.hi, this.x)));
    this.seedSlide();
    this.speak(`Tangent and secant lines removed. ${this.fn ? `${this.fn.label}. ${this.where()}` : ''}`);
    this.draw();
  }

  // ---------- the menu (Control+Enter; M when not drawing) ----------

  // Everything graph mode can do where the cursor is, each with its key, so no key has to be
  // remembered. [{ label, key, run }]: key is the one that also works inside the menu.
  menuItems() {
    const list = [], f = this.fn, drawing = this.editor.on;
    // name: the key as it is written after the label; key: what to press inside the menu.
    const add = (label, run, name = '', key = name.length === 1 ? name : '') => list.push({ label: name ? `${label} (${name})` : label, key: key || undefined, run });
    // While drawing, some letters belong to drawing, so they are not offered as keys here.
    const free = (name) => (drawing ? '' : name);
    if (f) {
      add('Play the curve from here', () => this.play(), 'Space');
      add('Next point of interest', () => this.jumpLandmark(1), free('period'), drawing ? '' : '.');
      add('Previous point of interest', () => this.jumpLandmark(-1), free('comma'), drawing ? '' : ',');
      add('Read this point', () => this.speak(this.where()), 'V');
      add('Slope here', () => this.speak(this.slope()), 'S');
      add('Limits from the left and the right', () => this.speak(this.limits()), 'L');
      if (!f.line) add('Add the tangent line here', () => this.addTangent(), free('T'));
      if (!f.line) add('Add a secant line through this point and another one', () => this.askSecant());
    }
    if (this.lines.length || this.diffOf || (drawing && this.editor.history.length)) add('Take back the last thing you did', () => this.takeBack(), 'Backspace', '');
    if (this.lines.length) add(this.lines.length === 1 ? `Remove ${this.functions.find((g) => g.line)?.short}` : `Remove the ${this.lines.length} tangent and secant lines`, () => this.removeLines());
    add('Describe the graph', () => this.describe(), 'I');
    if (this.functions.length > 1) add('Next function', () => this.nextFunction(false), 'Tab');
    if (this.diffOf) add('Take the difference curve away', () => this.toggleDifference(), 'minus', '-');
    else if (this.functions.filter((g) => g.key).length > 1) add('Difference between this function and another, as a curve', () => this.toggleDifference(), 'minus', '-');
    if (f) add('Hear the lowest and the highest note', () => this.playScale(), free('N'));
    add(this.slopeSound ? 'Turn the slope sound off' : 'Turn the slope sound on: a second note for the slope after each step', () => this.toggleSlopeSound(), 'D');
    add(`Change the step, now ${exact(this.step)}`, () => this.editor.show('Step along x', STEPS.map((v) => ({ label: `${exact(v)}${v === this.step ? ', the step now' : ''}`, run: () => this.setStep(v) }))), 'F');
    if (f) {
      add('Go to the start of the curve', () => { this.tracing = true; this.traceTo(this.lo, false); }, 'Home', '');
      add('Go to the end of the curve', () => { this.tracing = true; this.traceTo(this.hi, false); }, 'End', '');
      if (!this.tracing) add('Back onto the function', () => { this.x = this.onGrid(Math.max(this.lo, Math.min(this.hi, this.free.x))); this.tracing = true; this.traceTo(this.x, false); }, 'C');
    }
    if (drawing) add('The drawing menu', () => this.editor.openMenu(), 'M', '');
    add(drawing ? 'Stop drawing' : 'Draw on the graph', () => this.editor.toggle(), 'Ctrl+D', '');
    add('All the keys', () => this.onKeys?.(), 'F1', '');
    add('Back to the document', () => this.close(), 'Escape', '');
    return list;
  }

  openMenu() {
    if (this.editor.grab || this.editor.tune) { this.speak('Finish moving the point or changing the numbers first: Enter or Escape.'); return; }
    this.pause(false);
    clearTimeout(this.speakTimer);
    this.editor.show(`Graph menu${this.fn ? `, on ${shortName(this.fn)} at ${this.where()}` : ''}`, this.menuItems());
  }

  // The same actions from Math > Graph (for mouse users, and to find them by name).
  command(name) {
    const keys = { play: ' ', next: '.', previous: ',', describe: 'i', read: 'v', step: 'f', function: 'Tab', close: 'Escape', slope: 's', limits: 'l', slopeSound: 'd', scale: 'n', difference: '-' };
    this.root.focus();
    if (name === 'edit') { this.editor.toggle(); return; }
    if (name === 'menu') { this.openMenu(); return; }
    if (name === 'tangent') { this.addTangent(); return; }
    if (name === 'secant') { this.askSecant(); return; }
    this.key({ key: keys[name], shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, preventDefault() {} });
  }

  key(e) {
    // A key held down sends itself again and again. For keys that add, remove or switch
    // something, only the first counts: T held a moment added two tangent lines, and
    // Backspace held would take back step after step.
    if (e.repeat && ONCE_KEYS.includes(e.key)) { e.preventDefault(); return; }
    // Drawing (Ctrl+D) has the first say: its own keys, and Enter and the arrows at the edge.
    if (this.editor.key(e)) return;
    // Control+Enter: the menu of everything graph mode can do, drawing or not.
    if (e.key === 'Enter' && e.ctrlKey && !e.altKey && !e.metaKey) { e.preventDefault(); this.openMenu(); return; }
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const k = e.key;
    const handled = () => e.preventDefault();
    // (While drawing, M and the Applications key are the drawing menu, and T changes numbers.)
    if (k === 'm' || k === 'M' || k === 'ContextMenu' || (k === 'F10' && e.shiftKey)) { handled(); this.openMenu(); return; }
    if (k === 't' || k === 'T') { handled(); this.addTangent(); return; }
    if (k === 'Backspace' || k === 'Delete') { handled(); this.takeBack(); return; }
    // The keys as a table to read row by row (not one long sentence).
    if ((k === 'F1' || k === '?' || k === 'h' || k === 'H') && this.onKeys) { handled(); this.pause(false); this.onKeys(); return; }
    if (k === 'Escape') { handled(); this.close(); return; }
    if (k === 'k' || k === 'K') { handled(); this.pause(false); this.tracing = true; this.traceTo(this.onGrid(this.x) + this.step, false); return; }
    if (k === 'j' || k === 'J') { handled(); this.pause(false); this.tracing = true; this.traceTo(this.onGrid(this.x) - this.step, false); return; }
    if (k === 'ArrowRight') { handled(); this.moveFree(1, 0); return; }
    if (k === 'ArrowLeft') { handled(); this.moveFree(-1, 0); return; }
    if (k === 'ArrowUp') { handled(); this.moveFree(0, 1); return; }
    if (k === 'ArrowDown') { handled(); this.moveFree(0, -1); return; }
    if (k === ' ') { handled(); this.play(); return; }
    if (k === 'Tab') { handled(); this.nextFunction(e.shiftKey); return; }
    if (k === 'c' || k === 'C') {
      handled(); this.pause(false);
      this.x = this.onGrid(Math.max(this.lo, Math.min(this.hi, this.tracing ? this.x : this.free.x)));
      this.tracing = true; this.traceTo(this.x, false); return;
    }
    if (k === 'v' || k === 'V' || k === 'Enter') { handled(); this.speak(this.where()); return; }
    if (k === 'i' || k === 'I') { handled(); this.describe(); return; }
    if (k === 's' || k === 'S') { handled(); this.pause(false); this.speak(this.slope()); return; }
    if (k === 'l' || k === 'L') { handled(); this.pause(false); this.speak(this.limits()); return; }
    if (k === 'd' || k === 'D') { handled(); this.toggleSlopeSound(); return; }
    if (k === 'n' || k === 'N') { handled(); this.playScale(); return; }
    if (k === '-' || k === '_') { handled(); this.toggleDifference(); return; }
    if (k === '.') { handled(); this.jumpLandmark(1); return; }
    if (k === ',') { handled(); this.jumpLandmark(-1); return; }
    if (k === 'Home') { handled(); this.pause(false); this.tracing = true; this.traceTo(this.lo, false); return; }
    if (k === 'End') { handled(); this.pause(false); this.tracing = true; this.traceTo(this.hi, false); return; }
    if (k === 'f' || k === 'F') { handled(); this.setStep(STEPS[(STEPS.indexOf(this.step) + (e.shiftKey ? STEPS.length - 1 : 1)) % STEPS.length]); return; }
    if (k === '?' || k === 'h' || k === 'H') {
      handled();
      this.speak('J and K step, Space plays, period and comma jump, S slope, L limits, I describes, Escape goes back.');
    }
  }

  // A picture for sighted helpers; hidden from screen readers. The curves are drawn again
  // only when the graph or the selected function changes; a step just moves the cursor ring
  // (redrawing every curve on each arrow press made moving lag).
  draw() {
    const svg = this.root.querySelector('svg');
    if (!svg) return;
    const [x0, x1] = this.span.x, [y0, y1] = this.span.y;
    const W = 600, H = 400;
    const px = (x) => ((x - x0) / (x1 - x0)) * W, py = (y) => H - ((y - y0) / (y1 - y0)) * H;
    const cx = this.tracing ? this.x : this.free.x;
    const cy = this.tracing ? this.fn?.limitAt(this.x).y : this.free.y;
    if (this.drawn !== this.graph || this.drawnIndex !== this.index || !svg.querySelector('.graph-cursor')) {
      this.drawPicture(svg, W, H, px, py);
      this.drawn = this.graph;
      this.drawnIndex = this.index;
    }
    // The editor's layer (points, what Enter would draw) lies under the cursor ring.
    let layer = svg.querySelector('.edit-layer');
    if (!layer) {
      layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      layer.setAttribute('class', 'edit-layer');
      svg.insertBefore(layer, svg.querySelector('.graph-cursor'));
    }
    this.editor.paint(layer, px, py);
    const ring = svg.querySelector('.graph-cursor');
    ring.setAttribute('visibility', Number.isFinite(cy) ? 'visible' : 'hidden');
    if (Number.isFinite(cy)) { ring.setAttribute('cx', px(cx)); ring.setAttribute('cy', py(cy)); }
  }

  drawPicture(svg, W, H, px, py) {
    const [x0, x1] = this.span.x, [y0, y1] = this.span.y;
    const paths = this.functions.map((f, n) => {
      let d = '', pen = false, prev = null;
      const room = (y1 - y0) * 0.5;
      for (let i = 0; i <= 600; i += 1) {
        const x = x0 + (x1 - x0) * i / 600, l = f.limitAt(x);
        // The pen lifts at a jump or an asymptote, so no false line joins the two sides
        // (where two rows of a piecewise function meet at the same height, it carries on).
        const joined = prev !== null && (f.graph ? f.graph.isContinuousBetween(prev.x, x) || Math.abs(l.y - prev.y) < (y1 - y0) * 0.02
          : !f.piece || f.piece(prev.x) === f.piece(x));
        if (l.defined && l.y >= y0 - room && l.y <= y1 + room) { d += `${pen && joined ? 'L' : 'M'}${px(x).toFixed(1)},${py(l.y).toFixed(1)}`; pen = true; } else pen = false;
        prev = l.defined ? { x, y: l.y } : null;
      }
      return `<path d="${d}" fill="none" stroke="${n === this.index ? 'var(--accent)' : 'var(--muted)'}" stroke-width="${n === this.index ? 3 : 1.5}"/>`;
    }).join('');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    // Axis numbers at whole steps (about ten of them), so a sighted helper can read the picture.
    const ticks = (lo, hi) => { const step = 10 ** Math.floor(Math.log10((hi - lo) / 2)) * ([1, 2, 5].find((m) => (hi - lo) / (10 ** Math.floor(Math.log10((hi - lo) / 2)) * m) <= 12) || 10); const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Number(v.toPrecision(10))); return out; };
    const axisY = Math.min(H - 4, Math.max(12, py(0))), axisX = Math.min(W - 24, Math.max(4, px(0)));
    // (No number right at the edge, where it would be cut off.)
    const inside = (lo, hi) => (v) => v !== 0 && v > lo + (hi - lo) * 0.03 && v < hi - (hi - lo) * 0.03;
    const labels = ticks(x0, x1).filter(inside(x0, x1)).map((v) => `<text x="${px(v)}" y="${axisY + 14}" text-anchor="middle">${v}</text><line x1="${px(v)}" y1="${axisY - 3}" x2="${px(v)}" y2="${axisY + 3}" stroke="var(--muted)"/>`).join('')
      + ticks(y0, y1).filter(inside(y0, y1)).map((v) => `<text x="${axisX + 6}" y="${py(v) + 4}">${v}</text><line x1="${axisX - 3}" y1="${py(v)}" x2="${axisX + 3}" y2="${py(v)}" stroke="var(--muted)"/>`).join('');
    // A formula's own holes ((x^2-4)/(x-2) at 2) and ends that are left out are open circles too.
    const own = (this.shapes || []).filter((l) => (l.kind === 'open-point' && !this.dots.some((d) => Math.abs(d.x - l.x) < 1e-9)) || (l.kind === 'endpoint' && !l.included));
    const dots = [...(this.dots || []), ...own.map((l) => ({ kind: 'open-point', x: l.x, y: l.y }))].map((d) => `<circle cx="${px(d.x)}" cy="${py(d.y)}" r="4.5" fill="${d.kind === 'open-point' ? 'var(--bg)' : 'var(--text)'}" stroke="var(--text)" stroke-width="1.5"/>`).join('');
    svg.innerHTML = `<line x1="${px(0)}" y1="0" x2="${px(0)}" y2="${H}" stroke="var(--line)"/><line x1="0" y1="${py(0)}" x2="${W}" y2="${py(0)}" stroke="var(--line)"/>${labels}${paths}${dots}`
      + '<circle class="graph-cursor" r="7" fill="none" stroke="var(--check-line)" stroke-width="3"/>';
  }
}
