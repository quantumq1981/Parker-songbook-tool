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

  async function renderChordDiagram(container, { title, position }) {
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

    try {
      const SVGuitarCtor = await waitForSvguitar();
      const chord = new SVGuitarCtor(svgHolder);
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
        })
        .draw();
      log('info', `Rendered voicing tile: ${title || 'Voicing'}.`);
    } catch (err) {
      log('error', `Render failed for ${title || 'Voicing'}.`, err);
      renderFallback(container, title, 'Unable to load diagram library');
    }
  }

  const api = { renderChordDiagram, waitForSvguitar };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.ChordDiagram = api;
})(typeof window !== 'undefined' ? window : globalThis);
