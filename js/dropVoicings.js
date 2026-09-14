/**
 * dropVoicings.js — pure, headless generator for drop-2 and drop-3 guitar
 * voicings. This is the conservatory-grade core: instead of a fixed lookup, it
 * derives the four classic close-position inversions of a seventh chord, applies
 * the drop-2 / drop-3 transformations, and maps each result onto the standard
 * guitar string sets — so every four-note quality yields real, playable voicings
 * in every inversion, in all 12 keys, with correct interval labels.
 *
 * Theory recap (voices numbered from the TOP):
 *   · close position  — the four tones stacked within an octave (4 inversions).
 *   · drop 2          — take the 2nd-from-top voice down an octave.
 *   · drop 3          — take the 3rd-from-top voice down an octave.
 * On guitar, drop-2 sits on four ADJACENT strings; drop-3 skips one string
 * between the bass and the upper three (that skipped string is muted).
 *
 * Output: canonical voicings the renderer already understands —
 *   { name, baseFret, fingers:[[stringNum, absFret, intervalLabel]], fingerMap,
 *     barres:[], source:'drop', group:'Drop 2'|'Drop 3', bass:intervalLabel,
 *     stringSet:[..], inversion:0-3 }
 *
 * Zero DOM / zero I/O → unit-testable in Node.
 */
(function (global) {
  const NOTE_TO_PC = {
    C: 0, 'B#': 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4,
    F: 5, 'E#': 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9,
    'A#': 10, Bb: 10, B: 11, Cb: 11
  };

  // Standard tuning open-string MIDI, low E → high E. Indexed by (6 - stringNum).
  const OPEN_MIDI = [40, 45, 50, 55, 59, 64];

  const MAX_FRET = 17;   // highest fret we will place a note on
  const MAX_SPAN = 5;    // widest fret stretch we consider playable

  // Four-note chord cores: [semitone, intervalLabel] per chord tone (root-position
  // order). Extended/altered qualities resolve to the seventh-chord core the
  // voicing is built from (the extension is then added melodically on top).
  const CORES = {
    maj7:  [[0, 'R'], [4, '3'], [7, '5'], [11, '7']],
    7:     [[0, 'R'], [4, '3'], [7, '5'], [10, 'b7']],
    m7:    [[0, 'R'], [3, 'b3'], [7, '5'], [10, 'b7']],
    m7b5:  [[0, 'R'], [3, 'b3'], [6, 'b5'], [10, 'b7']],
    dim7:  [[0, 'R'], [3, 'b3'], [6, 'b5'], [9, 'bb7']],
    6:     [[0, 'R'], [4, '3'], [7, '5'], [9, '6']],
    m6:    [[0, 'R'], [3, 'b3'], [7, '5'], [9, '6']],
    mMaj7: [[0, 'R'], [3, 'b3'], [7, '5'], [11, '7']],
    '7#5': [[0, 'R'], [4, '3'], [8, '#5'], [10, 'b7']],
    '7b5': [[0, 'R'], [4, '3'], [6, 'b5'], [10, 'b7']],
    maj7b5:[[0, 'R'], [4, '3'], [6, 'b5'], [11, '7']],
    maj7sharp5: [[0, 'R'], [4, '3'], [8, '#5'], [11, '7']]
  };

  // Parser-normalized suffix → core key above. null / missing → no drop voicings
  // (triads, sus and pure quartal chords have no four-note drop form here).
  const SUFFIX_TO_CORE = {
    maj7: 'maj7', maj9: 'maj7', maj11: 'maj7', maj13: 'maj7',
    7: '7', 9: '7', 11: '7', 13: '7', '7b9': '7', '7#9': '7', '9#11': '7',
    m7: 'm7', m9: 'm7', m11: 'm7', m13: 'm7',
    m7b5: 'm7b5',
    dim7: 'dim7',
    6: '6', 69: '6',
    m6: 'm6', m69: 'm6',
    mmaj7: 'mMaj7', mmaj9: 'mMaj7',
    '7#5': '7#5', aug7: '7#5',
    '7b5': '7b5', '9b5': '7b5',
    maj7b5: 'maj7b5', 'maj7#5': 'maj7sharp5'
  };

  // String sets, listed low-pitch → high-pitch (i.e. descending string number).
  const DROP2_SETS = [[6, 5, 4, 3], [5, 4, 3, 2], [4, 3, 2, 1]];
  const DROP3_SETS = [[6, 4, 3, 2], [5, 3, 2, 1]]; // one string skipped after the bass

  function pcOf(root) {
    const pc = NOTE_TO_PC[root];
    return typeof pc === 'number' ? pc : null;
  }

  /**
   * The four close-position voices for inversion k (0=root … 3), as an ordered
   * bottom→top list of { pc, label, off } where `off` is the ascending semitone
   * offset above the bass voice.
   */
  function closePosition(core, rootPc, inversion) {
    const tones = core.map(([semi, label]) => ({ pc: (rootPc + semi) % 12, label }));
    const order = [];
    for (let i = 0; i < 4; i += 1) order.push(tones[(inversion + i) % 4]);
    const voices = [{ pc: order[0].pc, label: order[0].label, off: 0 }];
    for (let i = 1; i < 4; i += 1) {
      const prev = voices[i - 1];
      let step = (order[i].pc - prev.pc % 12 + 12) % 12;
      if (step === 0) step = 12;
      voices.push({ pc: order[i].pc, label: order[i].label, off: prev.off + step });
    }
    return voices; // bottom → top, strictly ascending offsets
  }

  /** Apply a drop transformation → new bottom→top voice list (re-sorted). */
  function applyDrop(voices, type) {
    const v = voices.map((x) => ({ ...x }));
    // voices[] is bottom→top; top is last. "2nd from top" = index 2, "3rd" = 1.
    if (type === 'drop2') v[2].off -= 12;
    else if (type === 'drop3') v[1].off -= 12;
    return v.slice().sort((a, b) => a.off - b.off);
  }

  /**
   * Place an ordered (bottom→top) voice list on a string set, searching for the
   * most compact playable fingering. Returns { notes:[{s,fret,pc,label}], span,
   * lowest } or null.
   */
  function placeOnStringSet(voices, stringSet) {
    const candidates = stringSet.map((s, i) => {
      const open = OPEN_MIDI[6 - s];
      const frets = [];
      for (let f = 0; f <= MAX_FRET; f += 1) {
        if ((open + f) % 12 === voices[i].pc) frets.push(f);
      }
      return { s, open, frets, label: voices[i].label, pc: voices[i].pc };
    });

    let best = null;
    const chosen = [];
    (function dfs(i, prevPitch) {
      if (i === candidates.length) {
        const played = chosen.filter((c) => c.fret > 0).map((c) => c.fret);
        const span = played.length ? Math.max(...played) - Math.min(...played) : 0;
        if (span > MAX_SPAN) return;
        const lowest = played.length ? Math.min(...played) : 1;
        const score = span * 100 + lowest;
        if (!best || score < best.score) {
          best = { notes: chosen.map((c) => ({ ...c })), span, lowest, score };
        }
        return;
      }
      const cand = candidates[i];
      for (const fret of cand.frets) {
        const pitch = cand.open + fret;
        if (pitch > prevPitch) {
          chosen.push({ s: cand.s, fret, pc: cand.pc, label: cand.label });
          dfs(i + 1, pitch);
          chosen.pop();
        }
      }
    })(0, -1);

    return best;
  }

  /** Distinct-fret finger heuristic: lowest fretted note → 1, next → 2, … (barre = shared). */
  function fingerHeuristic(notes) {
    const distinct = [...new Set(notes.filter((n) => n.fret > 0).map((n) => n.fret))].sort((a, b) => a - b);
    const map = {};
    notes.forEach((n) => {
      if (n.fret > 0) {
        const idx = distinct.indexOf(n.fret);
        map[n.s] = Math.min(4, idx + 1);
      }
    });
    return map;
  }

  function toVoicing(placement, meta) {
    const notes = placement.notes.slice().sort((a, b) => b.s - a.s); // low string → high
    const fretted = notes.filter((n) => n.fret > 0).map((n) => n.fret);
    const baseFret = fretted.length ? Math.min(...fretted) : 1;
    return {
      name: meta.name,
      baseFret,
      fingers: notes.map((n) => [n.s, n.fret, n.label]),
      fingerMap: fingerHeuristic(notes),
      barres: [],
      source: 'drop',
      group: meta.group,
      bass: meta.bass,
      inversion: meta.inversion,
      stringSet: meta.stringSet
    };
  }

  function signature(voicing) {
    return voicing.fingers.map(([s, f]) => `${s}:${f}`).sort().join('|');
  }

  /**
   * Generate drop-2 and drop-3 voicings for a chord.
   * @param {string} root    e.g. 'G', 'Bb', 'F#'
   * @param {string} suffix  parser-normalized suffix, e.g. 'm7', 'maj7', '13'
   * @param {object} [opts]   { perGroup?:number }  cap per drop group (default 6)
   * @returns {Array<object>} canonical drop voicings (may be empty)
   */
  function generate(root, suffix, opts = {}) {
    const rootPc = pcOf(root);
    const coreKey = SUFFIX_TO_CORE[suffix] || SUFFIX_TO_CORE[(suffix || '').toLowerCase()];
    if (rootPc === null || !coreKey || !CORES[coreKey]) return [];
    const core = CORES[coreKey];
    const perGroup = typeof opts.perGroup === 'number' ? opts.perGroup : 6;

    const specs = [
      { type: 'drop2', group: 'Drop 2', sets: DROP2_SETS },
      { type: 'drop3', group: 'Drop 3', sets: DROP3_SETS }
    ];

    const out = [];
    const seen = new Set();

    specs.forEach(({ type, group, sets }) => {
      const groupOut = [];
      for (let inv = 0; inv < 4; inv += 1) {
        const voices = applyDrop(closePosition(core, rootPc, inv), type);
        for (const set of sets) {
          const placement = placeOnStringSet(voices, set);
          if (!placement) continue;
          const bass = voices[0].label;
          const meta = {
            group,
            bass,
            inversion: inv,
            stringSet: set,
            name: `${group} · ${bass} in bass · ${set.join('-')}`
          };
          const voicing = toVoicing(placement, meta);
          const sig = signature(voicing);
          if (seen.has(sig)) continue;
          seen.add(sig);
          groupOut.push(voicing);
        }
      }
      // Prefer lower positions across the neck; keep variety of inversions.
      groupOut.sort((a, b) => a.baseFret - b.baseFret);
      out.push(...groupOut.slice(0, perGroup));
    });

    return out;
  }

  const api = { generate, closePosition, applyDrop, placeOnStringSet, CORES, SUFFIX_TO_CORE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.DropVoicings = api;
})(typeof window !== 'undefined' ? window : globalThis);
