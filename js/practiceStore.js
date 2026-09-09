/* practiceStore.js — pure reconciliation for the two practice-session stores.
 *
 * The app historically wrote practice sessions to TWO IndexedDB databases with
 * different record shapes and length thresholds:
 *   • cp_practice_v1  (drills)  → { tune, key, bpm, startTime, duration }   (>=10s)
 *   • cp_practice_db  (journal) → { tune, key, bpm, duration, date, ts }    (>=30s)
 * A single physical session lands in both (when >=30s) or only in v1 (10-30s),
 * so the two dashboards showed divergent history. This module is the pure,
 * headless-testable core that normalizes both shapes to one superset record and
 * merges them into a single deduplicated timeline. No DOM, no IndexedDB.
 */
(function (root) {
  'use strict';

  // UTC calendar day (matches the journal store's `new Date().toISOString()`).
  function dateStr(ts) {
    var d = new Date(ts);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  // Coerce either store's record into one superset shape carrying BOTH the
  // drills reader's fields (startTime) and the journal reader's (ts, date), so
  // each existing UI can keep reading whichever fields it already uses.
  function normalizeSession(rec) {
    rec = rec || {};
    var duration = Math.max(0, Math.round(Number(rec.duration) || 0));
    var ts;
    if (rec.ts != null && isFinite(Number(rec.ts))) ts = Number(rec.ts);
    else if (rec.startTime != null && isFinite(Number(rec.startTime))) ts = Number(rec.startTime) + duration * 1000;
    else ts = Date.now();
    var startTime = (rec.startTime != null && isFinite(Number(rec.startTime)))
      ? Number(rec.startTime)
      : ts - duration * 1000;
    return {
      tune: rec.tune || '',
      key: rec.key || '',
      bpm: rec.bpm != null ? rec.bpm : '',
      duration: duration,
      ts: ts,
      startTime: startTime,
      date: rec.date || dateStr(ts)
    };
  }

  // Two normalized records describe the same physical session when they are the
  // same tune and their [startTime, ts] intervals overlap. The same session in
  // both stores has near-identical intervals; distinct back-to-back sessions
  // (each >=10s, logged seconds apart) do not overlap, so they stay separate.
  function isSameSession(a, b) {
    return a.tune === b.tune && a.startTime < b.ts && b.startTime < a.ts;
  }

  // Deduplicate one list of records (normalizing first). On a collision the
  // longer-duration record wins (it is the more complete measurement).
  // Idempotent: dedupe(dedupe(x)) === dedupe(x).
  function dedupe(list) {
    var norm = (list || []).map(normalizeSession).filter(function (r) { return r.duration > 0; });
    norm.sort(function (x, y) { return x.ts - y.ts; }); // chronological for stable collisions
    var kept = [];
    for (var i = 0; i < norm.length; i++) {
      var r = norm[i], dup = -1;
      for (var j = 0; j < kept.length; j++) {
        if (isSameSession(kept[j], r)) { dup = j; break; }
      }
      if (dup === -1) kept.push(r);
      else if (r.duration > kept[dup].duration) kept[dup] = r;
    }
    kept.sort(function (x, y) { return y.ts - x.ts; }); // newest first
    return kept;
  }

  // Merge the two stores into one reconciled, newest-first timeline. "Migrate,
  // don't drop": a session in only one store survives; a session in both is
  // represented once. Order of arguments does not matter.
  function mergeStores(listA, listB) {
    return dedupe([].concat(listA || [], listB || []));
  }

  root.PracticeStore = {
    normalizeSession: normalizeSession,
    isSameSession: isSameSession,
    dedupe: dedupe,
    mergeStores: mergeStores,
    dateStr: dateStr
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
