const assert = require('assert');
const { parseChordSymbol } = require('../js/chordParser.js');

const cases = [
  ['Cmin7', 'C', 'm7'],
  ['Cm7', 'C', 'm7'],
  ['C-7', 'C', 'm7'],
  ['Cmaj7', 'C', 'maj7'],
  ['CΔ7', 'C', 'maj7'],
  ['CΔ', 'C', 'maj7'],
  ['C7', 'C', '7'],
  ['Cm', 'C', 'm'],
  ['Cdim', 'C', 'dim'],
  ['C°', 'C', 'dim'],
  ['C°7', 'C', 'dim7'],
  ['C+', 'C', 'aug'],
  ['Caug', 'C', 'aug'],
  ['C7b9', 'C', '7b9'],
  ['Cm9', 'C', 'm9'],
  ['Cmaj9', 'C', 'maj9']
];

cases.forEach(([symbol, key, suffix]) => {
  const parsed = parseChordSymbol(symbol);
  assert.equal(parsed.ok, true, symbol);
  assert.equal(parsed.key, key, symbol);
  assert.equal(parsed.suffix, suffix, symbol);
});

const slash = parseChordSymbol('C7/E');
assert.equal(slash.ok, true);
assert.equal(slash.key, 'C');
assert.equal(slash.suffix, '7');
assert.equal(slash.original, 'C7/E');

const fail = parseChordSymbol('H7');
assert.equal(fail.ok, false);

console.log('chordParser tests passed');
