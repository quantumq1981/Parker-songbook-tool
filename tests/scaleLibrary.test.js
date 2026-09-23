'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('function transposeLibraryNotes(');
const end = html.indexOf('/* ============================================================\n   LEAD SHEET RENDERER', start);
assert(start >= 0 && end > start, 'scale library builder must exist');

const items = [];
function node(tagName) {
  const classes = new Set();
  return {
    tagName,
    children: [],
    attributes: {},
    classList: {
      add: name => classes.add(name),
      remove: name => classes.delete(name),
      contains: name => classes.has(name),
      toggle(name, active) { if (active) classes.add(name); else classes.delete(name); }
    },
    append(...children) { this.children.push(...children); },
    appendChild(child) { this.children.push(child); },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, fn) { this[name] = fn; }
  };
}
const grid = node('div');
const fretboard = node('div');
const keySelect = node('select'); keySelect.value = 'C';
const labelButtons = ['notes', 'intervals', 'steps'].map(mode => {
  const btn = node('button'); btn.dataset = { libLabel: mode }; return btn;
});
fretboard.scrollIntoView = () => {};
const calls = [];
const document = {
  getElementById: id => id === 'libGrid' ? grid : id === 'libraryKey' ? keySelect : fretboard,
  createElement: tag => {
    const el = node(tag);
    if (tag === 'button') items.push(el);
    return el;
  },
  querySelectorAll: selector => selector === '.lib-label-btn'
    ? labelButtons : items.filter(el => el.classList.contains('lib-active'))
};
const context = {
  document,
  SCALE_LIBRARY: { Bebop: [
    { name: 'Major Bebop', notes: ['C', 'D'], root: 'C' },
    { name: 'Dorian', notes: ['C', 'Eb'], root: 'C' }
  ] },
  NOTE_IDX: { C: 0, D: 2, Eb: 3, F: 5, Gb: 6 },
  FLAT_KEYS: ['Eb'],
  noteName: (pc, flats) => (flats
    ? ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']
    : ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'])[(pc + 12) % 12],
  intervalDegree: n => String(n),
  libraryLabelMode: 'notes',
  showLibraryScale: (...args) => calls.push(['show', ...args]),
  playLibraryScale: (...args) => calls.push(['play', ...args]),
  buildFretboard: () => { throw Error('Selecting a scale must reuse the existing SVG'); }
};
vm.createContext(context);
vm.runInContext(html.slice(start, end), context);
context.buildScaleLibrary();
assert.strictEqual(items.length, 2);
assert(items.every(el => el.type === 'button' && el.attributes['aria-pressed'] === 'false'));
items[0].click();
assert.strictEqual(items[0].attributes['aria-pressed'], 'true');
assert.strictEqual(calls[0][1], 'Major Bebop');
items[1].click();
assert.strictEqual(items[0].attributes['aria-pressed'], 'false');
assert.strictEqual(items[1].attributes['aria-pressed'], 'true');
assert.strictEqual(calls[2][1], 'Dorian');
keySelect.value = 'Eb'; keySelect.change();
assert.strictEqual(items[0].children[1].textContent, 'Eb - F');
assert.strictEqual(items[1].children[1].textContent, 'Eb - Gb');
assert.strictEqual(calls[4][1], 'Dorian', 'changing key redraws the active scale');
assert.strictEqual(calls[4][3], 'Eb');
assert.deepStrictEqual(Array.from(calls[4][2]), ['Eb', 'Gb']);
assert.strictEqual(calls.length, 5, 'changing key does not start overlapping audio');
assert.strictEqual(items[1].attributes['aria-pressed'], 'true');
items[0].click();
assert.deepStrictEqual(Array.from(calls[5][2]), ['Eb', 'F']);
assert.deepStrictEqual(Array.from(calls[6][1]), ['Eb', 'F'], 'tap plays the transposed notes');
assert.strictEqual(calls[6][2], 'Eb', 'scale playback starts from the chosen tonic');
labelButtons[2].click();
assert.strictEqual(context.libraryLabelMode, 'steps');
assert.strictEqual(labelButtons[2].attributes['aria-pressed'], 'true');
assert.strictEqual(labelButtons[0].attributes['aria-pressed'], 'false');
assert.strictEqual(calls[7][3], 'Eb', 'changing labels redraws the selected key');
assert.strictEqual(calls.length, 8, 'label changes do not replay audio');

// Check the shipped 25-scale catalog against every key choice. The returned
// pitch classes must preserve the C-reference intervals and stay playable.
const full = vm.createContext({});
const constants = html.indexOf('const NOTE_IDX = {');
vm.runInContext(html.slice(constants, html.indexOf('/* ============================================================\n   SECURITY', constants)), full);
vm.runInContext(html.slice(html.indexOf('function noteName('), html.indexOf('function transposeChord(')), full);
vm.runInContext(html.slice(html.indexOf('const FREQ = {'), html.indexOf('let audioContext =', html.indexOf('const FREQ = {'))), full);
vm.runInContext(html.slice(html.indexOf('function libraryScaleFrequencies('), html.indexOf('// LAYER 2C — Library scale playback')), full);
vm.runInContext(html.slice(html.indexOf('const SCALE_LIBRARY = {'), html.indexOf('function buildScaleLibrary() {')), full);
const checks = vm.runInContext(`
  ['C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B']
    .flatMap(root => Object.values(SCALE_LIBRARY).flat().map(scale => {
      const notes = transposeLibraryNotes(scale, root);
      return { root, name: scale.name, notes,
        intervals: notes.map(n => (NOTE_IDX[n] - NOTE_IDX[root] + 12) % 12),
        source: scale.notes.map(n => (NOTE_IDX[n] - NOTE_IDX[scale.root] + 12) % 12),
        playable: FREQ[root] > 0 && notes.every(n => NOTE_IDX[n] !== undefined),
        ascending: libraryScaleFrequencies(notes, root).every((hz, i, arr) => i === 0 || hz > arr[i - 1]) };
    }))`, full);
assert.strictEqual(checks.length, 25 * 17);
for (const check of checks) {
  assert.deepStrictEqual(Array.from(check.intervals), Array.from(check.source), check.root + ' ' + check.name);
  assert(check.playable, check.root + ' ' + check.name + ' has an unplayable note');
  assert(check.ascending, check.root + ' ' + check.name + ' does not play upward');
}
const ebBebop = checks.find(check => check.root === 'Eb' && check.name === 'Major Bebop');
assert.deepStrictEqual(Array.from(ebBebop.notes), ['Eb','F','G','Ab','Bb','B','C','D']);
const csMajor = checks.find(check => check.root === 'C#' && check.name === 'Ionian (Major)');
assert.deepStrictEqual(Array.from(csMajor.notes), ['C#','D#','E#','F#','G#','A#','B#']);
const gbMajor = checks.find(check => check.root === 'Gb' && check.name === 'Ionian (Major)');
assert.deepStrictEqual(Array.from(gbMajor.notes), ['Gb','Ab','Bb','Cb','Db','Eb','F']);
const pitches = Array.from(vm.runInContext("libraryScaleFrequencies(['Eb','F','G','Ab','Bb','C','D'], 'Eb')", full));
assert(pitches.every((hz, index) => index === 0 || hz > pitches[index - 1]),
  'Eb major playback must rise past C instead of wrapping back to C4');
assert(Math.abs(pitches.at(-1) / pitches[0] - 2) < 0.001, 'scale ends on the root octave');

// Stand mode must retain access to the library, while hiding other details.
assert(/body\.stand-mode details:not\(\.scale-lib\)/.test(html));
assert(/id="openScaleLibraryBtn"[\s\S]*?data-modes="improvise"/.test(html));
assert(/panel\.open = true;[\s\S]*?panel\.scrollIntoView/.test(html));

console.log('scale library navigation and selection tests passed');
