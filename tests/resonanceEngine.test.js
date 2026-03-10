const assert = require('assert');
const { buildGravityMap, generateLick, mapLickToFretboard, runResonanceEngine } = require('../src/features/resonance-engine');
const { DEMO_SCALES } = require('../src/features/resonance-engine/demoData');
const { GRAVITY_RULES } = require('../src/features/resonance-engine/gravityRules');

const SCALE_IDS = ['ionian', 'major_bebop', 'dominant_bebop', 'dorian_bebop', 'altered', 'harmonic_minor'];

for (const scaleId of SCALE_IDS) {
  const scale = DEMO_SCALES[scaleId];
  const gravityMap = buildGravityMap('C', scale);
  const configuredTense = new Set((gravityMap.notes.filter((n) => n.isTense)).map((n) => n.degree));

  for (const t of ((GRAVITY_RULES[scaleId] && GRAVITY_RULES[scaleId].tenseNotes) || [])) {
    assert.equal(configuredTense.has(t), true, `${scaleId}: tense note missing ${t}`);
  }

  for (const note of gravityMap.notes.filter((n) => n.isTense)) {
    assert.ok(note.resolvesTo.length > 0, `${scaleId}: no resolution targets for ${note.degree}`);
  }

  const lick = generateLick({ key: 'C', scale, gravityMap, length: 6, seed: 1234 });
  const first = gravityMap.notes.find((n) => n.degree === lick.notes[0].degree);
  assert.equal(first.functionalRole, 'subdominant', `${scaleId}: lick must start on subdominant`);
  assert.equal(lick.notes.some((n) => n.isTense), true, `${scaleId}: lick must include tense note`);
  assert.equal(lick.notes[lick.notes.length - 1].degree, '1', `${scaleId}: lick must end on root`);

  const degreeSet = new Set(scale.degrees);
  assert.equal(lick.notes.every((n) => degreeSet.has(n.degree)), true, `${scaleId}: lick used non-scale note`);

  const positions = mapLickToFretboard(lick);
  assert.equal(positions.length, lick.notes.length, `${scaleId}: fretboard positions count mismatch`);
  assert.equal(positions.every((p) => p.fret >= 0 && p.string >= 1 && p.string <= 6), true, `${scaleId}: invalid fretboard position`);

  const pulseByDegree = Object.fromEntries(gravityMap.notes.map((n) => [n.degree, n.pulseMs]));
  for (const tense of gravityMap.notes.filter((n) => n.isTense)) {
    const stable = gravityMap.notes.find((n) => n.stability === 'stable');
    assert.ok(pulseByDegree[tense.degree] <= stable.pulseMs, `${scaleId}: tense pulse not faster`);
  }
}

for (const scaleId of SCALE_IDS) {
  const scale = DEMO_SCALES[scaleId];
  let failures = 0;
  for (let i = 0; i < 100; i++) {
    const output = runResonanceEngine({ key: 'C', scale, lickLength: 6, seed: i + 1 });
    const gravityMap = output.gravityMap;
    const lick = output.lick;
    const first = gravityMap.notes.find((n) => n.degree === lick.notes[0].degree);
    const valid = first && first.functionalRole === 'subdominant'
      && lick.notes.some((n) => n.isTense)
      && lick.notes[lick.notes.length - 1].degree === '1';
    if (!valid) failures++;
  }
  assert.equal(failures, 0, `${scaleId}: batch compliance below 100% (${failures}/100 failed)`);
}

console.log('resonanceEngine tests passed');
