/**
 * shapeGenerator.js — pure, headless general voicing enumerator.
 *
 * Where dropVoicings.js derives the specific drop-2/drop-3 forms of four-note
 * seventh chords, this module guarantees a *full* set of playable dictionary-style
 * shapes for ANY chord quality (triads, 6ths, sus, extended, altered) by
 * enumerating the fretboard directly:
 *
 *   for each neck window × each contiguous string block → every combination of
 *   chord-tone frets, kept only if it is a real, playable grip.
 *
 * "Playable / real" filters: contiguous sounding strings (no interior mutes),
 * contains every REQUIRED tone of the chord, only chord tones sound, fret span
 * ≤ 4, and ≤ 4 distinct fretted positions (a barre counts once). Results are
 * ranked (prefer complete voicings, root in the bass, fuller grips, lower on the
 * neck) and diversified across neck positions.
 *
 * Used to top the Library group up to a minimum count when chords.json (+ the
 * drop generator) ship fewer — so every chord shows a robust spread of shapes.
 *
 * Output = the same canonical voicing shape the renderer consumes:
 *   { name, baseFret, fingers:[[stringNum, absFret, label]], fingerMap, barres:[],
 *     source:'gen', group:'Library' }
 *
 * Zero DOM / zero I/O → unit-testable in Node.
 */
(function (global) {
  const NOTE_TO_PC = {
    C: 0, 'B#': 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4,
    F: 5, 'E#': 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9,
    'A#': 10, Bb: 10, B: 11, Cb: 11
  };
  const OPEN_MIDI = [40, 45, 50, 55, 59, 64]; // low E → high E, index = 6 - stringNum

  const MAX_BASE = 12; // highest window start
  const MAX_SPAN = 4;  // widest hand stretch

  // Chord specs: labeled tones + the pitch classes (as semitone offsets) that MUST
  // sound for the grip to represent the chord. Root is spelled from these tones,
  // so labels (b3/#5/13/…) stay correct per quality.
  const SPECS = {
    major: { tones: [[0, 'R'], [4, '3'], [7, '5']], required: [0, 4, 7] },
    minor: { tones: [[0, 'R'], [3, 'b3'], [7, '5']], required: [0, 3, 7] },
    m: { tones: [[0, 'R'], [3, 'b3'], [7, '5']], required: [0, 3, 7] },
    dim: { tones: [[0, 'R'], [3, 'b3'], [6, 'b5']], required: [0, 3, 6] },
    aug: { tones: [[0, 'R'], [4, '3'], [8, '#5']], required: [0, 4, 8] },
    sus2: { tones: [[0, 'R'], [2, '2'], [7, '5']], required: [0, 2, 7] },
    sus4: { tones: [[0, 'R'], [5, '4'], [7, '5']], required: [0, 5, 7] },
    sus: { tones: [[0, 'R'], [5, '4'], [7, '5']], required: [0, 5, 7] },
    6: { tones: [[0, 'R'], [4, '3'], [7, '5'], [9, '6']], required: [0, 4, 9] },
    m6: { tones: [[0, 'R'], [3, 'b3'], [7, '5'], [9, '6']], required: [0, 3, 9] },
    add9: { tones: [[0, 'R'], [2, '9'], [4, '3'], [7, '5']], required: [0, 4, 2] },
    69: { tones: [[0, 'R'], [2, '9'], [4, '3'], [7, '5'], [9, '6']], required: [0, 4, 9] },
    maj7: { tones: [[0, 'R'], [4, '3'], [7, '5'], [11, '7']], required: [0, 4, 11] },
    7: { tones: [[0, 'R'], [4, '3'], [7, '5'], [10, 'b7']], required: [0, 4, 10] },
    m7: { tones: [[0, 'R'], [3, 'b3'], [7, '5'], [10, 'b7']], required: [0, 3, 10] },
    m7b5: { tones: [[0, 'R'], [3, 'b3'], [6, 'b5'], [10, 'b7']], required: [0, 3, 6, 10] },
    dim7: { tones: [[0, 'R'], [3, 'b3'], [6, 'b5'], [9, '6']], required: [0, 3, 6, 9] },
    mmaj7: { tones: [[0, 'R'], [3, 'b3'], [7, '5'], [11, '7']], required: [0, 3, 11] },
    9: { tones: [[0, 'R'], [2, '9'], [4, '3'], [7, '5'], [10, 'b7']], required: [0, 4, 10, 2] },
    maj9: { tones: [[0, 'R'], [2, '9'], [4, '3'], [7, '5'], [11, '7']], required: [0, 4, 11, 2] },
    m9: { tones: [[0, 'R'], [2, '9'], [3, 'b3'], [7, '5'], [10, 'b7']], required: [0, 3, 10, 2] },
    11: { tones: [[0, 'R'], [2, '9'], [5, '11'], [7, '5'], [10, 'b7']], required: [0, 5, 10] },
    m11: { tones: [[0, 'R'], [2, '9'], [3, 'b3'], [5, '11'], [7, '5'], [10, 'b7']], required: [0, 3, 10, 5] },
    13: { tones: [[0, 'R'], [2, '9'], [4, '3'], [9, '13'], [10, 'b7']], required: [0, 4, 10, 9] },
    maj13: { tones: [[0, 'R'], [2, '9'], [4, '3'], [9, '13'], [11, '7']], required: [0, 4, 11, 9] },
    '7b9': { tones: [[0, 'R'], [1, 'b9'], [4, '3'], [7, '5'], [10, 'b7']], required: [0, 4, 10, 1] },
    '7#9': { tones: [[0, 'R'], [3, '#9'], [4, '3'], [7, '5'], [10, 'b7']], required: [0, 4, 10, 3] },
    '7#5': { tones: [[0, 'R'], [4, '3'], [8, '#5'], [10, 'b7']], required: [0, 4, 8, 10] },
    '7b5': { tones: [[0, 'R'], [4, '3'], [6, 'b5'], [10, 'b7']], required: [0, 4, 6, 10] },
    '7sus4': { tones: [[0, 'R'], [5, '4'], [7, '5'], [10, 'b7']], required: [0, 5, 10] }
  };

  function pcOf(root) {
    const pc = NOTE_TO_PC[root];
    return typeof pc === 'number' ? pc : null;
  }

  function signature(voicing) {
    return voicing.fingers.map(([s, f]) => `${s}:${f}`).sort().join('|');
  }

  function fingerHeuristic(notes) {
    const distinct = [...new Set(notes.filter((n) => n.f > 0).map((n) => n.f))].sort((a, b) => a - b);
    const map = {};
    notes.forEach((n) => { if (n.f > 0) map[n.s] = Math.min(4, distinct.indexOf(n.f) + 1); });
    return map;
  }

  function scoreShape(notes, rootPc, has5th, noteCount) {
    let score = 0;
    const bassPc = ((OPEN_MIDI[6 - notes[0].s] + notes[0].f) % 12 + 12) % 12;
    if (bassPc !== rootPc) score += 1.5;      // prefer root in the bass
    if (!has5th) score += 0.5;                // mild preference for a 5th when the chord has one
    score += (6 - noteCount) * 0.4;           // prefer fuller grips
    const fretted = notes.map((n) => n.f).filter((f) => f > 0);
    const lowest = fretted.length ? Math.min(...fretted) : 0;
    score += lowest * 0.05;                   // gentle nudge toward the nut
    return score;
  }

  /**
   * Generate a diversified, ranked set of playable shapes for a chord.
   * @param {string} root   e.g. 'C', 'Bb', 'F#'
   * @param {string} suffix parser-normalized suffix, e.g. 'major', 'm7', '13'
   * @param {object} [opts] { max?:number (default 12), perBaseFret?:number (default 2) }
   * @returns {Array<object>} canonical voicings (group 'Library'), may be empty
   */
  function generateShapes(root, suffix, opts = {}) {
    const rootPc = pcOf(root);
    const spec = SPECS[suffix] || SPECS[(suffix || '').toLowerCase()];
    if (rootPc === null || !spec) return [];

    const labelByPc = {};
    spec.tones.forEach(([semi, label]) => { labelByPc[(rootPc + semi) % 12] = label; });
    const toneSet = new Set(Object.keys(labelByPc).map(Number));
    const reqSet = new Set(spec.required.map((s) => (rootPc + s) % 12));
    const fifthPc = (rootPc + 7) % 12;
    const hasFifthInChord = toneSet.has(fifthPc);
    const minNotes = Math.max(3, reqSet.size);
    const max = typeof opts.max === 'number' ? opts.max : 12;
    const perBaseFret = typeof opts.perBaseFret === 'number' ? opts.perBaseFret : 2;

    const found = [];
    const seen = new Set();

    for (let base = 0; base <= MAX_BASE; base += 1) {
      const lo = base === 0 ? 0 : base;
      const hi = base === 0 ? 3 : base + 3;

      // Candidate frets per string in this window (open strings only near the nut).
      const cand = {};
      for (let s = 6; s >= 1; s -= 1) {
        const open = OPEN_MIDI[6 - s];
        const list = [];
        if (base <= 3 && toneSet.has(open % 12)) list.push(0);
        for (let f = Math.max(1, lo); f <= hi; f += 1) {
          if (toneSet.has((open + f) % 12)) list.push(f);
        }
        cand[s] = list;
      }

      // Every contiguous block of strings, length minNotes..4. We deliberately
      // cap at four strings: 3–4 note grips are what jazz players actually use and
      // are reliably fingerable, while the standard 5–6 string barre/open shapes
      // already come from the chords.json library. Wider blocks tend to pass a
      // naive fret-count test yet be ergonomically impossible.
      for (let start = 6; start >= 1; start -= 1) {
        for (let len = minNotes; len <= 4 && start - len + 1 >= 1; len += 1) {
          const strings = [];
          for (let k = 0; k < len; k += 1) strings.push(start - k); // low → high pitch
          if (strings.some((s) => cand[s].length === 0)) continue;   // block not fillable
          enumerateBlock(strings, cand, base);
        }
      }

      // eslint-disable-next-line no-inner-declarations
      function enumerateBlock(strings, candidates, baseFret) {
        const chosen = new Array(strings.length);
        (function dfs(i) {
          if (i === strings.length) { validateAndPush(strings, chosen.slice()); return; }
          for (const f of candidates[strings[i]]) { chosen[i] = f; dfs(i + 1); }
        })(0);
      }

      // eslint-disable-next-line no-inner-declarations
      function validateAndPush(strings, frets) {
        const notes = strings.map((s, idx) => ({ s, f: frets[idx] }));
        const pcs = new Set(notes.map((n) => ((OPEN_MIDI[6 - n.s] + n.f) % 12 + 12) % 12));
        for (const r of reqSet) if (!pcs.has(r)) return;   // must contain every required tone
        const fretted = notes.map((n) => n.f).filter((f) => f > 0);
        const span = fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0;
        if (span > MAX_SPAN) return;
        if (new Set(fretted).size > 4) return;             // ≤ 4 fingers (barre = 1)
        const baseFret = fretted.length ? Math.min(...fretted) : 1;

        const voicing = {
          name: '',
          baseFret,
          fingers: notes.map((n) => [n.s, n.f, labelByPc[((OPEN_MIDI[6 - n.s] + n.f) % 12 + 12) % 12]]),
          fingerMap: fingerHeuristic(notes),
          barres: [],
          source: 'gen',
          group: 'Library'
        };
        const sig = signature(voicing);
        if (seen.has(sig)) return;
        seen.add(sig);
        voicing._score = scoreShape(notes, rootPc, pcs.has(fifthPc) || !hasFifthInChord, notes.length);
        found.push(voicing);
      }
    }

    // Rank, then diversify so we don't return eight grips all at the same fret.
    found.sort((a, b) => a._score - b._score || a.baseFret - b.baseFret);
    const byBase = {};
    const out = [];
    for (const v of found) {
      byBase[v.baseFret] = (byBase[v.baseFret] || 0) + 1;
      if (byBase[v.baseFret] > perBaseFret) continue;
      delete v._score;
      out.push(v);
      if (out.length >= max) break;
    }
    return out;
  }

  const api = { generateShapes, signature, SPECS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.ShapeGenerator = api;
})(typeof window !== 'undefined' ? window : globalThis);
