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

const { PracticeStore } = loadModule('practiceStore.js');

// ── normalizeSession: drills (v1) shape derives ts + date from startTime ──
{
  const n = PracticeStore.normalizeSession({ tune: 'Cheryl', key: 'C', bpm: 140, startTime: 1000000, duration: 40 });
  assert.strictEqual(n.ts, 1040000, 'ts = startTime + duration*1000');
  assert.strictEqual(n.startTime, 1000000);
  assert.strictEqual(n.duration, 40);
  assert.strictEqual(n.date, new Date(1040000).toISOString().slice(0, 10));
}

// ── normalizeSession: journal (db) shape keeps ts + date, derives startTime ──
{
  const n = PracticeStore.normalizeSession({ tune: 'Bloomdido', key: 'Bb', bpm: 120, duration: 50, date: '2026-01-02', ts: 5000000 });
  assert.strictEqual(n.ts, 5000000);
  assert.strictEqual(n.startTime, 5000000 - 50000, 'startTime = ts - duration*1000');
  assert.strictEqual(n.date, '2026-01-02', 'existing date preserved');
}

// ── normalizeSession: guards junk (NaN duration, missing fields) ──
{
  const n = PracticeStore.normalizeSession({ tune: 'X', duration: 'oops' });
  assert.strictEqual(n.duration, 0);
  assert.ok(Number.isFinite(n.ts));
  assert.ok(Number.isFinite(n.startTime));
}

// ── mergeStores: the SAME session logged in both stores collapses to one ──
{
  const a = [{ tune: 'Anthropology', key: 'Bb', bpm: 120, startTime: 1000000, duration: 40 }]; // ts→1040000
  const b = [{ tune: 'Anthropology', key: 'Bb', bpm: 120, duration: 41, date: '2026-01-01', ts: 1041000 }]; // start→1000000
  const merged = PracticeStore.mergeStores(a, b);
  assert.strictEqual(merged.length, 1, 'overlapping same-tune sessions dedupe');
  assert.strictEqual(merged[0].duration, 41, 'longer-duration record wins');
}

// ── mergeStores: a drills-only session (<30s, journal never logged it) survives ──
{
  const a = [{ tune: 'Cheryl', key: 'C', bpm: 140, startTime: 2000000, duration: 15 }];
  const b = [];
  const merged = PracticeStore.mergeStores(a, b);
  assert.strictEqual(merged.length, 1, 'v1-only session is not dropped');
  assert.strictEqual(merged[0].tune, 'Cheryl');
}

// ── mergeStores: distinct back-to-back sessions of the same tune stay separate ──
{
  const b = [
    { tune: 'Confirmation', key: 'F', bpm: 120, duration: 35, date: '2026-01-01', ts: 1000000 },   // [965000,1000000]
    { tune: 'Confirmation', key: 'F', bpm: 120, duration: 35, date: '2026-01-01', ts: 3000000 }    // [2965000,3000000]
  ];
  const merged = PracticeStore.mergeStores([], b);
  assert.strictEqual(merged.length, 2, 'non-overlapping same-tune sessions are distinct');
}

// ── full scenario + newest-first ordering + idempotency ──
{
  const a = [
    { tune: 'Anthropology', key: 'Bb', bpm: 120, startTime: 1000000, duration: 40 }, // dupe of X below
    { tune: 'Cheryl', key: 'C', bpm: 140, startTime: 2000000, duration: 15 }          // v1-only
  ];
  const b = [
    { tune: 'Anthropology', key: 'Bb', bpm: 120, duration: 41, date: '2026-01-01', ts: 1041000 }, // X
    { tune: 'Anthropology', key: 'Bb', bpm: 120, duration: 35, date: '2026-01-01', ts: 3000000 }  // distinct
  ];
  const merged = PracticeStore.mergeStores(a, b);
  assert.strictEqual(merged.length, 3, 'X collapses; Cheryl + later Anthropology survive');
  // newest first
  for (let i = 1; i < merged.length; i++) assert.ok(merged[i - 1].ts >= merged[i].ts, 'sorted newest-first');
  // idempotent
  const again = PracticeStore.dedupe(merged);
  assert.strictEqual(again.length, merged.length, 'dedupe is idempotent');
}

console.log('practiceStore tests passed');
