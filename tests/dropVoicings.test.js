const assert = require('assert');
const drop = require('../js/dropVoicings.js');

const OPEN = [40, 45, 50, 55, 59, 64];
const pcOf = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11, Bb: 10, Eb: 3, 'F#': 6, Ab: 8, Db: 1 };

function pitchesOf(v) {
  return v.fingers.map(([s, f]) => OPEN[6 - s] + f);
}
function pcsOf(v) {
  return pitchesOf(v).map((p) => ((p % 12) + 12) % 12);
}

// ── Cmaj7: full generation, all valid 4-note Cmaj7 voicings ──────────────────
const cmaj7 = drop.generate('C', 'maj7');
assert.ok(cmaj7.length >= 6, `expected several Cmaj7 drop voicings, got ${cmaj7.length}`);
const CMAJ7 = new Set([0, 4, 7, 11]); // C E G B
cmaj7.forEach((v) => {
  assert.equal(v.fingers.length, 4, `drop voicing must have 4 notes: ${v.name}`);
  const pcs = pcsOf(v);
  pcs.forEach((pc) => assert.ok(CMAJ7.has(pc), `${v.name} has non-chord tone pc ${pc}`));
  assert.equal(new Set(pcs).size, 4, `${v.name} must contain all four distinct tones`);
  // Playable
  const frets = v.fingers.map((f) => f[1]).filter((f) => f > 0);
  const span = frets.length ? Math.max(...frets) - Math.min(...frets) : 0;
  assert.ok(span <= 5, `${v.name} span ${span} too wide`);
  v.fingers.forEach(([, f]) => assert.ok(f >= 0 && f <= 17, `${v.name} fret ${f} out of range`));
});

// Both drop groups present, and multiple inversions (varied bass notes)
assert.ok(cmaj7.some((v) => v.group === 'Drop 2'), 'should generate Drop 2');
assert.ok(cmaj7.some((v) => v.group === 'Drop 3'), 'should generate Drop 3');
const bassLabels = new Set(cmaj7.map((v) => v.bass));
assert.ok(bassLabels.size >= 3, `expected several inversions, got basses: ${[...bassLabels]}`);

// ── Drop-3 voicings skip a string (bass, gap, then three) ────────────────────
cmaj7.filter((v) => v.group === 'Drop 3').forEach((v) => {
  const strings = v.fingers.map((f) => f[0]).sort((a, b) => b - a); // low→high string number desc
  // A contiguous 4-string set would have max-min === 3; drop-3 skips one → 4.
  assert.equal(Math.max(...strings) - Math.min(...strings), 4, `drop-3 ${v.name} should skip a string`);
});

// ── Drop-2 voicings are on four adjacent strings ─────────────────────────────
cmaj7.filter((v) => v.group === 'Drop 2').forEach((v) => {
  const strings = v.fingers.map((f) => f[0]);
  assert.equal(Math.max(...strings) - Math.min(...strings), 3, `drop-2 ${v.name} should be adjacent strings`);
});

// ── Interval labels correct (root always present) ────────────────────────────
cmaj7.forEach((v) => {
  const labels = v.fingers.map((f) => f[2]);
  assert.ok(labels.includes('R'), `${v.name} should label a root`);
  labels.forEach((l) => assert.ok(['R', '3', '5', '7'].includes(l), `${v.name} bad label ${l}`));
});

// ── Correctness across qualities and keys (spelling holds) ───────────────────
const CHORD_PCS = {
  m7: [0, 3, 7, 10], 7: [0, 4, 7, 10], m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9], 6: [0, 4, 7, 9]
};
['G', 'Bb', 'Eb', 'F#', 'A'].forEach((root) => {
  Object.entries(CHORD_PCS).forEach(([suffix, ivals]) => {
    const allowed = new Set(ivals.map((i) => (pcOf[root] + i) % 12));
    const vs = drop.generate(root, suffix);
    assert.ok(vs.length >= 4, `${root}${suffix} should generate drop voicings (${vs.length})`);
    vs.forEach((v) => {
      pcsOf(v).forEach((pc) => assert.ok(allowed.has(pc), `${root}${suffix} ${v.name} has out-of-chord pc ${pc}`));
    });
  });
});

// ── Extended qualities resolve to a seventh core; triads/sus produce none ────
assert.ok(drop.generate('C', '13').length >= 4, '13 should build from the 7 core');
assert.ok(drop.generate('D', 'm11').length >= 4, 'm11 should build from the m7 core');
assert.deepEqual(drop.generate('C', 'major'), [], 'triad → no drop voicings');
assert.deepEqual(drop.generate('C', 'sus4'), [], 'sus → no drop voicings');
assert.deepEqual(drop.generate('H', '7'), [], 'invalid root → empty');

console.log('dropVoicings tests passed');
