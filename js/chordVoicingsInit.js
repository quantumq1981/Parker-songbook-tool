(function (global) {
  async function openChordVoicingsForSymbol(chordSymbol, triggerEl) {
    const parsed = global.ChordParser.parseChordSymbol(chordSymbol);
    if (!parsed.ok) {
      global.ChordVoicingsModal.open({
        symbol: chordSymbol,
        message: 'Voicings not available for this chord.',
        trigger: triggerEl
      });
      return;
    }

    try {
      const positions = await global.ChordDataService.getChordVoicings(parsed.key, parsed.suffix);
      if (!positions.length) {
        global.ChordVoicingsModal.open({
          symbol: parsed.original,
          message: `No voicings found for ${parsed.original}.`,
          trigger: triggerEl
        });
        return;
      }
      global.ChordVoicingsModal.open({ symbol: parsed.original, positions, trigger: triggerEl });
    } catch (err) {
      global.ChordVoicingsModal.open({
        symbol: parsed.original,
        message: 'Voicings not available for this chord.',
        trigger: triggerEl
      });
    }
  }

  global.openChordVoicingsForSymbol = openChordVoicingsForSymbol;

  // Both heavy dependencies of the voicings modal are now demand-loaded rather
  // than warmed at DOMContentLoaded, where they competed with first paint:
  //   · data/chords.json (369 KB) — ChordDataService.getChordVoicings() already
  //     fetches it lazily, and only when the in-memory jazz DB has no match.
  //   · SVGuitar (~330 KB)        — ChordDiagram.renderChordDiagram() awaits
  //     waitForSvguitar(), which fetches it on the first draw.
  // Building the (empty) modal shell up front is cheap and keeps the open path
  // synchronous, so that stays.
  document.addEventListener('DOMContentLoaded', () => {
    global.ChordVoicingsModal.ensureModal();
  });
})(typeof window !== 'undefined' ? window : globalThis);
