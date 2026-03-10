(function (global) {
  const LOAD_TIMEOUT_MS = 5000;
  let libraryReadyPromise;

  function log(level, message, details) {
    const logger = console[level] || console.log;
    if (typeof details === 'undefined') {
      logger(`[ChordDiagram] ${message}`);
      return;
    }
    logger(`[ChordDiagram] ${message}`, details);
  }

  function getSvguitarConstructor() {
    const ctor = global.SVGuitarChord || global.svguitar?.SVGuitarChord;
    return typeof ctor === 'function' ? ctor : null;
  }

  function normalizeFingers(position) {
    const sourceFingers = Array.isArray(position?.fingers) ? position.fingers : [];
    if (sourceFingers.length && Array.isArray(sourceFingers[0])) return sourceFingers;

    const frets = Array.isArray(position?.frets) ? position.frets : [];
    const baseFret = Number(position?.baseFret) > 1 ? Number(position.baseFret) : 1;
    return frets
      .map((fret, idx) => {
        if (typeof fret !== 'number' || fret <= 0) return null;
        const relativeFret = baseFret > 1 ? (fret - baseFret + 1) : fret;
        return [6 - idx, relativeFret];
      })
      .filter(Boolean);
  }

  function normalizeBarres(position) {
    const rawBarres = Array.isArray(position?.barres) ? position.barres : [];
    if (!rawBarres.length) return [];
    if (typeof rawBarres[0] === 'object' && rawBarres[0] !== null) return rawBarres;

    const frets = Array.isArray(position?.frets) ? position.frets : [];
    const baseFret = Number(position?.baseFret) > 1 ? Number(position.baseFret) : 1;
    return rawBarres
      .map((barreFret) => {
        const strings = frets
          .map((fret, idx) => (fret === barreFret ? 6 - idx : null))
          .filter((value) => value !== null);
        if (!strings.length) return null;
        const relativeFret = baseFret > 1 ? (barreFret - baseFret + 1) : barreFret;
        return {
          fret: relativeFret,
          fromString: Math.max(...strings),
          toString: Math.min(...strings)
        };
      })
      .filter(Boolean);
  }

  function normalizeVoicingData(position) {
    return {
      frets: Array.isArray(position?.frets) ? position.frets : [],
      position: position?.baseFret || 1,
      fingers: normalizeFingers(position),
      barres: normalizeBarres(position)
    };
  }

  function renderFallback(container, title, message) {
    const tile = document.createElement('div');
    tile.className = 'chord-diagram-empty';
    tile.innerHTML = `<strong>${title || 'Chord'}</strong><span>${message}</span>`;
    container.appendChild(tile);
  }

  function waitForSvguitar() {
    if (libraryReadyPromise) return libraryReadyPromise;
    libraryReadyPromise = new Promise((resolve, reject) => {
      const script = document.querySelector('script[src*="svguitar"]');
      const existingCtor = getSvguitarConstructor();

      if (existingCtor) {
        log('info', 'SVGuitar constructor detected immediately.');
        resolve(existingCtor);
        return;
      }

      let settled = false;
      const cleanup = () => {
        if (script) {
          script.removeEventListener('load', onLoad);
          script.removeEventListener('error', onError);
        }
        document.removeEventListener('DOMContentLoaded', onDomReady);
      };
      const finish = (fn, payload) => {
        if (settled) return;
        settled = true;
        cleanup();
        fn(payload);
      };
      const tryResolve = (context) => {
        const ctor = getSvguitarConstructor();
        if (ctor) {
          log('info', `SVGuitar became available (${context}).`);
          finish(resolve, ctor);
          return true;
        }
        return false;
      };
      const onLoad = () => {
        if (!tryResolve('script load event')) {
          const err = new Error('SVGuitar script loaded but SVGuitarChord was not found on window.');
          log('error', err.message, {
            availableKeys: Object.keys(global).filter((key) => /svg/i.test(key)).slice(0, 20)
          });
          finish(reject, err);
        }
      };
      const onError = (event) => {
        const err = new Error('Unable to load diagram library script.');
        log('error', err.message, event);
        finish(reject, err);
      };
      const onDomReady = () => {
        tryResolve('DOMContentLoaded');
      };

      if (script) {
        script.addEventListener('load', onLoad, { once: true });
        script.addEventListener('error', onError, { once: true });
        log('info', 'Waiting for SVGuitar script events.', { src: script.getAttribute('src') });
      } else {
        log('warn', 'SVGuitar script tag was not found in DOM.');
      }

      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        tryResolve(`document.readyState=${document.readyState}`);
      } else {
        document.addEventListener('DOMContentLoaded', onDomReady, { once: true });
      }

      setTimeout(() => {
        if (tryResolve(`timeout check ${LOAD_TIMEOUT_MS}ms`)) return;
        const err = new Error(`Timed out waiting for SVGuitar after ${LOAD_TIMEOUT_MS}ms.`);
        log('error', err.message, { scriptPresent: Boolean(script) });
        finish(reject, err);
      }, LOAD_TIMEOUT_MS);
    });

    return libraryReadyPromise;
  }

  async function renderChordDiagram(container, { title, position, index }) {
    container.innerHTML = '';
    container.className = 'chord-diagram-tile';
    const heading = document.createElement('div');
    heading.className = 'chord-diagram-title';
    heading.textContent = title || 'Voicing';
    container.appendChild(heading);

    if (!position || !Array.isArray(position.frets)) {
      log('warn', 'Invalid voicing payload passed to renderChordDiagram.', position);
      renderFallback(container, title, 'Invalid voicing');
      return;
    }

    const svgHolder = document.createElement('div');
    svgHolder.className = 'chord-diagram-svg';
    container.appendChild(svgHolder);

    const voicingData = normalizeVoicingData(position);

    console.log('--- CHORD RENDER ATTEMPT ---');
    if (!position) {
      console.error('DEBUG: No voicing data found for this chord!');
    } else {
      console.log('DEBUG: Raw Voicing Data:', JSON.stringify(position));
      console.log('DEBUG: SVGuitar-ready Voicing Data:', JSON.stringify(voicingData));
    }
    if (!container) {
      console.error(`DEBUG: Could not find container #chord-box-${index} in the DOM.`);
    } else {
      console.log(`DEBUG: Container found. Width: ${container.offsetWidth}, Height: ${container.offsetHeight}`);
    }

    try {
      const SVGuitarCtor = await waitForSvguitar();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const chord = new SVGuitarCtor(svgHolder);
      console.log('DEBUG: SVGuitar Library initialized successfully.');
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
          fingers: voicingData.fingers,
          barres: voicingData.barres,
          position: voicingData.position,
          frets: voicingData.frets
        })
        .draw();
      console.log('DEBUG: Draw command sent to canvas.');
      log('info', `Rendered voicing tile: ${title || 'Voicing'}.`);
    } catch (err) {
      console.error('DEBUG: SVGuitar Library CRASHED during draw:', err);
      log('error', `Render failed for ${title || 'Voicing'}.`, err);
      renderFallback(container, title, 'Unable to load diagram library');
    }
  }

  const api = { renderChordDiagram, waitForSvguitar, normalizeVoicingData };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.ChordDiagram = api;
})(typeof window !== 'undefined' ? window : globalThis);
