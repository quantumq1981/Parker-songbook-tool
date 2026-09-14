/**
 * chordSubstitutions.js — pure, headless jazz-reharmonization engine.
 *
 * Given a chord (root + normalized quality) it returns a ranked list of
 * musically-grounded substitution / reharmonization options, each with a short
 * pedagogical reason. Zero DOM, zero I/O → 100% unit-testable in Node.
 *
 * Every suggestion is a plain data object:
 *   {
 *     symbol:   'Db7',        // ready to feed back into the voicings lookup
 *     root:     'Db',         // display root (flat-preferring spelling)
 *     quality:  '7',          // chord-symbol suffix
 *     category: 'Tritone',    // grouping label for the UI
 *     reason:   'Shares the 3rd & b7 …'
 *   }
 *
 * The theory (all intervals in semitones from the chord root):
 *   · Tritone sub          dominant → dominant a tritone (+6) away — shared guide tones (3/b7 swap).
 *   · Diminished (b9)      dominant → °7 on its 3rd (+4) = rootless V7b9 (vii°7 of the target).
 *   · Half-dim (rootless 9) dominant → m7b5 on its 3rd (+4) = rootless dom9 colour.
 *   · Related ii           dominant → m7 a 5th above (+7): turns V7 into ii–V.
 *   · m11 ⇄ 7sus4          D–11 and G7sus4 share a pitch collection (root +5 / +7).
 *   · Relative maj/min     Cmaj7 ⇄ Am7 (+9); m7 ⇄ maj6 (+3); iii-for-I (+4).
 *   · Minor ii–V           m7b5 → its V7b9 a 5th above (+5).
 */
(function (global) {
  const NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  const NOTE_TO_PC = {
    C: 0, 'B#': 0,
    'C#': 1, Db: 1,
    D: 2,
    'D#': 3, Eb: 3,
    E: 4, Fb: 4,
    F: 5, 'E#': 5,
    'F#': 6, Gb: 6,
    G: 7,
    'G#': 8, Ab: 8,
    A: 9,
    'A#': 10, Bb: 10,
    B: 11, Cb: 11
  };

  /** Coarse family enum that drives the rule table. */
  const FAMILY = {
    MAJ7: 'maj7',
    DOM: 'dom',
    DOM_ALT: 'domAlt',
    DOM_SUS: 'domSus',
    MIN7: 'min7',
    MIN11: 'min11',
    MIN7B5: 'min7b5',
    DIM7: 'dim7',
    OTHER: 'other'
  };

  /**
   * Map a (normalized) chord-symbol suffix to a substitution family.
   * Accepts both ChordParser output ('maj7','m7','7b9',…) and raw-ish symbols.
   * @param {string} suffix
   * @returns {string} one of FAMILY.*
   */
  function classifyQuality(suffix) {
    const s = `${suffix || ''}`.replace(/\s+/g, '').toLowerCase();

    if (s === '') return FAMILY.OTHER; // bare major triad → nothing idiomatic to force
    if (/^(m|min|-)?(maj|Δ|\^)(7|9|11|13)?$/i.test(suffix) || /^(maj7|maj9|maj11|maj13|6|69|maj7b5|maj7#5)$/.test(s)) {
      // minor-major stays "other"; pure major-family below
    }

    // Minor family (check minor BEFORE dominant/major to avoid 'm7b5' → '7b5' etc.)
    if (s === 'm7b5' || s === 'ø' || s === 'ø7' || s === '7b5m') return FAMILY.MIN7B5;
    if (s === 'dim7' || s === '°7' || s === 'dim' || s === '°') return FAMILY.DIM7;
    if (s === 'm11' || s === 'min11' || s === '-11') return FAMILY.MIN11;
    if (/^(m|min|-)(6|7|9|13|69|add9|b6)?$/.test(s) || s === 'm' || s === 'min') return FAMILY.MIN7;
    if (/^(mmaj7|mmaj9|m\/maj7|minmaj7|m#7)$/.test(s)) return FAMILY.OTHER;

    // Major-7 family
    if (/^(maj7|maj9|maj11|maj13|6|69|maj7b5|maj7#5|add9)$/.test(s)) return FAMILY.MAJ7;

    // Dominant families
    if (/^(7|9|13)?sus(4|2)?$/.test(s) || s === '7sus4' || s === '9sus4' || s === '13sus4' || s === 'sus4' || s === 'sus') {
      return FAMILY.DOM_SUS;
    }
    if (/^(7|9|13)(b5|#5|b9|#9|#11|b13|alt)+$/.test(s) || s === 'alt' || s === '7alt') return FAMILY.DOM_ALT;
    if (/^(7|9|11|13|7b5|7#5|9b5|aug7|aug9)$/.test(s)) return FAMILY.DOM;

    return FAMILY.OTHER;
  }

  function pcOf(root) {
    const pc = NOTE_TO_PC[root];
    return typeof pc === 'number' ? pc : null;
  }

  function nameAt(rootPc, semitones) {
    return NAMES_FLAT[((rootPc + semitones) % 12 + 12) % 12];
  }

  function sub(rootPc, semitones, quality, category, reason) {
    const root = nameAt(rootPc, semitones);
    return { symbol: `${root}${quality}`, root, quality, category, reason };
  }

  /**
   * Return substitution / reharmonization suggestions for a chord.
   * @param {string} root    e.g. 'G', 'Bb', 'F#'
   * @param {string} quality normalized suffix e.g. '7', 'm11', 'maj7'
   * @returns {Array<{symbol,root,quality,category,reason}>}
   */
  function getSubstitutions(root, quality) {
    const rootPc = pcOf(root);
    if (rootPc === null) return [];
    const family = classifyQuality(quality);
    const srcRoot = NAMES_FLAT[rootPc];
    const src = `${srcRoot}${quality || ''}`;
    const at = (semis) => NAMES_FLAT[((rootPc + semis) % 12 + 12) % 12];
    const out = [];

    switch (family) {
      case FAMILY.DOM:
      case FAMILY.DOM_ALT: {
        out.push(sub(rootPc, 6, '7', 'Tritone', `${src} → ${at(6)}7: shares the 3rd & b7 (guide tones) — the classic bebop reharm.`));
        out.push(sub(rootPc, 4, 'dim7', 'Diminished', `${at(4)}°7 = rootless ${srcRoot}7b9 (the vii°7 on the 3rd) — implies this dominant.`));
        out.push(sub(rootPc, 4, 'm7b5', 'Half-diminished', `${at(4)}m7b5 = rootless ${srcRoot}9 — voices this dominant without its root.`));
        out.push(sub(rootPc, 7, 'm7', 'Make it a ii–V', `Precede ${src} with ${at(7)}m7 (a 5th above) for a full ii–V.`));
        if (family === FAMILY.DOM) {
          out.push(sub(rootPc, 0, '7b9', 'Alteration', `${srcRoot}7b9 — add a b9 for tension pulling to a minor target.`));
          out.push(sub(rootPc, 0, '7#11', 'Alteration', `${srcRoot}7#11 — lydian-dominant colour, same function, brighter.`));
        }
        break;
      }

      case FAMILY.DOM_SUS: {
        out.push(sub(rootPc, 7, 'm11', 'Modal swap', `${src} = ${at(7)}m11 — the sus is the ii voiced over the V root.`));
        out.push(sub(rootPc, 0, '7', 'Resolve the sus', `Drop the 4th to the 3rd for the plain ${srcRoot}7.`));
        out.push(sub(rootPc, 6, '7', 'Tritone', `${at(6)}7 — tritone sub of the underlying dominant.`));
        break;
      }

      case FAMILY.MIN11: {
        out.push(sub(rootPc, 5, '7sus4', 'Sus equivalent', `${src} = ${at(5)}7sus4 — identical pitch collection, a 4th above.`));
        out.push(sub(rootPc, 5, '7', 'Its ii–V', `As the ii of a ii–V, ${src} leads to ${at(5)}7.`));
        out.push(sub(rootPc, 3, '6', 'Relative major', `${at(3)}6 — the relative major a minor 3rd up shares its notes.`));
        break;
      }

      case FAMILY.MIN7: {
        out.push(sub(rootPc, 3, '6', 'Relative major', `${src} = ${at(3)}6 — the relative major 6 a minor 3rd up (same notes).`));
        out.push(sub(rootPc, 5, '7', 'Its ii–V', `As the ii of a ii–V, ${src} leads to ${at(5)}7.`));
        out.push(sub(rootPc, 0, 'm11', 'Extension', `${srcRoot}m11 — stack the 11th for a modern rootless colour.`));
        out.push(sub(rootPc, 5, '7sus4', 'Sus equivalent', `Voiced a 4th above, ${src} becomes ${at(5)}7sus4.`));
        break;
      }

      case FAMILY.MIN7B5: {
        out.push(sub(rootPc, 5, '7b9', 'Minor ii–V', `${src} is the ii of a minor key — resolve it to ${at(5)}7b9.`));
        out.push(sub(rootPc, 8, '9', 'Upper structure', `${src} = rootless ${at(8)}9 — the dominant a major 3rd below.`));
        out.push(sub(rootPc, 3, 'm6', 'Relative minor 6', `${at(3)}m6 a minor 3rd up shares three of its notes.`));
        break;
      }

      case FAMILY.DIM7: {
        out.push(sub(rootPc, 8, '7b9', 'Dominant function', `${src} = rootless ${at(8)}7b9 — resolves like that dominant.`));
        out.push(sub(rootPc, 11, '7b9', 'Dominant function', `Also the vii°7 of ${at(11)}7b9 (a half-step above).`));
        out.push(sub(rootPc, 1, 'm7', 'Chromatic target', `Common passing use: resolves up a half-step into ${at(1)}m7.`));
        break;
      }

      case FAMILY.MAJ7: {
        out.push(sub(rootPc, 9, 'm7', 'Relative minor', `${src} ⇄ ${at(9)}m7 — the relative vi shares three of four notes.`));
        out.push(sub(rootPc, 4, 'm7', 'iii for I', `${at(4)}m7 — the iii substitutes for a tonic major (rootless maj9).`));
        out.push(sub(rootPc, 0, '6', 'Colour swap', `${srcRoot}6 — trade the maj7 for a 6 to lose the b2-against-root rub.`));
        out.push(sub(rootPc, 2, '7sus4', 'Backdoor set-up', `${at(2)}7sus4 — a gospel/backdoor lead-in to ${src}.`));
        break;
      }

      default:
        break;
    }

    return out;
  }

  const api = { getSubstitutions, classifyQuality, FAMILY };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.ChordSubstitutions = api;
})(typeof window !== 'undefined' ? window : globalThis);
