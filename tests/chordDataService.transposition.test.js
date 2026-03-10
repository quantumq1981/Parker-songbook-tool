const assert = require('assert');
const svc = require('../js/chordDataService.js');

global.JAZZ_CHORDS = {
  'BbΔ7': [
    { name: 'BbΔ7 (Shell)', fingers: [[6, 6, 'R'], [4, 7, '7'], [3, 7, '3']], baseFret: 6 }
  ]
};

assert.equal(svc.normalizeJazzSuffix('maj7'), 'Δ7');
assert.equal(svc.normalizeJazzSuffix('M7'), 'Δ7');
assert.equal(svc.normalizeJazzSuffix('∆7'), 'Δ7');
assert.equal(svc.normalizeJazzSuffix('-7'), 'm7');
assert.equal(svc.normalizeJazzSuffix('ø7'), 'm7b5');
assert.equal(svc.normalizeJazzSuffix('º7'), 'dim7');

const direct = svc.getJazzVoicingsForChord('Bb', 'maj7');
assert.equal(direct.length, 1);
assert.equal(direct[0].baseFret, 6);

const transposed = svc.getJazzVoicingsForChord('G', 'maj7');
assert.equal(transposed.length, 1);
assert.equal(transposed[0].baseFret, 3);
assert.deepEqual(transposed[0].fingers[0], [6, 3, 'R']);

console.log('chordDataService transposition tests passed');
