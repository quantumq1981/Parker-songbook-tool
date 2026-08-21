const assert = require('assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

function loadModule(filename) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', filename), 'utf8');
  const ctx = { globalThis: {}, window: {}, console };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx.globalThis;
}

// ── PitchScoring ──
const { PitchScoring } = loadModule('pitchScoring.js');

// guideTone gets highest weight
{
  const g = PitchScoring.gradeNote(4, 0, new Set([0,4,7,10]), new Set([0,2,4,5,7,9,10]), new Set([4,10]));
  assert.strictEqual(g.category, 'guideTone');
  assert.strictEqual(g.weight, 1.25);
  assert.strictEqual(g.intonation, 1);
}

// chordTone (root, not a guide tone)
{
  const g = PitchScoring.gradeNote(0, 0, new Set([0,4,7,10]), new Set([0,2,4,5,7,9,10]), new Set([4,10]));
  assert.strictEqual(g.category, 'chordTone');
  assert.strictEqual(g.weight, 1.0);
}

// scaleTone
{
  const g = PitchScoring.gradeNote(2, 0, new Set([0,4,7,10]), new Set([0,2,4,5,7,9,10]), new Set([4,10]));
  assert.strictEqual(g.category, 'scaleTone');
  assert.strictEqual(g.weight, 0.6);
}

// outside note
{
  const g = PitchScoring.gradeNote(1, 0, new Set([0,4,7,10]), new Set([0,2,4,5,7,9,10]), new Set([4,10]));
  assert.strictEqual(g.category, 'outside');
  assert.strictEqual(g.weight, 0.0);
}

// intonation degrades with cents deviation
{
  const g = PitchScoring.gradeNote(0, 30, new Set([0]), new Set([0]), new Set([0]));
  assert.ok(g.intonation < 1 && g.intonation > 0, 'intonation should degrade with 30 cents');
}
{
  const g = PitchScoring.gradeNote(0, 50, new Set([0]), new Set([0]), new Set([0]));
  assert.strictEqual(g.intonation, 0, 'intonation at 50 cents should be 0');
}

// scoreBar
{
  const grades = [
    { weight: 1.25, intonation: 1 },
    { weight: 1.0, intonation: 1 },
    { weight: 0.6, intonation: 1 },
    { weight: 0.0, intonation: 1 }
  ];
  const score = PitchScoring.scoreBar(grades);
  assert.ok(typeof score === 'number');
  assert.ok(score > 0 && score < 100);
}
{
  assert.strictEqual(PitchScoring.scoreBar([]), null);
}

// ── TempoRamp ──
const { TempoRamp } = loadModule('tempoRamp.js');

{
  const ramp = TempoRamp.createRamp({ start: 80, target: 100, step: 10, passesPerStep: 2 });
  assert.strictEqual(ramp.current(), 80);
  let r = ramp.pass(true);
  assert.strictEqual(r.bpm, 80); assert.strictEqual(r.event, 'hold'); assert.strictEqual(r.passes, 1);
  r = ramp.pass(true);
  assert.strictEqual(r.bpm, 90); assert.strictEqual(r.event, 'advance');
  ramp.pass(true);
  r = ramp.pass(true);
  assert.strictEqual(r.bpm, 100); assert.strictEqual(r.event, 'advance');
  r = ramp.pass(true);
  assert.strictEqual(r.bpm, 100); assert.strictEqual(r.event, 'hold');
  r = ramp.pass(true);
  assert.strictEqual(r.bpm, 100); assert.strictEqual(r.event, 'target');
}

// backoff
{
  const ramp = TempoRamp.createRamp({ start: 80, target: 120, step: 10, passesPerStep: 1 });
  ramp.pass(true); // advance to 90
  const r = ramp.pass(false);
  assert.strictEqual(r.event, 'backoff');
  assert.strictEqual(r.bpm, 80);
}

// reset
{
  const ramp = TempoRamp.createRamp({ start: 80, target: 120, step: 10, passesPerStep: 1 });
  ramp.pass(true);
  ramp.reset();
  assert.strictEqual(ramp.current(), 80);
}

// ── SilentBars ──
const { SilentBars } = loadModule('silentBars.js');

{
  const mask = SilentBars.buildMask(8, 'off');
  assert.strictEqual(mask.length, 8);
  assert.ok(mask.every(v => v === true), 'off mode: all bars should be true');
}

{
  const mask = SilentBars.buildMask(8, 'alternate');
  assert.strictEqual(mask.length, 8);
  assert.ok(mask.some(v => v === true) && mask.some(v => v === false), 'alternate: mixed');
}

{
  const mask = SilentBars.buildMask(8, 'lastHalf');
  assert.ok(mask[0] === true, 'lastHalf: first bar audible');
  assert.ok(mask[7] === false, 'lastHalf: last bar silent');
}

{
  assert.ok(SilentBars.MODES.length >= 5, 'at least 5 modes available');
}

// ── CallResponse ──
const { CallResponse } = loadModule('callResponse.js');

{
  const m = CallResponse.createMatcher([0, 4, 7, 0]);
  assert.strictEqual(m.feed(0), 'progress');
  assert.strictEqual(m.feed(4), 'progress');
  assert.strictEqual(m.feed(7), 'progress');
  assert.strictEqual(m.feed(0), 'complete');
  assert.strictEqual(m.progress(), 1);
}

// skip tolerance
{
  const m = CallResponse.createMatcher([0, 4, 7], { skipTolerance: 1 });
  assert.strictEqual(m.feed(4), 'progress'); // skipped 0, matched 4, cursor jumps to 2
  assert.strictEqual(m.feed(7), 'complete');
}

// unrelated notes ignored
{
  const m = CallResponse.createMatcher([0, 4, 7]);
  assert.strictEqual(m.feed(6), 'ignore');
  assert.strictEqual(m.feed(0), 'progress');
}

// reset
{
  const m = CallResponse.createMatcher([0, 4]);
  m.feed(0);
  m.feed(4);
  assert.strictEqual(m.progress(), 1);
  m.reset();
  assert.strictEqual(m.progress(), 0);
}

console.log('practiceEnhancements tests passed');
