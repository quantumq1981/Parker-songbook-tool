(function (global) {
  let chordDataPromise = null;
  let chordData = null;

  const ROOT_MAP = {
    'C#': 'Csharp', 'Db': 'Db', 'D#': 'Dsharp', 'Eb': 'Eb',
    'F#': 'Fsharp', 'Gb': 'Gb', 'G#': 'Gsharp', 'Ab': 'Ab',
    'A#': 'Asharp', 'Bb': 'Bb', 'B': 'B', 'Cb': 'Cb', 'C': 'C',
    'D': 'D', 'E': 'E', 'F': 'F', 'G': 'G', 'A': 'A'
  };

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
      chordDataPromise = fetch('data/chords.json').then(r => {
        if (!r.ok) throw new Error('Unable to load chords.json');
        return r.json();
      }).then(json => {
        chordData = json;
        return json;
      });
    }
    return chordDataPromise;
  }

  async function getChordVoicings(key, suffix) {
    const data = await loadChordData();
    const dataKey = ROOT_MAP[key] || key;
    const entries = data?.chords?.[dataKey] || [];
    const wanted = new Set(suffixCandidates(suffix).map(v => (v || '').toLowerCase()));
    const hit = entries.find(item => wanted.has((item.suffix || '').toLowerCase()));
    return hit?.positions || [];
  }

  function filterJazzVoicings(positions, options = {}) {
    const list = Array.isArray(positions) ? [...positions] : [];
    const demoteOpen = options.demoteOpen !== false;

    return list
      .map((position, idx) => {
        const frets = Array.isArray(position.frets) ? position.frets : [];
        const played = frets.filter(f => typeof f === 'number' && f >= 0);
        const openCount = frets.filter(f => f === 0).length;
        const fretted = frets.filter(f => typeof f === 'number' && f > 0).length;
        const lowestFret = played.filter(f => f > 0).sort((a, b) => a - b)[0] || position.baseFret || 1;
        const compactSpan = played.length ? Math.max(...played) - Math.min(...played) : 12;
        const midPenalty = Math.abs(lowestFret - 6);
        const shellBonus = played.length <= 4 ? -2 : 0;
        const openPenalty = demoteOpen ? openCount * 4 : openCount;
        const densityPenalty = fretted > 5 ? 4 : 0;
        const score = openPenalty + densityPenalty + midPenalty + compactSpan + shellBonus;
        return { position, idx, score };
      })
      .sort((a, b) => a.score - b.score || a.idx - b.idx)
      .map(v => v.position);
  }

  const api = { loadChordData, getChordVoicings, filterJazzVoicings };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.ChordDataService = api;
})(typeof window !== 'undefined' ? window : globalThis);
