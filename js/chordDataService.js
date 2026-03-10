(function (global) {
  let chordDataPromise = null;
  let chordData = null;

  const ROOT_MAP = {
    'C#': 'Csharp', Db: 'Db', 'D#': 'Dsharp', Eb: 'Eb',
    'F#': 'Fsharp', Gb: 'Gb', 'G#': 'Gsharp', Ab: 'Ab',
    'A#': 'Asharp', Bb: 'Bb', B: 'B', Cb: 'Cb', C: 'C',
    D: 'D', E: 'E', F: 'F', G: 'G', A: 'A'
  };

  const NOTE_TO_SEMITONE = {
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

  const chordTypeAliases = {
    maj7: 'Δ7',
    M7: 'Δ7',
    'Δ7': 'Δ7',
    '∆7': 'Δ7',
    m7b5: 'm7b5',
    'ø7': 'm7b5',
    'Ø7': 'm7b5',
    dim7: 'dim7',
    '°7': 'dim7',
    'º7': 'dim7',
    '-7': 'm7'
  };

  function normalizeJazzSuffix(suffix) {
    const raw = `${suffix || ''}`.replace(/\s+/g, '');
    const lower = raw.toLowerCase();

    if (chordTypeAliases[raw]) return chordTypeAliases[raw];
    if (chordTypeAliases[lower]) return chordTypeAliases[lower];

    if (['maj7', 'm7+', 'm7maj', 'mmaj7', 'm7major', 'major7'].includes(lower) || ['M7', 'Δ7', '∆7'].includes(raw)) {
      return 'Δ7';
    }
    if (['m7b5', 'ø7', 'Ø7', 'ø', 'Ø'].includes(raw) || ['m7b5'].includes(lower)) {
      return 'm7b5';
    }
    if (['dim7', '°7', 'º7'].includes(raw) || ['dim7'].includes(lower)) {
      return 'dim7';
    }
    return raw;
  }

  function normalizeChordSymbol(symbol) {
    const parsed = splitChordSymbol(symbol);
    if (!parsed) return symbol;
    return `${parsed.root}${normalizeJazzSuffix(parsed.suffix)}`;
  }

  function splitChordSymbol(symbol) {
    const match = `${symbol || ''}`.match(/^([A-G](?:#|b)?)(.*)$/);
    if (!match) return null;
    return { root: match[1], suffix: match[2] || '' };
  }

  function semitoneDistance(fromRoot, toRoot) {
    const from = NOTE_TO_SEMITONE[fromRoot];
    const to = NOTE_TO_SEMITONE[toRoot];
    if (typeof from !== 'number' || typeof to !== 'number') return null;
    return (to - from + 12) % 12;
  }

  function transposeVoicing(voicing, delta) {
    if (!Array.isArray(voicing?.fingers)) return null;

    const fingers = voicing.fingers.map((finger) => {
      const [stringNum, fret, intervalLabel] = finger;
      if (typeof fret !== 'number' || fret <= 0) return [stringNum, fret, intervalLabel].filter((v) => v !== undefined);
      const shifted = fret + delta;
      return [stringNum, shifted, intervalLabel].filter((v) => v !== undefined);
    });

    const playedFrets = fingers
      .map(([, fret]) => fret)
      .filter((fret) => typeof fret === 'number' && fret > 0);

    if (!playedFrets.length) return null;

    const min = Math.min(...playedFrets);
    const max = Math.max(...playedFrets);
    if (min < 0 || max > 24) return null;

    const sourceMin = Math.min(...voicing.fingers
      .map(([, fret]) => fret)
      .filter((fret) => typeof fret === 'number' && fret > 0));
    const sourceBase = voicing.baseFret || sourceMin;
    const baseOffset = sourceBase - sourceMin;
    const nextBaseFret = min + baseOffset;
    if (nextBaseFret < 1 || nextBaseFret > 24) return null;

    return {
      ...voicing,
      name: delta === 0 ? voicing.name : `${voicing.name} (tr ${delta > 0 ? '+' : ''}${delta})`,
      fingers,
      baseFret: nextBaseFret
    };
  }

  function closestShapeFallback(voicing, delta) {
    const fingers = (voicing.fingers || []).map(([stringNum, fret, intervalLabel]) => {
      if (typeof fret !== 'number' || fret <= 0) return [stringNum, fret, intervalLabel].filter((v) => v !== undefined);
      const shifted = Math.max(0, Math.min(24, fret + delta));
      return [stringNum, shifted, intervalLabel].filter((v) => v !== undefined);
    });
    return {
      ...voicing,
      name: `${voicing.name} (closest shape)`,
      fingers,
      baseFret: Math.max(1, Math.min(24, (voicing.baseFret || 1) + delta))
    };
  }

  function getJazzEntries() {
    return global.JAZZ_CHORDS || global.JazzChordDatabase?.voicings || {};
  }

  function getJazzVoicingsForChord(key, suffix) {
    const db = getJazzEntries();
    const targetSuffix = normalizeJazzSuffix(suffix);
    const directKey = normalizeChordSymbol(`${key}${targetSuffix}`);

    if (Array.isArray(db[directKey]) && db[directKey].length) {
      return db[directKey];
    }

    const candidates = Object.entries(db)
      .map(([symbol, voicings]) => {
        const parsed = splitChordSymbol(normalizeChordSymbol(symbol));
        if (!parsed || normalizeJazzSuffix(parsed.suffix) !== targetSuffix) return null;
        const distance = semitoneDistance(parsed.root, key);
        if (distance === null) return null;
        return { symbol, voicings, distance };
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance);

    if (!candidates.length) return [];

    const source = candidates[0];
    const distanceOptions = [source.distance, source.distance + 12]
      .filter((value, index, arr) => arr.indexOf(value) === index)
      .sort((a, b) => a - b);

    const transposed = [];

    source.voicings.forEach((voicing) => {
      let chosen = null;
      for (const delta of distanceOptions) {
        chosen = transposeVoicing(voicing, delta);
        if (chosen) break;
      }
      transposed.push(chosen || closestShapeFallback(voicing, source.distance));
    });

    return transposed;
  }

  function suffixCandidates(suffix) {
    const s = (suffix || '').toLowerCase();
    const map = {
      major: ['major'],
      m: ['minor', 'm'],
      m7: ['m7', 'minor7'],
      maj7: ['maj7', 'major7', 'maj', 'major'],
      dim: ['dim'],
      dim7: ['dim7'],
      aug: ['aug'],
      sus2: ['sus2'],
      sus4: ['sus4', 'sus'],
      '7': ['7'],
      m7b5: ['m7b5', '7b5'],
      '7b9': ['7b9'],
      '7#9': ['7#9'],
      '7b5': ['7b5'],
      '7#5': ['aug7', '7#5'],
      '9': ['9'],
      m9: ['m9'],
      maj9: ['maj9'],
      '11': ['11'],
      '13': ['13']
    };
    return map[suffix] || map[s] || [suffix, s].filter(Boolean);
  }

  async function loadChordData() {
    if (chordData) return chordData;
    if (!chordDataPromise) {
      chordDataPromise = fetch('data/chords.json').then((r) => {
        if (!r.ok) throw new Error('Unable to load chords.json');
        return r.json();
      }).then((json) => {
        chordData = json;
        return json;
      });
    }
    return chordDataPromise;
  }

  async function getChordVoicings(key, suffix) {
    const jazzVoicings = getJazzVoicingsForChord(key, suffix);
    if (jazzVoicings.length) return jazzVoicings;

    const data = await loadChordData();
    const dataKey = ROOT_MAP[key] || key;
    const entries = data?.chords?.[dataKey] || [];
    const wanted = new Set(suffixCandidates(suffix).map((v) => (v || '').toLowerCase()));
    const hit = entries.find((item) => wanted.has((item.suffix || '').toLowerCase()));
    if (hit?.positions?.length) return hit.positions;

    const basicFallback = entries.find((item) => Array.isArray(item.positions) && item.positions.length);
    return basicFallback?.positions || [];
  }

  function filterJazzVoicings(positions, options = {}) {
    const list = Array.isArray(positions) ? [...positions] : [];
    const demoteOpen = options.demoteOpen !== false;

    return list
      .map((position, idx) => {
        // Support both chords.json format (position.frets array) and jazz DB format
        // (position.fingers as [[string, fret, label]] tuples).
        let frets = Array.isArray(position.frets) ? position.frets : [];
        if (!frets.length && Array.isArray(position.fingers) && position.fingers.length) {
          frets = position.fingers
            .filter((f) => Array.isArray(f) && typeof f[1] === 'number')
            .map((f) => f[1]);
        }

        const played = frets.filter((f) => typeof f === 'number' && f >= 0);
        const openCount = frets.filter((f) => f === 0).length;
        const fretted = frets.filter((f) => typeof f === 'number' && f > 0).length;
        const lowestFret = played.filter((f) => f > 0).sort((a, b) => a - b)[0] || position.baseFret || 1;
        const highestFret = fretted ? Math.max(...played.filter((f) => f > 0)) : lowestFret;
        const compactSpan = fretted ? highestFret - lowestFret : 12;
        const midPenalty = Math.abs(lowestFret - 6);
        const shellBonus = fretted > 0 && fretted <= 4 ? -2 : 0;
        const openPenalty = demoteOpen ? openCount * 4 : openCount;
        const densityPenalty = fretted > 5 ? 4 : 0;
        const score = openPenalty + densityPenalty + midPenalty + compactSpan + shellBonus;
        return { position, idx, score };
      })
      .sort((a, b) => a.score - b.score || a.idx - b.idx)
      .map((v) => v.position);
  }

  const api = {
    loadChordData,
    getChordVoicings,
    filterJazzVoicings,
    normalizeJazzSuffix,
    normalizeChordSymbol,
    getJazzVoicingsForChord
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.ChordDataService = api;
})(typeof window !== 'undefined' ? window : globalThis);
