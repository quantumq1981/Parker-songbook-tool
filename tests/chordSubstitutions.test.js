const assert = require('assert');
const { getSubstitutions, classifyQuality, FAMILY } = require('../js/chordSubstitutions.js');

// ── classifyQuality ─────────────────────────────────────────────────────────
assert.equal(classifyQuality('7'), FAMILY.DOM);
assert.equal(classifyQuality('9'), FAMILY.DOM);
assert.equal(classifyQuality('13'), FAMILY.DOM);
assert.equal(classifyQuality('7b9'), FAMILY.DOM_ALT);
assert.equal(classifyQuality('7#9'), FAMILY.DOM_ALT);
assert.equal(classifyQuality('alt'), FAMILY.DOM_ALT);
assert.equal(classifyQuality('7sus4'), FAMILY.DOM_SUS);
assert.equal(classifyQuality('sus4'), FAMILY.DOM_SUS);
assert.equal(classifyQuality('m7'), FAMILY.MIN7);
assert.equal(classifyQuality('m9'), FAMILY.MIN7);
assert.equal(classifyQuality('m'), FAMILY.MIN7);
assert.equal(classifyQuality('m11'), FAMILY.MIN11);
assert.equal(classifyQuality('m7b5'), FAMILY.MIN7B5);
assert.equal(classifyQuality('dim7'), FAMILY.DIM7);
assert.equal(classifyQuality('maj7'), FAMILY.MAJ7);
assert.equal(classifyQuality('6'), FAMILY.MAJ7);
assert.equal(classifyQuality(''), FAMILY.OTHER);

// ── Tritone sub: G7 → Db7 ────────────────────────────────────────────────────
const g7 = getSubstitutions('G', '7');
const tri = g7.find((s) => s.category === 'Tritone');
assert.ok(tri, 'G7 should offer a tritone sub');
assert.equal(tri.symbol, 'Db7', `G7 tritone sub should be Db7, got ${tri.symbol}`);

// Diminished (rootless b9): G7 → B°7 (3rd of G is B, +4)
const dimSub = g7.find((s) => s.category === 'Diminished');
assert.equal(dimSub.symbol, 'Bdim7', `G7 diminished sub should be Bdim7, got ${dimSub.symbol}`);

// Half-diminished (rootless 9): G7 → Bm7b5
const halfDim = g7.find((s) => s.category === 'Half-diminished');
assert.equal(halfDim.symbol, 'Bm7b5', `G7 half-dim sub should be Bm7b5, got ${halfDim.symbol}`);

// Related ii: G7 → Dm7
const relatedIi = g7.find((s) => s.quality === 'm7' && s.root === 'D');
assert.ok(relatedIi, 'G7 should suggest its related ii Dm7');

// ── m11 ⇄ 7sus4: Dm11 → G7sus4 ───────────────────────────────────────────────
const dm11 = getSubstitutions('D', 'm11');
const sus = dm11.find((s) => s.quality === '7sus4');
assert.equal(sus.symbol, 'G7sus4', `Dm11 should map to G7sus4, got ${sus.symbol}`);

// 7sus4 → m11 (reverse): G7sus4 → Dm11
const g7sus = getSubstitutions('G', '7sus4');
const backToMin = g7sus.find((s) => s.quality === 'm11');
assert.equal(backToMin.symbol, 'Dm11', `G7sus4 should map back to Dm11, got ${backToMin.symbol}`);

// ── Relative maj/min: Cmaj7 → Am7 ; Am7 → C6 ─────────────────────────────────
const cmaj7 = getSubstitutions('C', 'maj7');
assert.ok(cmaj7.find((s) => s.symbol === 'Am7'), 'Cmaj7 should offer relative minor Am7');
const am7 = getSubstitutions('A', 'm7');
assert.ok(am7.find((s) => s.symbol === 'C6'), 'Am7 should offer relative major C6');

// ── Minor ii–V: Bm7b5 → E7b9 ; and rootless G9 ──────────────────────────────
const bm7b5 = getSubstitutions('B', 'm7b5');
assert.ok(bm7b5.find((s) => s.symbol === 'E7b9'), 'Bm7b5 should resolve to E7b9');
assert.ok(bm7b5.find((s) => s.symbol === 'G9'), 'Bm7b5 = rootless G9');

// ── Enharmonic root safety: F#7 tritone sub = C7 ─────────────────────────────
const fs7 = getSubstitutions('F#', '7');
assert.ok(fs7.find((s) => s.symbol === 'C7'), 'F#7 tritone sub should be C7');

// ── Every suggestion is well-formed ─────────────────────────────────────────
[...g7, ...dm11, ...cmaj7, ...bm7b5].forEach((s) => {
  assert.ok(s.symbol && s.root && s.category && s.reason, `malformed suggestion: ${JSON.stringify(s)}`);
  assert.equal(typeof s.reason, 'string');
});

// Unknown root → empty, no throw
assert.deepEqual(getSubstitutions('H', '7'), []);

console.log('chordSubstitutions tests passed');
