/**
 * voicingLibrary.js — pure, headless voicing normalizer + merger.
 *
 * Turns the two raw data sources the app already ships into ONE canonical,
 * interval-labeled voicing shape the renderer understands, so every chord shows
 * several real, playable voicings across the neck instead of a single shell.
 *
 * Sources:
 *   1. data/chords.json  — the open-source tombatossals guitar DB. Each position
 *      is { frets:[6 ints], baseFret, barres, midi }. `frets` is low-E→high-E,
 *      -1 = muted, 0 = open, N = the Nth fret *within the baseFret window*
 *      (absolute fret = baseFret + N - 1). We derive R/3/5/b7 interval labels
 *      straight from the geometry (open-string MIDI + fret) — no reliance on the
 *      DB's own `midi` array — so labelling works for all 12 keys × all suffixes.
 *   2. js/jazzChordDatabase.js — curated shell / drop-2 voicings, already in the
 *      canonical [[string, absFret, label]] tuple shape. Kept first because they
 *      are the idiomatic bebop grips.
 *
 * Canonical voicing shape (what the renderer consumes):
 *   { name, baseFret, fingers:[[stringNum(1-6), absFret, label?]], barres:[], source }
 *   · stringNum: 6 = low E … 1 = high E (SVGuitar convention)
 *   · absFret:   absolute fret number; 0 = open string; muted strings omitted
 *
 * Zero DOM / zero I/O → unit-testable in Node.
 */
(function (global) {
  const NOTE_TO_PC = {
    C: 0, 'B#': 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4,
    F: 5, 'E#': 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9,
    'A#': 10, Bb: 10, B: 11, Cb: 11
  };

  // Open-string MIDI for standard tuning, low E → high E (matches chords.json
  // "tunings.standard" = E2 A2 D3 G3 B3 E4).
  const OPEN_MIDI = [40, 45, 50, 55, 59, 64];

  // The 12 keys as spelled in chords.json, indexed by pitch class.
  const PC_TO_DB_KEY = ['C', 'Csharp', 'D', 'Eb', 'E', 'F', 'Fsharp', 'G', 'Ab', 'A', 'Bb', 'B'];

  // Generic jazz interval labels by semitone distance from the root.
  const INTERVAL_LABELS = ['R', 'b9', '9', 'b3', '3', '11', 'b5', '5', '#5', '13', 'b7', '7'];

  // Allowed chord-tone / tension pitch classes (semitones from root) per quality.
  // Used to VALIDATE voicings against the chord they claim to be — the shipped
  // chords.json has a few mis-filed positions (e.g. an Am7 grip under Bbm7 pos0);
  // any voicing containing a pitch outside this set is rejected as junk.
  const ALLOWED_INTERVALS = {
    major: [0, 4, 7],
    minor: [0, 3, 7],
    m: [0, 3, 7],
    m7: [0, 3, 7, 10],
    maj7: [0, 4, 7, 11],
    '7': [0, 4, 7, 10],
    dim: [0, 3, 6],
    dim7: [0, 3, 6, 9],
    aug: [0, 4, 8],
    sus2: [0, 2, 7],
    sus4: [0, 5, 7],
    sus: [0, 5, 7],
    m7b5: [0, 3, 6, 10],
    '6': [0, 4, 7, 9],
    '69': [0, 2, 4, 7, 9],
    m6: [0, 3, 7, 9],
    m69: [0, 2, 3, 7, 9],
    '9': [0, 2, 4, 7, 10],
    m9: [0, 2, 3, 7, 10],
    maj9: [0, 2, 4, 7, 11],
    '11': [0, 2, 4, 5, 7, 10],
    m11: [0, 2, 3, 5, 7, 10],
    '13': [0, 2, 4, 5, 7, 9, 10],
    m13: [0, 2, 3, 5, 7, 9, 10],
    '7b9': [0, 1, 4, 7, 10],
    '7#9': [0, 3, 4, 7, 10],
    '7b5': [0, 4, 6, 10],
    '7#5': [0, 4, 8, 10],
    '9b5': [0, 2, 4, 6, 10],
    '9#11': [0, 2, 4, 6, 7, 10],
    alt: [0, 1, 3, 4, 6, 8, 10],
    '7alt': [0, 1, 3, 4, 6, 8, 10],
    '7sus4': [0, 5, 7, 10],
    '9sus4': [0, 2, 5, 7, 10],
    maj11: [0, 2, 4, 5, 7, 11],
    maj13: [0, 2, 4, 7, 9, 11],
    mmaj7: [0, 3, 7, 11],
    mmaj9: [0, 2, 3, 7, 11],
    add9: [0, 2, 4, 7],
    madd9: [0, 2, 3, 7]
  };

  // Map a parser-normalized suffix to candidate chords.json suffixes (with
  // graceful fallbacks so a rare quality still yields a usable grip).
  const SUFFIX_CANDIDATES = {
    major: ['major'],
    m: ['minor'],
    minor: ['minor'],
    m7: ['m7'],
    maj7: ['maj7', 'maj9'],
    '7': ['7', '9'],
    dim: ['dim'],
    dim7: ['dim7', 'dim'],
    aug: ['aug'],
    sus2: ['sus2', 'sus2sus4'],
    sus4: ['sus4', 'sus'],
    sus: ['sus4', 'sus'],
    m7b5: ['m7b5'],
    '6': ['6', '69'],
    '69': ['69', '6'],
    m6: ['m6', 'm69'],
    m69: ['m69', 'm6'],
    '9': ['9', '7'],
    '11': ['11', '9', '7sus4'],
    '13': ['13', '9', '7'],
    '7b9': ['7b9', '7', '9'],
    '7#9': ['7#9', '7', '9'],
    '7b5': ['7b5', '9b5', '7'],
    '7#5': ['aug7', '7#5', '7'],
    '9b5': ['9b5', '7b5', '9'],
    '9#11': ['9#11', '9', '7'],
    alt: ['7b9', '7#9', '7b5', '7'],
    '7alt': ['7b9', '7#9', '7b5', '7'],
    '7sus4': ['7sus4', 'sus4'],
    '9sus4': ['9sus4', '7sus4', 'sus4'],
    m9: ['m9', 'm7'],
    m11: ['m11', 'm9', 'm7'],
    m13: ['m13', 'm11', 'm9', 'm7'],
    maj9: ['maj9', 'maj7'],
    maj11: ['maj11', 'maj9', 'maj7'],
    maj13: ['maj13', 'maj9', 'maj7'],
    mmaj7: ['mmaj7'],
    mmaj9: ['mmaj9', 'mmaj7'],
    add9: ['add9', 'major'],
    madd9: ['madd9', 'minor']
  };

  function pcOf(root) {
    const pc = NOTE_TO_PC[root];
    return typeof pc === 'number' ? pc : null;
  }

  function labelFor(pitchMidi, rootPc) {
    if (rootPc === null || typeof pitchMidi !== 'number') return undefined;
    const deg = ((pitchMidi % 12) - rootPc + 12) % 12;
    return INTERVAL_LABELS[deg];
  }

  /**
   * Convert one chords.json position into a canonical voicing.
   * @param {{frets:number[], baseFret?:number, barres?:any[]}} position
   * @param {string} key  chord root, e.g. 'Bb'
   * @param {string} [name]
   * @returns {object|null}
   */
  function positionToVoicing(position, key, name) {
    if (!position || !Array.isArray(position.frets)) return null;
    const rootPc = pcOf(key);
    const baseFret = position.baseFret || 1;
    const fingers = [];
    const fingerMap = {}; // stringNum → fretting-hand finger (1–4) from chords.json

    position.frets.forEach((fret, idx) => {
      if (fret === -1 || fret === 'x' || fret == null) return; // muted → omitted here
      const stringNum = 6 - idx;
      const absFret = fret === 0 ? 0 : baseFret + fret - 1;
      const pitch = OPEN_MIDI[idx] + absFret; // absFret 0 → open string pitch
      const label = labelFor(pitch, rootPc);
      const fingerNum = Array.isArray(position.fingers) ? position.fingers[idx] : 0;
      if (fret > 0 && fingerNum) fingerMap[stringNum] = fingerNum;
      fingers.push(label ? [stringNum, absFret, label] : [stringNum, absFret]);
    });

    if (!fingers.some(([, f]) => typeof f === 'number' && f > 0) && baseFret > 1) return null;
    if (!fingers.length) return null;

    return { name: name || '', baseFret, fingers, fingerMap, barres: [], source: 'lib' };
  }

  /** Canonicalize a jazz-DB voicing (already tuple-shaped) — clone + tag. */
  function jazzToVoicing(voicing) {
    if (!voicing || !Array.isArray(voicing.fingers)) return null;
    return {
      name: voicing.name || '',
      baseFret: voicing.baseFret || 1,
      fingers: voicing.fingers.map((f) => f.slice()),
      fingerMap: {}, // curated shells carry no fretting-hand finger data
      barres: Array.isArray(voicing.barres) ? voicing.barres.slice() : [],
      source: 'jazz'
    };
  }

  /** Stable fret signature for deduping (independent of label / order). */
  function signature(voicing) {
    return (voicing.fingers || [])
      .map(([s, f]) => `${s}:${f}`)
      .sort()
      .join('|');
  }

  /**
   * True if every sounding pitch of the voicing is a chord tone/tension of
   * key+suffix. Unknown suffix → accept (don't over-filter rare qualities).
   */
  function isValidVoicing(voicing, key, suffix) {
    const rootPc = pcOf(key);
    if (rootPc === null) return false;
    const allowed = ALLOWED_INTERVALS[suffix] || ALLOWED_INTERVALS[(suffix || '').toLowerCase()];
    if (!allowed) return true;
    const allowedSet = new Set(allowed);
    return (voicing.fingers || []).every(([stringNum, absFret]) => {
      if (typeof stringNum !== 'number') return true;
      const idx = 6 - stringNum;
      if (idx < 0 || idx > 5) return true;
      const pitch = OPEN_MIDI[idx] + (typeof absFret === 'number' ? absFret : 0);
      const deg = ((pitch % 12) - rootPc + 12) % 12;
      return allowedSet.has(deg);
    });
  }

  function lowestFret(voicing) {
    const played = (voicing.fingers || []).map(([, f]) => f).filter((f) => typeof f === 'number' && f > 0);
    return played.length ? Math.min(...played) : (voicing.baseFret || 1);
  }

  /** Resolve the chords.json positions array for key+suffix (with fallbacks). */
  function resolveEntries(chordsDb, key, suffix) {
    const rootPc = pcOf(key);
    if (rootPc === null || !chordsDb || !chordsDb.chords) return [];
    const dbKey = PC_TO_DB_KEY[rootPc];
    const entries = chordsDb.chords[dbKey] || [];
    if (!entries.length) return [];

    const candidates = SUFFIX_CANDIDATES[suffix] || SUFFIX_CANDIDATES[(suffix || '').toLowerCase()] || [suffix];
    for (const cand of candidates) {
      const hit = entries.find((e) => (e.suffix || '').toLowerCase() === (cand || '').toLowerCase());
      if (hit && Array.isArray(hit.positions) && hit.positions.length) return hit.positions;
    }
    return [];
  }

  /**
   * Build the merged, deduped, labeled voicing set for a chord.
   * @param {object} opts
   * @param {string} opts.key       chord root, e.g. 'Bb'
   * @param {string} opts.suffix    parser-normalized suffix, e.g. 'm7'
   * @param {object} [opts.chordsDb] parsed data/chords.json
   * @param {Array}  [opts.jazzList] canonical jazz-DB voicings for this chord
   * @param {number} [opts.limit]   max voicings returned (default 10)
   * @returns {Array<object>} canonical voicings
   */
  function buildVoicings({ key, suffix, chordsDb, jazzList, limit = 8 }) {
    const seen = new Set();
    const merged = [];

    // Jazz shells are added first so they win ties during dedupe, but the final
    // list is ordered by neck position (open / low shapes first) to match a
    // standard chord dictionary.
    const jazz = (Array.isArray(jazzList) ? jazzList : [])
      .map(jazzToVoicing)
      .filter(Boolean)
      .filter((v) => isValidVoicing(v, key, suffix));

    const lib = resolveEntries(chordsDb, key, suffix)
      .map((p, i) => positionToVoicing(p, key, `${key}${suffix} · pos ${i + 1}`))
      .filter(Boolean)
      .filter((v) => isValidVoicing(v, key, suffix));

    [...jazz, ...lib].forEach((v) => {
      const sig = signature(v);
      if (!sig || seen.has(sig)) return;
      seen.add(sig);
      merged.push(v);
    });

    merged.sort((a, b) => lowestFret(a) - lowestFret(b));
    return merged.slice(0, limit);
  }

  const api = {
    buildVoicings,
    positionToVoicing,
    jazzToVoicing,
    resolveEntries,
    isValidVoicing,
    signature,
    labelFor,
    PC_TO_DB_KEY,
    INTERVAL_LABELS,
    ALLOWED_INTERVALS
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.VoicingLibrary = api;
})(typeof window !== 'undefined' ? window : globalThis);
