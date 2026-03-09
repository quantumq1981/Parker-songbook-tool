const assert = require('assert');
const { filterJazzVoicings } = require('../js/chordDataService.js');

const positions = [
  { frets: [0, 2, 2, 1, 0, 0], baseFret: 1 },
  { frets: [-1, -1, 5, 5, 5, 7], baseFret: 5 },
  { frets: [-1, 3, 5, 3, 4, -1], baseFret: 3 }
];

const out = filterJazzVoicings(positions);
assert.equal(out.length, 3);
assert.notDeepEqual(out[0], positions[0]);
assert.deepEqual(out[2], positions[0]);

console.log('filterJazzVoicings tests passed');
