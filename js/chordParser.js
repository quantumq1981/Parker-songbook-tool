(function (global) {
  const SUFFIX_ALIASES = new Map([
    ['', 'major'],
    ['maj', 'major'],
    ['major', 'major'],
    ['m', 'm'],
    ['min', 'm'],
    ['-', 'm'],
    ['m7', 'm7'],
    ['min7', 'm7'],
    ['-7', 'm7'],
    ['maj7', 'maj7'],
    ['Δ7', 'maj7'],
    ['Δ', 'maj7'],
    ['^7', 'maj7'],
    ['^', 'maj7'],
    ['7', '7'],
    ['dim', 'dim'],
    ['°', 'dim'],
    ['dim7', 'dim7'],
    ['°7', 'dim7'],
    ['aug', 'aug'],
    ['+', 'aug'],
    ['sus2', 'sus2'],
    ['sus4', 'sus4'],
    ['sus', 'sus4'],
    ['m7b5', 'm7b5'],
    ['ø', 'm7b5'],
    ['ø7', 'm7b5'],
    ['9', '9'],
    ['11', '11'],
    ['13', '13'],
    ['7b9', '7b9'],
    ['7#9', '7#9'],
    ['7b5', '7b5'],
    ['7#5', '7#5'],
    ['m9', 'm9'],
    ['maj9', 'maj9']
  ]);

  function normalizeSymbols(suffix) {
    return suffix
      .replace(/\s+/g, '')
      .replace(/♭/g, 'b')
      .replace(/♯/g, '#')
      .replace(/−/g, '-')
      .replace(/\u00BA/g, '°');
  }

  function normalizeSuffix(rawSuffix) {
    const cleaned = normalizeSymbols(rawSuffix || '');
    if (SUFFIX_ALIASES.has(cleaned)) return SUFFIX_ALIASES.get(cleaned);
    if (SUFFIX_ALIASES.has(cleaned.toLowerCase())) return SUFFIX_ALIASES.get(cleaned.toLowerCase());

    if (/^m(aj)?9$/i.test(cleaned)) return cleaned.toLowerCase() === 'm9' ? 'm9' : 'maj9';
    if (/^maj13$/i.test(cleaned)) return 'maj13';
    if (/^maj11$/i.test(cleaned)) return 'maj11';
    if (/^m11$/i.test(cleaned)) return 'm11';
    if (/^m13$/i.test(cleaned)) return 'm13';
    if (/^(7(b9|#9|b5|#5|#11|b13)|9|11|13)$/i.test(cleaned)) return cleaned;
    return cleaned;
  }

  function parseChordSymbol(symbol) {
    const original = (symbol || '').trim();
    if (!original) {
      return { ok: false, original, error: 'EMPTY_SYMBOL' };
    }

    const [lookupSymbol] = original.split('/');
    const match = lookupSymbol.match(/^([A-G])([b#]?)(.*)$/);
    if (!match) {
      return { ok: false, original, lookupSymbol, error: 'INVALID_ROOT' };
    }

    const key = `${match[1]}${match[2] || ''}`;
    const rawSuffix = match[3] || '';
    const suffix = normalizeSuffix(rawSuffix);

    return {
      ok: true,
      original,
      lookupSymbol,
      baseSymbol: `${key}${rawSuffix}`,
      key,
      suffix
    };
  }

  const api = { parseChordSymbol, normalizeSuffix };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.ChordParser = api;
})(typeof window !== 'undefined' ? window : globalThis);
