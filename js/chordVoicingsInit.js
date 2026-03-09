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
  document.addEventListener('DOMContentLoaded', () => {
    console.info('[ChordVoicingsInit] DOM ready. Initializing chord voicings dependencies.');
    global.ChordVoicingsModal.ensureModal();
    global.ChordDataService.loadChordData().catch((error) => {
      console.error('[ChordVoicingsInit] Failed to preload chord data.', error);
    });
    if (global.ChordDiagram && typeof global.ChordDiagram.waitForSvguitar === 'function') {
      global.ChordDiagram.waitForSvguitar()
        .then(() => console.info('[ChordVoicingsInit] SVGuitar dependency is ready.'))
        .catch((error) => console.error('[ChordVoicingsInit] SVGuitar dependency failed to load.', error));
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
