(function (global) {
  function renderFallback(container, title, message) {
    const tile = document.createElement('div');
    tile.className = 'chord-diagram-empty';
    tile.innerHTML = `<strong>${title || 'Chord'}</strong><span>${message}</span>`;
    container.appendChild(tile);
  }

  function renderChordDiagram(container, { title, position }) {
    container.innerHTML = '';
    container.className = 'chord-diagram-tile';
    const heading = document.createElement('div');
    heading.className = 'chord-diagram-title';
    heading.textContent = title || 'Voicing';
    container.appendChild(heading);

    if (!position || !Array.isArray(position.frets)) {
      renderFallback(container, title, 'Invalid voicing');
      return;
    }

    const svgHolder = document.createElement('div');
    svgHolder.className = 'chord-diagram-svg';
    container.appendChild(svgHolder);

    try {
      if (!global.SVGuitarChord) {
        renderFallback(container, title, 'Diagram library unavailable');
        return;
      }
      const chord = new global.SVGuitarChord(svgHolder);
      chord
        .configure({
          theme: {
            backgroundColor: '#121826',
            neckColor: '#2d3752',
            stringColor: '#7fa2ff',
            fretLabelColor: '#ff9800',
            noteColor: '#ff9800',
            textColor: '#e6eeff'
          }
        })
        .chord({
          title,
          fingers: position.fingers || [],
          barres: position.barres || [],
          position: position.baseFret || 1,
          frets: position.frets
        });
    } catch (err) {
      renderFallback(container, title, 'Unable to render voicing');
    }
  }

  const api = { renderChordDiagram };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.ChordDiagram = api;
})(typeof window !== 'undefined' ? window : globalThis);
