const assert = require('assert');
const gen = require('../js/shapeGenerator.js');

const OPEN = [40, 45, 50, 55, 59, 64];
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11, Bb: 10, Eb: 3, 'F#': 6, Ab: 8, Db: 1 };
const pcsOf = (v) => v.fingers.map(([s, f]) => ((OPEN[6 - s] + f) % 12 + 12) % 12);

function assertPlayable(v, label) {
  // Contiguous sounding strings (no interior mute)
  const strings = v.fingers.map((f) => f[0]).sort((a, b) => a - b);
  assert.equal(strings[strings.length - 1] - strings[0], strings.length - 1, `${label} strings not contiguous`);
  // Span & finger count
  const fretted = v.fingers.map((f) => f[1]).filter((f) => f > 0);
  const span = fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0;
  assert.ok(span <= 4, `${label} span ${span} too wide`);
  assert.ok(new Set(fretted).size <= 4, `${label} needs >4 fingers`);
  v.fingers.forEach(([, f]) => assert.ok(f >= 0 && f <= 16, `${label} fret ${f} out of range`));
}

// ── Triads: several valid, playable shapes containing all three tones ────────
[['C', 'major', [0, 4, 7]], ['A', 'minor', [0, 3, 7]], ['G', 'major', [0, 4, 7]], ['F', 'sus4', [0, 5, 7]]]
  .forEach(([root, suffix, ivals]) => {
    const allowed = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
      .filter((pc) => ivals.map((i) => (PC[root] + i) % 12).includes(pc)));
    const shapes = gen.generateShapes(root, suffix);
    assert.ok(shapes.length >= 5, `${root} ${suffix}: expected several shapes, got ${shapes.length}`);
    shapes.forEach((v) => {
      assertPlayable(v, `${root}${suffix}`);
      pcsOf(v).forEach((pc) => assert.ok(allowed.has(pc), `${root}${suffix} non-chord tone pc ${pc}`));
      const req = new Set(ivals.map((i) => (PC[root] + i) % 12));
      const present = new Set(pcsOf(v));
      req.forEach((pc) => assert.ok(present.has(pc), `${root}${suffix} missing required tone ${pc}`));
    });
  });

// ── Position diversity: shapes span more than one neck region ────────────────
const cmajor = gen.generateShapes('C', 'major', { max: 10 });
const baseFrets = new Set(cmajor.map((v) => v.baseFret));
assert.ok(baseFrets.size >= 3, `expected shapes at ≥3 neck positions, got ${[...baseFrets]}`);

// ── Guarantee-8: enough shapes exist to top a chord up to 8 ───────────────────
['C', 'Bb', 'Eb', 'A'].forEach((root) => {
  ['major', 'minor', '6', 'm6', 'sus4'].forEach((suffix) => {
    const shapes = gen.generateShapes(root, suffix, { max: 12, perBaseFret: 3 });
    assert.ok(shapes.length >= 8, `${root} ${suffix}: only ${shapes.length} shapes (need ≥8 available)`);
  });
});

// ── Labels correct + fingerMap valid ─────────────────────────────────────────
gen.generateShapes('C', 'm7').forEach((v) => {
  v.fingers.forEach(([, , label]) => assert.ok(['R', 'b3', '5', 'b7'].includes(label), `bad label ${label}`));
  Object.values(v.fingerMap).forEach((fin) => assert.ok(fin >= 1 && fin <= 4, `bad finger ${fin}`));
});

// ── Unknown root / quality → empty, no throw ─────────────────────────────────
assert.deepEqual(gen.generateShapes('H', 'major'), []);
assert.deepEqual(gen.generateShapes('C', 'totallybogus'), []);

console.log('shapeGenerator tests passed');
