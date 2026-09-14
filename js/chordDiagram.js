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

  function fretsToTuples(frets) {
    const out = [];
    frets.forEach((f, idx) => {
      if (f !== 'x' && f !== -1 && f != null) out.push([6 - idx, f]);
    });
    return out;
  }

  /**
   * Turn a canonical voicing into the exact `fingers` array SVGuitar draws:
   *  · dot label = fretting-hand finger number (labelMode 'finger', default) or
   *    the interval name (labelMode 'interval'); finger mode falls back to the
   *    interval when a voicing carries no finger data (e.g. curated jazz shells).
   *  · every string not fretted/open is emitted as [string,'x'] so the muted (✕)
   *    and open (○) markers render above the nut, matching a chord dictionary.
   */
  function buildDisplayVoicing(position, labelMode) {
    if (Array.isArray(position)) return position; // legacy flat frets array

    const hasTuples = Array.isArray(position.fingers)
      && position.fingers.length && Array.isArray(position.fingers[0]);
    const src = hasTuples
      ? position.fingers
      : (Array.isArray(position.frets) ? fretsToTuples(position.frets) : []);
    const fingerMap = position.fingerMap || {};
    const used = new Set();

    const display = src.map((tuple) => {
      const [s, f, interval] = tuple;
      used.add(s);
      const intervalText = typeof interval === 'string' ? interval : '';
      let text = '';
      if (labelMode === 'interval') {
        text = intervalText; // label every sounding string, open strings included
      } else if (fingerMap[s]) {
        text = String(fingerMap[s]); // fretting-hand finger number
      } else if (f > 0) {
        text = intervalText; // fretted note with no finger data (jazz shell) → interval
      }
      // open strings in finger mode get no text — just the ○ marker above the nut
      return text ? [s, f, { text, textColor: '#0b1220', color: '#f1c40f' }] : [s, f];
    });

    for (let s = 1; s <= 6; s += 1) {
      if (!used.has(s)) display.push([s, 'x']);
    }

    return {
      // The tile heading already shows the voicing name; keep SVGuitar's own
      // in-diagram title empty so it isn't drawn twice.
      name: '',
      baseFret: position.baseFret || 1,
      fingers: display,
      barres: position.barres || []
    };
  }

  // Mapping Function
  function renderJazzVoicing(targetId, rawVoicing) {
    let formattedFingers = [];

    if (Array.isArray(rawVoicing)) {
      // Flat frets array [LowE, A, D, G, B, HighE] — convert to [[string, fret]]
      rawVoicing.forEach((fret, index) => {
        if (fret !== 'x' && fret !== -1 && fret !== null) {
          const stringNum = 6 - index;
          formattedFingers.push([stringNum, fret]);
        }
      });
    } else if (Array.isArray(rawVoicing.fingers) && rawVoicing.fingers.length && Array.isArray(rawVoicing.fingers[0])) {
      // Canonical / jazz-DB tuple shape: [[string, fret, label?]]
      formattedFingers = rawVoicing.fingers;
    } else if (Array.isArray(rawVoicing.frets)) {
      // Legacy chords.json position: flat `frets` [LowE..HighE] with numeric
      // `fingers` (finger numbers, not tuples). Derive tuples from `frets` so
      // these never render as an empty grid.
      rawVoicing.frets.forEach((fret, index) => {
        if (fret !== 'x' && fret !== -1 && fret !== null) {
          formattedFingers.push([6 - index, fret]);
        }
      });
    } else {
      formattedFingers = rawVoicing.fingers || [];
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

    const chart = new global.svguitar.Chart(targetId);
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

    // Preferred path: SVGuitar is no longer a render-blocking <script> in <head>
    // (it was loaded twice there — CDN *and* local fallback). loadCdnLib fetches
    // one copy on demand, the first time a chord diagram is actually drawn.
    if (!getSvguitarNamespace() && typeof global.loadCdnLib === 'function') {
      libraryReadyPromise = global.loadCdnLib('svguitar').then(() => {
        const ns = getSvguitarNamespace();
        if (!ns) throw new Error('SVGuitar loaded but no usable namespace was found.');
        return ns;
      });
      return libraryReadyPromise;
    }

    // Fallback path: static <script src*="svguitar"> tags (or a test harness
    // that stubs the global). Kept so the module works without the loader.
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

  async function renderChordDiagram(container, { title, position, labelMode = 'finger', fretLabel }) {
    container.innerHTML = '';
    container.className = 'chord-diagram-tile';

    const heading = document.createElement('div');
    heading.className = 'chord-diagram-title';
    heading.textContent = title || 'Voicing';
    container.appendChild(heading);

    // Explicit starting-fret badge — always shown so the neck position is never
    // ambiguous (SVGuitar only prints a position marker for baseFret > 1).
    if (fretLabel) {
      const badge = document.createElement('div');
      badge.className = 'chord-diagram-fret';
      badge.textContent = fretLabel;
      container.appendChild(badge);
    }

    const svgHolder = document.createElement('div');
    svgHolder.className = 'chord-diagram-svg';
    container.appendChild(svgHolder);

    if (!position) {
      renderFallback(container, title, 'Invalid voicing');
      return;
    }

    try {
      await waitForSvguitar();

      const rawVoicing = buildDisplayVoicing(position, labelMode);

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

  const api = { renderChordDiagram, waitForSvguitar, renderJazzVoicing, buildDisplayVoicing };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.ChordDiagram = api;
})(typeof window !== 'undefined' ? window : globalThis);
