const assert = require('assert');
require('../js/chordParser.js'); // sets globalThis.ChordParser used by the init module
const { splitCompoundSymbol } = require('../js/chordVoicingsInit.js');

// Plain chords → single element
assert.deepEqual(splitCompoundSymbol('Gm7'), ['Gm7']);
assert.deepEqual(splitCompoundSymbol('Cmaj7'), ['Cmaj7']);

// ii–V (reharm) PAIRS → both chords
assert.deepEqual(splitCompoundSymbol('Bbm7/Eb7'), ['Bbm7', 'Eb7']);
assert.deepEqual(splitCompoundSymbol('Gm7/C7'), ['Gm7', 'C7']);
assert.deepEqual(splitCompoundSymbol('Am7b5/D7'), ['Am7b5', 'D7']);

// Slash / inversion bass (bare note after slash) → voice the LEFT chord only
assert.deepEqual(splitCompoundSymbol('C/G'), ['C']);
assert.deepEqual(splitCompoundSymbol('Cmaj7/E'), ['Cmaj7']);
assert.deepEqual(splitCompoundSymbol('D/F#'), ['D']);

// Whitespace tolerance
assert.deepEqual(splitCompoundSymbol('Bbm7 / Eb7'), ['Bbm7', 'Eb7']);

console.log('chordVoicingsInit tests passed');
