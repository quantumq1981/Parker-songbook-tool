const assert = require('assert');
const fs = require('fs');
const path = require('path');
const lib = require('../js/voicingLibrary.js');
const chordsDb = require('../data/chords.json');

// ── labelFor: interval labels derived from geometry ──────────────────────────
// Root C (pc 0): C(0)=R, E(4)=3, G(7)=5, Bb(10)=b7, Eb(3)=b3, B(11)=7
assert.equal(lib.labelFor(60, 0), 'R'); // C4
assert.equal(lib.labelFor(64, 0), '3'); // E4
assert.equal(lib.labelFor(67, 0), '5'); // G4
assert.equal(lib.labelFor(70, 0), 'b7'); // Bb4
assert.equal(lib.labelFor(63, 0), 'b3'); // Eb4
assert.equal(lib.labelFor(71, 0), '7'); // B4

// ── positionToVoicing: geometry matches chords.json's own midi array ─────────
// Prove our fret→pitch conversion is correct by reconstructing the DB's midi.
function reconstructMidi(voicing) {
  const OPEN = [40, 45, 50, 55, 59, 64];
  return voicing.fingers
    .map(([stringNum, absFret]) => OPEN[6 - stringNum] + absFret)
    .sort((a, b) => a - b);
}
['C', 'Bb', 'G', 'Eb'].forEach((key) => {
  ['major', 'm7', '7', 'maj7'].forEach((suffix) => {
    const positions = lib.resolveEntries(chordsDb, key, suffix);
    positions.forEach((pos) => {
      const v = lib.positionToVoicing(pos, key, 'x');
      if (!v || !Array.isArray(pos.midi)) return;
      assert.deepEqual(
        reconstructMidi(v),
        [...pos.midi].sort((a, b) => a - b),
        `midi mismatch for ${key}${suffix}: ${JSON.stringify(pos.frets)}`
      );
    });
  });
});

// ── buildVoicings: several voicings, correctly labeled ───────────────────────
const bbm7 = lib.buildVoicings({ key: 'Bb', suffix: 'm7', chordsDb });
assert.ok(bbm7.length >= 3, `expected >=3 Bbm7 voicings, got ${bbm7.length}`);
// Every returned Bbm7 voicing must be a valid Bbm7 (the corrupt Am7 pos0 in
// chords.json must be filtered out) and must contain a root.
bbm7.forEach((v) => {
  assert.ok(lib.isValidVoicing(v, 'Bb', 'm7'), `invalid Bbm7 voicing: ${JSON.stringify(v.fingers)}`);
  const labels = v.fingers.map((f) => f[2]).filter(Boolean);
  assert.ok(labels.includes('R'), `Bbm7 voicing missing R: ${JSON.stringify(v.fingers)}`);
});

// The specific corrupt grip (Am7 filed under Bbm7 pos0) must NOT survive.
assert.ok(
  !lib.isValidVoicing(
    lib.positionToVoicing({ frets: [1, -1, 1, 1, 1, -1], baseFret: 5 }, 'Bb'),
    'Bb', 'm7'
  ),
  'corrupt Am7-as-Bbm7 grip should be rejected'
);

// ── fingerMap: chords.json finger numbers are carried onto voicings ──────────
const cmaj = lib.buildVoicings({ key: 'C', suffix: 'major', chordsDb });
assert.ok(cmaj.some((v) => v.fingerMap && Object.keys(v.fingerMap).length >= 2),
  'C major voicings should carry fretting-hand finger numbers');
// Finger numbers are valid (1–4), keyed by string number (1–6).
cmaj.forEach((v) => {
  Object.entries(v.fingerMap || {}).forEach(([s, fin]) => {
    assert.ok(Number(s) >= 1 && Number(s) <= 6, `bad string ${s}`);
    assert.ok(fin >= 1 && fin <= 4, `bad finger ${fin}`);
  });
});

// Voicings come back in neck-position order (open/low first) and capped at 8.
const c7 = lib.buildVoicings({ key: 'C', suffix: '7', chordsDb });
assert.ok(c7.length <= 8, 'default cap is 8');
for (let i = 1; i < c7.length; i += 1) {
  const lo = (v) => Math.min(...v.fingers.map((f) => f[1]).filter((n) => typeof n === 'number' && n > 0));
  assert.ok(lo(c7[i - 1]) <= lo(c7[i]), 'voicings should be ordered low → high');
}

// ── ii–V chord that previously rendered blank now yields voicings ────────────
const eb7 = lib.buildVoicings({ key: 'Eb', suffix: '7', chordsDb });
assert.ok(eb7.length >= 3, `expected >=3 Eb7 voicings, got ${eb7.length}`);

// ── Jazz shells are merged in and the whole set is deduped ───────────────────
const jazzList = [{ name: 'Cm7 (Shell)', fingers: [[6, 8, 'R'], [4, 8, 'b7'], [3, 8, 'b3']], baseFret: 8 }];
const cm7 = lib.buildVoicings({ key: 'C', suffix: 'm7', chordsDb, jazzList });
assert.ok(cm7.some((v) => v.source === 'jazz'), 'jazz shell should be present');
const sigs = cm7.map(lib.signature);
assert.equal(new Set(sigs).size, sigs.length, 'voicings should be deduped');

// ── limit is respected ───────────────────────────────────────────────────────
assert.ok(lib.buildVoicings({ key: 'C', suffix: '7', chordsDb, limit: 2 }).length <= 2);

// ── unknown root → empty, no throw ───────────────────────────────────────────
assert.deepEqual(lib.buildVoicings({ key: 'H', suffix: '7', chordsDb }), []);

console.log('voicingLibrary tests passed');
