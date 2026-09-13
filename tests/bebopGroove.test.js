'use strict';

const assert = require('assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

function loadModule(filename) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', filename), 'utf8');
  const ctx = { globalThis: {}, window: {}, console };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx.globalThis;
}

const { BebopGroove } = loadModule('bebopGroove.js');
const BG = BebopGroove;

const pcOf = (m) => ((m % 12) + 12) % 12;

/* ── swingRatio: bounded, and straightens (decreases) with tempo ── */
{
  for (const feel of Object.keys(BG.FEELS)) {
    const slow = BG.swingRatio(80, feel);
    const fast = BG.swingRatio(300, feel);
    assert.ok(slow > fast, `${feel}: swing should straighten as tempo rises`);
    for (const bpm of [40, 90, 120, 180, 240, 320]) {
      const s = BG.swingRatio(bpm, feel);
      assert.ok(s >= 0.5 && s <= 0.7, `${feel}@${bpm}: swing ${s} out of [0.5,0.7]`);
    }
    // Monotonic non-increasing across the range.
    let prev = 1;
    for (const bpm of [40, 90, 140, 200, 260, 320]) {
      const s = BG.swingRatio(bpm, feel);
      assert.ok(s <= prev + 1e-9, `${feel}: swing not monotonic at ${bpm}`);
      prev = s;
    }
  }
  // Unknown feel falls back to medium, does not throw.
  assert.strictEqual(BG.swingRatio(120, 'nonsense'), BG.swingRatio(120, 'medium'));
}

/* ── qualityOf: classifies the symbols the app actually produces ── */
{
  assert.strictEqual(BG.qualityOf('CΔ7'), 'maj7');
  assert.strictEqual(BG.qualityOf('Cmaj7'), 'maj7');
  assert.strictEqual(BG.qualityOf('Dm7'), 'm7');
  assert.strictEqual(BG.qualityOf('G7'), 'dom7');
  assert.strictEqual(BG.qualityOf('Bm7b5'), 'm7b5');
  assert.strictEqual(BG.qualityOf('Bø'), 'm7b5');
  assert.strictEqual(BG.qualityOf('C#dim'), 'dim');
  assert.strictEqual(BG.qualityOf('Ao7'), 'dim');
  assert.strictEqual(BG.qualityOf('F'), 'dom7');   // bare triad → dominant default
}

/* ── walkingBass: 4 notes, in register, beat-4 is a half-step approach to next root ── */
{
  const rng = () => 0.5;                     // deterministic, prefers "from below"
  const nextRootPc = BG.noteToPc('C');       // 0
  const line = BG.walkingBass(BG.noteToPc('D'), 'm7', nextRootPc, 40, rng);
  assert.strictEqual(line.length, 4);
  line.forEach((n) => assert.ok(n.midi >= 28 && n.midi <= 52, `bass ${n.midi} out of register`));
  assert.strictEqual(pcOf(line[0].midi), BG.noteToPc('D'), 'beat 1 must be the root');
  const dist = Math.min(pcOf(line[3].midi - nextRootPc), pcOf(nextRootPc - line[3].midi));
  assert.ok(dist === 1, `beat 4 (${pcOf(line[3].midi)}) must be a half-step from next root ${nextRootPc}`);
  // Contour is tight — no leap larger than an octave between consecutive notes.
  for (let i = 1; i < line.length; i++) {
    assert.ok(Math.abs(line[i].midi - line[i - 1].midi) <= 12, 'bass contour leaps too far');
  }
}

/* ── guideVoicing: contains the 3rd and 7th, sits in the comp register ── */
{
  const v = BG.guideVoicing(BG.noteToPc('G'), 'dom7', 63); // G7 → B(3rd), F(7th), A(9th)
  const pcs = v.map(pcOf);
  assert.ok(pcs.includes(BG.noteToPc('B')), 'comp missing major 3rd');
  assert.ok(pcs.includes(BG.noteToPc('F')), 'comp missing dominant 7th');
  v.forEach((m) => assert.ok(m >= 55 && m <= 74, `comp note ${m} out of register`));
}

/* ── buildBarPlan: shape, every quality survives, drums always present ── */
{
  const qualities = [['CΔ7','C'], ['Dm7','D'], ['G7','G'], ['Bm7b5','B'], ['C#dim','C#']];
  for (const [chord, rootLabel] of qualities) {
    const plan = BG.buildBarPlan({ root: rootLabel, chord, nextRoot: 'F', bpm: 160, barIndex: 3, feel: 'medium', seed: 42 });
    assert.ok(Array.isArray(plan.events) && plan.events.length > 0, `${chord}: empty plan`);
    assert.ok(plan.swing >= 0.5 && plan.swing <= 0.7, `${chord}: bad swing`);
    const voices = new Set(plan.events.map((e) => e.voice));
    ['bass', 'comp', 'ride', 'hihat', 'kick'].forEach((v) =>
      assert.ok(voices.has(v), `${chord}: missing voice ${v}`));
    // Bass = exactly 4 quarter notes, one per beat.
    const bass = plan.events.filter((e) => e.voice === 'bass');
    assert.strictEqual(bass.length, 4, `${chord}: bass note count`);
    // Compare by value: module arrays live in a separate vm realm, so a literal
    // deepStrictEqual against [0,1,2,3] would fail on prototype identity.
    assert.strictEqual(bass.map((b) => b.beat).sort((x, y) => x - y).join(','), '0,1,2,3');
    // Every pitched event carries a finite midi; velocities in (0,1.2].
    plan.events.forEach((e) => {
      if (e.voice === 'bass' || e.voice === 'comp') {
        assert.ok(Number.isFinite(e.midi), `${chord}: non-finite midi`);
      } else {
        assert.strictEqual(e.midi, null, `${chord}: drum should have null midi`);
      }
      assert.ok(e.vel > 0 && e.vel <= 1.2, `${chord}: velocity ${e.vel} out of range`);
      assert.ok(e.eighth === 0 || e.eighth === 1, `${chord}: bad eighth`);
      assert.ok(e.beat >= 0 && e.beat <= 3, `${chord}: bad beat`);
    });
  }
}

/* ── Determinism: same inputs → byte-identical plan; different bar → different ── */
{
  const opts = { root: 'D', chord: 'Dm7', nextRoot: 'G', bpm: 200, barIndex: 5, feel: 'uptempo', seed: 7 };
  const a = BG.buildBarPlan(opts);
  const b = BG.buildBarPlan(opts);
  assert.deepStrictEqual(a, b, 'plan must be deterministic for identical inputs');
  const c = BG.buildBarPlan(Object.assign({}, opts, { barIndex: 6 }));
  assert.notDeepStrictEqual(a.events, c.events, 'different bar index should humanize differently');
}

/* ── Feel affects density: ballad comps >= uptempo comps on average ── */
{
  let ballad = 0, uptempo = 0;
  for (let i = 0; i < 64; i++) {
    ballad  += BG.buildBarPlan({ root: 'C', chord: 'C7', nextRoot: 'F', bpm: 130, barIndex: i, feel: 'ballad',  seed: 1 }).events.filter((e) => e.voice === 'comp').length;
    uptempo += BG.buildBarPlan({ root: 'C', chord: 'C7', nextRoot: 'F', bpm: 130, barIndex: i, feel: 'uptempo', seed: 1 }).events.filter((e) => e.voice === 'comp').length;
  }
  assert.ok(ballad > uptempo, `ballad comp density (${ballad}) should exceed uptempo (${uptempo})`);
}

/* ── Edge cases: null / same next root, missing bpm, junk chord ── */
{
  assert.doesNotThrow(() => BG.buildBarPlan({ root: 'C', chord: 'C7', nextRoot: null, barIndex: 0 }));
  assert.doesNotThrow(() => BG.buildBarPlan({ root: 'C', chord: 'C7', nextRoot: 'C', barIndex: 0 }));
  assert.doesNotThrow(() => BG.buildBarPlan({ root: 'C', chord: '???', barIndex: 0 }));
  assert.doesNotThrow(() => BG.buildBarPlan({}));
  const p = BG.buildBarPlan({ root: 'C', chord: 'C7', nextRoot: null, barIndex: 0 });
  assert.strictEqual(p.events.filter((e) => e.voice === 'bass').length, 4);
}

console.log('✓ bebopGroove: all assertions passed');
