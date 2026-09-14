(function (global) {
  /**
   * Decide how to interpret a chart symbol that contains a slash.
   *  · "Bbm7/Eb7", "Gm7/C7"  → a ii–V (or reharm) PAIR → voice BOTH chords.
   *  · "C/G", "Cmaj7/E"       → a slash / inversion bass → voice the LEFT chord.
   * Heuristic: it is a pair only when every part after the first parses to a
   * chord that carries its own quality (a bare note after "/" is a bass note).
   * @returns {string[]} one or two chord symbols
   */
  function splitCompoundSymbol(raw) {
    const parts = `${raw || ''}`.split('/').map((s) => s.trim()).filter(Boolean);
    if (parts.length <= 1) return [`${raw || ''}`.trim()].filter(Boolean);

    const parsed = parts.map((p) => global.ChordParser.parseChordSymbol(p));
    const allChords = parsed.every((p) => p.ok);
    const laterHaveQuality = parsed.slice(1).every((p) => p.ok && p.suffix && p.suffix !== 'major');

    return allChords && laterHaveQuality ? parts : [parts[0]];
  }

  async function buildChordSpec(symbol) {
    const parsed = global.ChordParser.parseChordSymbol(symbol);
    if (!parsed.ok) {
      return { symbol, key: null, suffix: null, voicings: [], subs: [], message: 'Voicings not available for this chord.' };
    }

    let voicings = [];
    try {
      voicings = await global.ChordDataService.getRichVoicings(parsed.key, parsed.suffix);
    } catch (err) {
      voicings = [];
    }

    let subs = [];
    try {
      subs = global.ChordSubstitutions
        ? global.ChordSubstitutions.getSubstitutions(parsed.key, parsed.suffix)
        : [];
    } catch (err) {
      subs = [];
    }

    return {
      symbol: parsed.baseSymbol || symbol,
      key: parsed.key,
      suffix: parsed.suffix,
      voicings,
      subs,
      message: voicings.length ? undefined : `No voicings found for ${symbol}.`
    };
  }

  async function openChordVoicingsForSymbol(chordSymbol, triggerEl) {
    global.ChordVoicingsModal.ensureModal();
    const symbols = splitCompoundSymbol(chordSymbol);

    try {
      const chords = await Promise.all(symbols.map(buildChordSpec));
      const hasAny = chords.some((c) => c.voicings.length || (c.subs && c.subs.length));

      global.ChordVoicingsModal.open({
        title: symbols.join('  ·  '),
        chords,
        message: hasAny ? undefined : `No voicings found for ${chordSymbol}.`,
        trigger: triggerEl
      });
    } catch (err) {
      global.ChordVoicingsModal.open({
        title: chordSymbol,
        chords: [],
        message: 'Voicings not available for this chord.',
        trigger: triggerEl
      });
    }
  }

  global.openChordVoicingsForSymbol = openChordVoicingsForSymbol;
  global.splitCompoundSymbol = splitCompoundSymbol; // exported for tests

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { openChordVoicingsForSymbol, splitCompoundSymbol, buildChordSpec };
  }

  // Both heavy dependencies of the voicings modal are demand-loaded (chords.json
  // by ChordDataService, SVGuitar by ChordDiagram). Build the empty modal shell
  // up front so the open path stays synchronous.
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      global.ChordVoicingsModal.ensureModal();
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
