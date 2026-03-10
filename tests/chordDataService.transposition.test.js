const assert = require('assert');
const svc = require('../js/chordDataService.js');

global.JAZZ_CHORDS = {
  'BbΔ7': [
    { name: 'BbΔ7 (Shell)', fingers: [[6, 6, 'R'], [4, 7, '7'], [3, 7, '3']], baseFret: 6 }
  ],
  'Cm7b5': [
    { name: 'Cm7b5', fingers: [[5, 3, 'R'], [4, 4, 'b3'], [3, 3, 'b5'], [2, 4, 'b7']], baseFret: 3 }
  ],
  'F#dim7': [
    { name: 'F#dim7', fingers: [[5, 9, 'R'], [4, 8, 'b3'], [3, 9, 'b5'], [2, 8, '6']], baseFret: 8 }
  ]
};

assert.equal(svc.normalizeJazzSuffix('maj7'), 'Δ7');
assert.equal(svc.normalizeJazzSuffix('M7'), 'Δ7');
assert.equal(svc.normalizeJazzSuffix('∆7'), 'Δ7');
assert.equal(svc.normalizeJazzSuffix('-7'), 'm7');
assert.equal(svc.normalizeJazzSuffix('ø7'), 'm7b5');
assert.equal(svc.normalizeJazzSuffix('º7'), 'dim7');
assert.equal(svc.normalizeChordSymbol('CM7'), 'CΔ7');
assert.equal(svc.normalizeChordSymbol('GØ7'), 'Gm7b5');

const direct = svc.getJazzVoicingsForChord('Bb', 'maj7');
assert.equal(direct.length, 1);
assert.equal(direct[0].baseFret, 6);

const transposed = svc.getJazzVoicingsForChord('G', 'maj7');
assert.equal(transposed.length, 1);
assert.equal(transposed[0].baseFret, 15);
assert.deepEqual(transposed[0].fingers[0], [6, 15, 'R']);

const halfDim = svc.getJazzVoicingsForChord('D', 'ø7');
assert.equal(halfDim.length, 1);
assert.equal(halfDim[0].fingers[0][1], 5);

const dim = svc.getJazzVoicingsForChord('A', '°7');
assert.equal(dim.length, 1);

console.log('chordDataService transposition tests passed');
