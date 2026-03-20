(function (global) {
  const LOAD_TIMEOUT_MS = 5000;
  let libraryReadyPromise;

  function getSvguitarNamespace() {
    if (global.svguitar?.Chart) return global.svguitar;
    if (global.svguitar?.SVGuitarChord) {
      global.svguitar.Chart = class ChartAdapter {
        constructor(target) {
          this.instance = new global.svguitar.SVGuitarChord(target);
          this.payload = {};
        }
        set(payload) {
          this.payload = payload || {};
          return this;
        }
        draw() {
          this.instance
            .configure({
              fingerColor: '#f1c40f',
              fingerTextColor: '#0b1220',
              color: '#e6eeff',
              fixedFretCount: 4,
              padding: 5,
              fontFamily: 'Arial, Helvetica, sans-serif'
            })
            .chord({
              title: this.payload.title || '',
              fingers: this.payload.fingers || [],
              barres: this.payload.barres || [],
              position: this.payload.position || 1
            })
            .draw();
          return this;
        }
      };
      return global.svguitar;
    }
    if (global.SVGuitarChord) {
      global.svguitar = global.svguitar || {};
      if (!global.svguitar.Chart) {
        global.svguitar.Chart = class ChartAdapter {
          constructor(target) {
            this.instance = new global.SVGuitarChord(target);
            this.payload = {};
          }
          set(payload) {
            this.payload = payload || {};
            return this;
          }
          draw() {
            this.instance
              .configure({
                fingerColor: '#f1c40f',
                fingerTextColor: '#0b1220',
                color: '#e6eeff',
                fixedFretCount: 4,
                padding: 5,
                fontFamily: 'Arial, Helvetica, sans-serif'
              })
              .chord({
                title: this.payload.title || '',
                fingers: this.payload.fingers || [],
                barres: this.payload.barres || [],
                position: this.payload.position || 1
              })
              .draw();
            return this;
          }
        };
      }
      return global.svguitar;
    }
    return null;
  }

  function asFingerTuples(rawFingers) {
    if (!Array.isArray(rawFingers)) return [];
    return rawFingers
      .filter((finger) => Array.isArray(finger) && finger.length >= 2)
      .map(([stringNum, fret, label]) => [stringNum, fret, label].filter((value) => value !== undefined));
  }

  function withIntervalLabels(formattedFingers, rawVoicing) {
    const intervalArray = Array.isArray(rawVoicing?.intervals) ? rawVoicing.intervals : [];
    return formattedFingers.map((finger, idx) => {
      const tupleLabel = typeof finger[2] === 'string' ? finger[2] : null;
      const label = tupleLabel || intervalArray[idx];
      if (!label) return [finger[0], finger[1]];
      return [finger[0], finger[1], { text: label, textColor: '#0b1220', color: '#f1c40f' }];
    });
  }

  // Mapping Function
  function renderJazzVoicing(svgContainer, rawVoicing) {
    let formattedFingers = [];

    if (Array.isArray(rawVoicing)) {
      // Flat frets array [LowE, A, D, G, B, HighE] — convert to [[string, fret]]
      rawVoicing.forEach((fret, index) => {
        if (fret !== 'x' && fret !== -1 && fret !== null) {
          const stringNum = 6 - index;
          formattedFingers.push([stringNum, fret]);
        }
      });
    } else {
      formattedFingers = rawVoicing.fingers;
    }

    // SVGuitar chord().fingers expects RELATIVE fret positions (1–fixedFretCount)
    // within the position window, not absolute guitar fret numbers.
    //
    // Jazz DB / transposed voicings store absolute frets and have no .frets array.
    // chords.json fallback voicings already use relative positions AND have a .frets array.
    //
    // Convert: relativeFret = absoluteFret - baseFret + 1  (only when baseFret > 1)
    const baseFret = rawVoicing.baseFret || 1;
    if (!Array.isArray(rawVoicing.frets) && baseFret > 1) {
      formattedFingers = formattedFingers.map(([string, fret, ...rest]) => [
        string,
        fret > 0 ? fret - baseFret + 1 : fret, // keep open strings (0) as-is
        ...rest
      ]);
    }

    const chart = new global.svguitar.Chart(svgContainer);
    chart.set({
      fingers: formattedFingers,
      barres: rawVoicing.barres || [],
      position: baseFret,
      title: rawVoicing.name || '',
      fixedFretCount: 4,
      padding: 5
    }).draw();
  }

  function waitForSvguitar() {
    if (libraryReadyPromise) return libraryReadyPromise;
    libraryReadyPromise = new Promise((resolve, reject) => {
      const ready = getSvguitarNamespace();
      if (ready) return resolve(ready);

      const scripts = document.querySelectorAll('script[src*="svguitar"]');
      let settled = false;
      const finish = (fn, payload) => {
        if (settled) return;
        settled = true;
        fn(payload);
      };

      const check = () => {
        const ns = getSvguitarNamespace();
        if (ns) {
          finish(resolve, ns);
          return true;
        }
        return false;
      };

      scripts.forEach((script) => {
        script.addEventListener('load', () => check(), { once: true });
        script.addEventListener('error', () => {
          console.warn('[ChordDiagram] A svguitar script failed to load:', script.src);
          // Don't reject – the other script (CDN or local) may still load successfully.
          check();
        }, { once: true });
      });

      if (!check()) {
        setTimeout(() => {
          if (!check()) finish(reject, new Error(`Timed out waiting for SVGuitar after ${LOAD_TIMEOUT_MS}ms.`));
        }, LOAD_TIMEOUT_MS);
      }
    });

    return libraryReadyPromise;
  }

  function renderFallback(container, title, message) {
    const tile = document.createElement('div');
    tile.className = 'chord-diagram-empty';
    tile.innerHTML = `<strong>${title || 'Chord'}</strong><span>${message}</span>`;
    container.appendChild(tile);
  }

  function drawWithRecovery(svgHolder, rawVoicing) {
    return new Promise((resolve, reject) => {
      const draw = () => {
        try {
          renderJazzVoicing(svgHolder, rawVoicing);
          const svg = svgHolder.querySelector('svg');
          if (!svg) {
            throw new Error('SVG element not found after render.');
          }
          svg.style.width = '100%';
          svg.style.height = 'auto';
          resolve();
        } catch (firstError) {
          console.warn('[ChordDiagram] Initial render failed. Retrying once.', firstError);
          svgHolder.innerHTML = '';
          setTimeout(() => {
            try {
              renderJazzVoicing(svgHolder, rawVoicing);
              const svg = svgHolder.querySelector('svg');
              if (!svg) {
                throw new Error('SVG element not found after retry render.');
              }
              svg.style.width = '100%';
              svg.style.height = 'auto';
              resolve();
            } catch (retryError) {
              reject(retryError);
            }
          }, 150);
        }
      };

      setTimeout(draw, 100);
    });
  }

  async function renderChordDiagram(container, { title, position }) {
    container.innerHTML = '';
    container.className = 'chord-diagram-tile';

    const heading = document.createElement('div');
    heading.className = 'chord-diagram-title';
    heading.textContent = title || 'Voicing';
    container.appendChild(heading);

    const svgHolder = document.createElement('div');
    svgHolder.className = 'chord-diagram-svg';
    container.appendChild(svgHolder);

    if (!position) {
      renderFallback(container, title, 'Invalid voicing');
      return;
    }

    try {
      await waitForSvguitar();

      const fingerTuples = Array.isArray(position?.fingers)
        ? asFingerTuples(position.fingers)
        : [];
      const rawVoicing = Array.isArray(position)
        ? position
        : {
          ...position,
          fingers: withIntervalLabels(fingerTuples, position)
        };

      await drawWithRecovery(svgHolder, rawVoicing);
    } catch (err) {
      const svgReady = Boolean(global.svguitar?.Chart || global.svguitar?.SVGuitarChord || global.SVGuitarChord);
      const detail = !svgReady
        ? `Missing svguitar runtime at ${global.location?.href || 'unknown location'}`
        : 'Unable to render diagram';
      console.error('[ChordDiagram] Render failure.', err);
      renderFallback(container, title, detail);
    }
  }

  const api = { renderChordDiagram, waitForSvguitar, renderJazzVoicing };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.ChordDiagram = api;
})(typeof window !== 'undefined' ? window : globalThis);
