'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function section(start, end) {
  const a = html.indexOf(start), b = html.indexOf(end, a);
  assert(a >= 0 && b > a, `Missing code section: ${start}`);
  return html.slice(a, b);
}

const nodes = new Map(), listeners = new Map(), grades = [];
function fret(pc, flat, sharp) {
  return { dataset: { idx: String(pc), nf: flat, ns: sharp }, textContent: '',
    classList: { add() {} }, setAttribute() {} };
}
const rootFret = fret(0, 'C', 'C');
const eSharpFret = fret(5, 'F', 'F');
const passingFret = fret(8, 'Ab', 'G#');
const seventhFret = fret(11, 'B', 'B');
function node(id) {
  if (!nodes.has(id)) nodes.set(id, { textContent: '', style: {}, className: '',
    classList: { add() {}, remove() {} }, addEventListener() {} });
  return nodes.get(id);
}
const document = {
  getElementById: node,
  addEventListener: (type, fn) => listeners.set(type, fn),
  dispatchEvent: event => listeners.get(event.type)?.(event)
};
const ctx = {
  document, Event: class { constructor(type) { this.type = type; } },
  window: { addEventListener() {} }, NOTE_IDX: { C: 0, 'C#': 1, D: 2, 'D#': 3, Eb: 3, E: 4, 'E#': 5, F: 5, 'F#': 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, B: 11, 'B#': 0 },
  FLAT_KEYS: ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'],
  SCALE_IVS: { Major: [0, 2, 4, 5, 7, 9, 11] },
  _fretGrid: new Map([['root', rootFret], ['eSharp', eSharpFret], ['passing', passingFret], ['seventh', seventhFret]]),
  clearFretboard() {}, FUNC_CLASS: {}, FUNC_COLORS: {},
  INT_NUMERIC: { 0: 'R', 8: 'b6', 11: '7' }, intervalDegree: iv => String(iv),
  PitchScoring: { gradeNote(...args) { grades.push(args); return { weight: 1 }; } },
  normalizeChordQuality: () => 'maj7',
  pitchEls: () => ({ noteEl: node('pitchNote'), centsEl: node('pitchCents'),
    inScaleEl: node('pitchInScale'), meterEl: node('pitchMeterBar'), scoreEl: node('pitchScore') }),
  freqToNote: pc => ({ pc, cents: 0, name: 'G#' }), highlightPc() {}, stopListening() {}
};
vm.createContext(ctx);
vm.runInContext(section('let lastBarData = null;', 'let fbMode ='), ctx);
vm.runInContext(section('const LIBRARY_INTERVAL_NAMES = {', '/* ============================================================\n   LAYER 4'), ctx);
vm.runInContext(section('  let _inCount  = 0;', '  // ── Frequency'), ctx);
vm.runInContext(section('  function getScalePcs()', '  // ── Fretboard: highlight'), ctx);
vm.runInContext(section('  function onFrequency(freq)', '  // ── Start microphone'), ctx);
const pitchInitStart = html.indexOf('  function init() {', html.indexOf('(function pitchModule()'));
const pitchInitEnd = html.indexOf('  if (document.readyState ===', pitchInitStart);
assert(pitchInitStart >= 0 && pitchInitEnd > pitchInitStart);
vm.runInContext(html.slice(pitchInitStart, pitchInitEnd), ctx);
ctx.init();

vm.runInContext("lastBarData = { root: 'C', scale: 'Major', chord: 'Cmaj7' }", ctx);
ctx.showLibraryScale('Major Bebop', ['C', 'D', 'E', 'F', 'G', 'G#', 'A', 'B'], 'C');
assert.strictEqual(rootFret.textContent, 'C');
assert.strictEqual(passingFret.textContent, 'G#');
vm.runInContext("libraryLabelMode = 'intervals'", ctx);
ctx.showLibraryScale('Major Bebop', ['C', 'D', 'E', 'F', 'G', 'G#', 'A', 'B'], 'C');
assert.strictEqual(rootFret.textContent, 'R');
assert.strictEqual(passingFret.textContent, '#5', 'Major Bebop spells the passing tone as #5');
vm.runInContext("libraryLabelMode = 'steps'", ctx);
ctx.showLibraryScale('Major Bebop', ['C', 'D', 'E', 'F', 'G', 'G#', 'A', 'B'], 'C');
assert.strictEqual(rootFret.textContent, '1');
assert.strictEqual(passingFret.textContent, '6');
assert.strictEqual(seventhFret.textContent, '8');
ctx.onFrequency(8); // G# is in Major Bebop, but not in C major
assert.strictEqual(node('pitchInScale').textContent, '✓ in scale');
assert.strictEqual(node('pitchScore').textContent, '100% in-scale (1 notes)');
assert.strictEqual(grades.length, 0, 'a library scale has no lead-sheet chord to grade against');
vm.runInContext("libraryLabelMode = 'notes'", ctx);
ctx.showLibraryScale('Major Bebop', ['C', 'D', 'E', 'F', 'G', 'G#', 'A', 'B'], 'C');
assert.strictEqual(node('pitchScore').textContent, '100% in-scale (1 notes)',
  'label changes must not reset the live mic meter');

vm.runInContext("libraryLabelMode = 'steps'", ctx);
ctx.showLibraryScale('C Major', ['C', 'D', 'E', 'F', 'G', 'A', 'B'], 'C');
assert.strictEqual(rootFret.textContent, '1');
assert.strictEqual(seventhFret.textContent, '7');
assert.strictEqual(node('pitchMeterBar').style.width, '0%', 'changing scales resets the meter');
ctx.onFrequency(8);
assert.strictEqual(node('pitchInScale').textContent, '○ out of scale');
assert.strictEqual(node('pitchScore').textContent, '0% in-scale (1 notes)');

ctx.showLibraryScale('Whole Tone', ['C', 'D', 'E', 'F#', 'G#', 'A#'], 'C');
assert.strictEqual(rootFret.textContent, '1');
assert.strictEqual(passingFret.textContent, '5', 'whole-tone steps count six notes per octave');
vm.runInContext("libraryLabelMode = 'intervals'", ctx);
ctx.showLibraryScale('Harmonic Minor', ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'B'], 'C');
assert.strictEqual(passingFret.textContent, 'b6', 'Harmonic Minor spells the same pitch as b6');
vm.runInContext("libraryLabelMode = 'notes'", ctx);
ctx.showLibraryScale('Ionian (Major)', ['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#'], 'C#');
assert.strictEqual(eSharpFret.textContent, 'E#', 'fretboard uses the transposed scale spelling');

ctx.setActiveScalePractice(null);
assert.strictEqual(node('pitchMeterBar').style.width, '0%');
ctx.onFrequency(8);
assert.strictEqual(node('pitchInScale').textContent, '○ out of scale');
assert.strictEqual(grades.length, 1, 'bar scoring resumes when library practice ends');

console.log('Scale Library pitch context and bar-scoring tests passed');
