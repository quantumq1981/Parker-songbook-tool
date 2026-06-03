# Deep Codebase Review — Charlie Parker Songbook Trainer

**Reviewer role:** Senior software architect / performance engineer
**Repository:** quantumq1981/Parker-songbook-tool
**Reviewed revision:** branch `claude/parker-songbook-review-l9705` (see deviation note below)
**Scope:** `index.html` (7,135 lines), `js/*.js`, `src/features/resonance-engine/**`, `service-worker.js`, `manifest.json`
**Method:** Purely static analysis — no profiler, no runtime instrumentation.

---

## Implementation status (this PR)

The highest- and mid-priority findings have now been **fixed in `index.html`** on this branch:

| Item | Status |
|------|--------|
| **S1** stored XSS via imported titles | ✅ Fixed — added hoisted `escapeHtml()`; all dynamic-data `innerHTML`/`document.write` sinks escaped (lead-sheet header/meta, imported list, both practice tables, print view) |
| **S4** `document.write` print path | ✅ Fixed — name/description/chords escaped |
| CSV formula injection (bonus) | ✅ Fixed — `exportCSV` neutralises `= + - @` lead chars |
| **S3** no CSP | ✅ Added a functionality-preserving CSP `<meta>` (object-src/base-uri/form-action locked down; script/connect origins restricted) |
| **S2** SRI + version pinning | ⏳ Deferred — computing/validating SRI hashes and resolving the exact AlphaTab version both require fetching the CDN files, which this environment's network allowlist blocks. Guessing a hash/version would break a working feature. Tracked as a follow-up; CSP `<meta>` notes it. |
| **P1** pitch hot path (86 Hz) | ✅ Optimized — added `_pcIndex` (pc→cells); `highlightPc` toggles only changed cells; pitch-display refs cached once |
| **P3** per-click fretboard scans | ✅ Optimized — all `querySelectorAll('.fret')` repaints now iterate the cached `_fretGrid` |
| **P2** per-keystroke song re-scan | ✅ Optimized — `renderStats` single-pass + memoized scale total; search input debounced (120 ms) |
| **ST1** monolith de-composition | ⏳ Not in this PR — large structural refactor; recommend a dedicated follow-up |

The analysis below is the original review that motivated these changes.

---

## Deviation from the supplied instructions

The task brief asks me to `git checkout claude/alphatab-notation-integration-QkYOX`. That branch **does not exist** in this clone (neither locally nor on `origin`; only `main` and `claude/parker-songbook-review-l9705` are present). Per the project's own `CLAUDE.md` rule — *"if any part of the CLAUDE.md contradicts the steps below, you must follow the CLAUDE.md and explicitly explain any deviation"* — and per my branch directive, I performed the review on `claude/parker-songbook-review-l9705`, which carries the same `index.html` (~7,135 lines, 66 songs) the brief describes. All file/line references below are to that revision. Everything else in the brief was followed exactly.

---

## Phase 1 — Codebase understanding

### 1.1 Topology

| Layer | Where | Notes |
|-------|-------|-------|
| App shell + 90% of logic | `index.html` (7,135 lines) | Inline `<style>`, inline `<script>`, ~150 named functions |
| Chord rendering modules | `js/chordParser.js`, `js/jazzChordDatabase.js`, `js/chordDataService.js`, `js/chordDiagram.js`, `js/chordVoicingsModal.js`, `js/chordVoicingsInit.js` | Loaded as classic `<script>` tags (globals), not ES modules |
| Resonance engine | `js/resonanceEngine.js` + `src/features/resonance-engine/**` | A second, duplicated copy lives under `src/.../core/` |
| Pitch detection | `js/pitch-processor.js` | `AudioWorkletProcessor`, YIN algorithm |
| Vendored lib | `js/svguitar.umd.js` (337 KB) | Also loaded from CDN as primary |
| PWA | `service-worker.js`, `manifest.json`, `icons/icon.svg` | Cache-first |

### 1.2 State / routing / DOM model

- **No router.** It is a single screen; "navigation" is DOM show/hide via `style.display`.
- **State** lives in module-scoped `let`/`const` globals inside the one big `<script>`: `SONGS`, `IMPORTED_SONGS`, `lastBarData`, `prevBarData`, `fbMode`, `audioMode`, `showScales`, and ~15 `resonance*` variables (`index.html:2523-2546`, `4941`). There is no store/observer; mutations are imperative and the relevant render function is called by hand.
- **DOM updates** are a mix of `document.createElement` building (`renderLeadSheet`, `index.html:3701`) and template-string `innerHTML` assignment (27 sites). Element handles are re-queried on nearly every operation — `getElementById`/`querySelector` appears **333 times** in `index.html`.

### 1.3 External libraries

- **AlphaTab** — `<script src="https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/...">` (`index.html:1371`). Note `@latest`. Driven by `alphaTabNotationModule`/`alphaTabHeadsModule` (`index.html:5438`, `6221`); transposition via `getSemitones()` → `settings.display.transpositionPitches`.
- **SVGuitar** — loaded **twice**: CDN primary (`index.html:12`) + local fallback (`index.html:13`). Used by the chord-voicing modal.
- **JSZip** — `index.html:1373`; used to unzip `.mxl`/`.gpx` imports in `handleImportFile` (`index.html:5018`, `5067`).

### 1.4 Resonance engine + pitch integration

- Resonance: `activateResonanceMode()` → `buildGravityMap()` → `generateSectionLicks()` → overlays applied onto the fretboard SVG via `applyResonanceOverlays` (`index.html:2780`).
- Pitch: `pitchModule` IIFE (`index.html:6689`) opens a dedicated `AudioContext`, adds `js/pitch-processor.js` as a worklet, and receives a detected frequency per hop through `workletNode.port.onmessage → onFrequency` (`index.html:6822`). The worklet is intentionally **not** connected to `destination` (silent local monitoring — good privacy posture).

### 1.5 IndexedDB + Service Worker

- **Two** IndexedDB layers exist: `openDB/dbAdd/dbGetAll` (`index.html:5175+`) and a second copy inside `practiceModule` (`dbOpen/dbAdd/dbGetAll`, `index.html:6895+`). Store: practice `sessions`.
- SW (`service-worker.js`) is cache-first for same-origin **and** for `cdn.jsdelivr.net`/`unpkg.com`, with versioned cache `cp-songbook-v2`.

### 1.6 Song data structure

`SONGS` is a `const` object literal (`index.html:1386`) of 22 core tunes; 44 more are merged in at runtime, and imports are injected with `SONGS[name] = tuneObj` (`addImportedSong`, `index.html:4984`). Each tune: `{ key, form, bars, difficulty, style, structure, description, progression }`, where `progression` is an array of rows, each row an array of `{chord, roman, scale}` objects. Transposition is computed on the fly by `transposeChord` (`index.html:2127`).

---

## Phase 2 — Critical structural issues, security risks, legacy anti-patterns

### SECURITY

#### S1 — Stored DOM-XSS via imported-file metadata (HIGH)
- **Category:** Security
- **Location:** `renderImportedList` (`index.html:4955-4963`), `renderLeadSheet` header (`index.html:3714`), `refreshDashboard` sessions table (`index.html:5313-5324`). Source of taint: `parseMusicXML` title extraction (`index.html:4737-4746`) → `addImportedSong` (`index.html:4978`).
- **Description:** An imported MusicXML/MXL file's `<work-title>` (or `<movement-title>`/`credit-words`) is read verbatim into the tune **name**, then rendered into the DOM through `innerHTML` **without escaping**. In `renderImportedList` only the `data-name` attribute is quote-escaped (`safeN`); the visible label `📁 ${n}` (line 4959) is raw. The same unescaped name flows into the lead-sheet header (`hdr.innerHTML = ${canonicalName} ...`, line 3714) and, once a session is logged, into the practice table cells `<td ... title="${s.tune}">${s.tune}</td>` (line 5318). Because imports are persisted to `localStorage` (`saveImported`, `index.html:4944`) and replayed on every load, this is **persistent/stored** XSS, not merely reflected.
- **Potential impact:** A crafted `.xml`/`.mxl` with `<work-title><img src=x onerror="..."></work-title>` executes arbitrary script in the app origin on import and again on every subsequent page load — enabling theft of `localStorage` (prefs, imported library), IndexedDB practice history, microphone-permission abuse, or full UI hijack. The shareability of "song files" makes the delivery vector realistic.

#### S2 — No Subresource Integrity (SRI) on CDN scripts (HIGH)
- **Category:** Security
- **Location:** `index.html:12, 1371, 1373` (`grep "integrity="` → **0 matches**).
- **Description:** SVGuitar, JSZip, and AlphaTab load from `unpkg.com`/`cdn.jsdelivr.net` with no `integrity=`/`crossorigin` hashes. AlphaTab is pinned to `@latest`, so even the intended file changes over time and could never be SRI-pinned as written.
- **Potential impact:** A CDN compromise or `@latest` supply-chain push executes attacker JS with full DOM/`localStorage`/IndexedDB/mic access. The service worker then **caches the poisoned file** (`CDN_HOSTS` cache-first, `service-worker.js:89`), persisting the compromise offline until the cache version is bumped.

#### S3 — No Content-Security-Policy (MEDIUM)
- **Category:** Security
- **Location:** `<head>` of `index.html` (`grep -i content-security-policy` → 0 matches).
- **Description:** There is no CSP `<meta>` (and, being static hosting, no header either). Combined with heavy `innerHTML` use and inline scripts, there is no second line of defense once S1/S2 fire.
- **Potential impact:** Nothing constrains injected `<img onerror>`, inline event handlers, or exfiltration `fetch()` to an attacker host. A reasonable CSP (`script-src 'self' cdn.jsdelivr.net unpkg.com; object-src 'none'; base-uri 'none'`) would blunt S1's payload even if the escaping bug remained.

#### S4 — `window.open` + `document.write` print path interpolates data (LOW–MEDIUM)
- **Category:** Security
- **Location:** `printLeadSheet` (`index.html:4100-4120`).
- **Description:** `w.document.write('...<title>${name}</title>...<h1>🎷 ${name}</h1>...${tune.description}...')` writes interpolated tune name/description into a fresh document with no escaping. For built-in songs this is static/safe, but an **imported** tune routes attacker-controlled `name`/`description` straight into `document.write`.
- **Potential impact:** Script execution in the popup window (same origin), reachable via the same crafted-import vector as S1.

#### S5 — `addModule` worklet URL & `postMessage` channel (LOW, informational)
- **Category:** Security
- **Location:** `startListening` (`index.html:6818-6822`).
- **Description:** Worklet URL is derived from `document.baseURI` (fine) and the worklet→main `port.onmessage` payload is consumed directly as a number in `onFrequency`. There is no origin check on the message, but the port is a private `MessageChannel` (not `window.postMessage`), so this is low risk — flagged only because `onFrequency` does no `typeof`/range validation on `e.data` (a malformed worklet build could feed `NaN`/objects into the meter math).

### STRUCTURAL

#### ST1 — Monolithic single-file "god module" (HIGH, maintainability)
- **Category:** Structural
- **Location:** entire `index.html` (7,135 lines; ~150 functions in one `<script>` scope).
- **Description:** UI rendering, the Web Audio synthesis engine, the resonance engine glue, file import/parse (MusicXML/MIDI/GP), IndexedDB, PWA wiring, and pitch detection all share one lexical scope and one set of globals. There are **two** independent IndexedDB implementations (`index.html:5175` and `6895`) and **two** `init()` functions (`index.html:5387`, `6845`, `7053`) — name collisions are avoided only by IIFE walls. The resonance engine is duplicated between `js/resonanceEngine.js` and `src/features/resonance-engine/core/*`.
- **Potential impact:** Every change risks an unrelated regression; there is no module boundary to test in isolation; tree-shaking/lazy-loading is impossible; onboarding cost is severe.

#### ST2 — Tight UI↔audio↔fretboard coupling with no error boundaries (MEDIUM)
- **Category:** Structural
- **Location:** `renderLeadSheet`'s `selectBar` closure (`index.html:3748-3762`), `showFretboard` (`index.html:3508`).
- **Description:** A single bar click synchronously fires audio (`playChordVoicing`/`playScaleRun`), full fretboard re-render (`showFretboard`), and analysis panel updates with no `try/catch`. A throw in any one (e.g., an unmapped chord quality) aborts the rest, leaving the UI half-updated. `selectBar` also re-queries `#sheet .bar` on every click instead of capturing index at build time (see PERF below).
- **Potential impact:** One bad chord symbol from an import breaks playback + highlighting for the whole tune; no graceful degradation.

#### ST3 — `_fretGrid` O(1) cache exists but is bypassed everywhere (MEDIUM, perf+structural)
- **Category:** Structural / Anti-pattern
- **Location:** cache built at `index.html:3458`; only `findFretEl` (`index.html:2577`) uses it. Seven other call sites instead do `document.querySelectorAll('.fret').forEach(...)`: lines `2763, 2860, 3475, 3541, 3586, 3609, 6728`.
- **Description:** `CLAUDE.md` explicitly documents `_fretGrid` as the O(1) lookup structure, yet every hot path (clear, render, ghost, library, resonance overlays, **and the 86 Hz pitch highlighter**) ignores it and re-scans the entire DOM.
- **Potential impact:** Repeated forced reflows and full-DOM traversals on the most frequent operations (detailed in Phases 4–7).

#### ST4 — Race condition / leak risk in audio + resonance timers (MEDIUM)
- **Category:** Structural
- **Location:** `resonanceTimers` array (`index.html:2541`), `playResonanceLick` (`2631`), playback `setTimeout` loop (`tick`, `4017`); 16 `setTimeout/setInterval` sites total.
- **Description:** Playback and resonance schedule chains of `setTimeout`s and push them into arrays for later cancellation. If a new tune is generated mid-playback, `renderLeadSheet` calls `stopPlayback()` but resonance lick timers are cleared on a different path; overlapping schedules can double-trigger audio nodes. `AudioContext`s for the bebop/backing engine are created lazily and not always closed.
- **Potential impact:** Overlapping/zombie timers → doubled notes, stuck highlights, slow memory growth across long sessions.

### LEGACY ANTI-PATTERNS

#### A1 — Full-DOM `querySelectorAll` in lieu of cached refs (HIGH impact)
See ST3. Also `renderStats` and `getFilteredTunes` re-`Object.entries(SONGS)`/`Object.values(SONGS)` on every keystroke (Phases 4–7).

#### A2 — Pervasive `innerHTML` string templating (MEDIUM)
27 `innerHTML` sinks. Even where data is currently "trusted," the pattern is the S1 attack surface and forces full subtree re-parse instead of targeted text updates.

#### A3 — Re-querying `document.getElementById` inside hot loops/callbacks (MEDIUM)
`onFrequency` does **5** `getElementById` calls **per detected pitch** (`index.html:6743-6747`), ~86×/sec. `setAudioStatus`, `updateGpBadge`, etc. re-resolve elements that never change.

#### A4 — Duplicated code & dead "no-op" functions (LOW)
`buildFretMarkers()` is an explicit no-op (`index.html:3467`); resonance engine duplicated in two trees; two IndexedDB stacks; two `init()`s. `var` is used in 6 spots where `const`/`let` belong.

#### A5 — `@latest` dependency pin (MEDIUM — overlaps S2)
`@coderline/alphatab@latest` (`index.html:1371`) is non-reproducible and un-pinnable for SRI.

---

## Phase 3 — Three high-priority architectural recommendations

### R1 — Centralized HTML-escaping + treat all imported data as untrusted
- **Problem addressed:** S1, S4, A2.
- **Solution:** Introduce one `escapeHtml(str)` helper (`& < > " '` → entities). Route **every** interpolation of dynamic data (tune names, descriptions, session fields, import metadata) through it, or — better — replace `innerHTML` template assignments in `renderImportedList`, `refreshDashboard`, `renderLeadSheet` header, and `printLeadSheet` with `textContent`/`createElement`. Sanitize `_parsedTitle` at the source in `parseMusicXML`/`parseGPHeader` so the stored model is clean. Add a CSP `<meta>` (R3) as defense-in-depth.
- **LOE:** ~1 day (1 helper + ~10 call-site conversions + a malicious-import test fixture).
- **Value:** Eliminates the only arbitrary-code-execution path reachable without a network compromise; protects persisted (`localStorage`/IndexedDB) data.

### R2 — Pin dependencies + add SRI + bound the service-worker CDN cache
- **Problem addressed:** S2, S3 (partial), A5.
- **Solution:** Replace `@latest` with an exact version (`@coderline/alphatab@1.x.y`); add `integrity="sha384-…"` + `crossorigin="anonymous"` to all three CDN `<script>` tags. In `service-worker.js`, only cache CDN responses whose URL matches the pinned-version allowlist, and add a CSP meta restricting `script-src` to `'self'` + the two pinned CDNs. Optionally self-host the three libs (the repo already vendors `js/svguitar.umd.js`) to drop the CDN dependency entirely.
- **LOE:** ~0.5–1 day.
- **Value:** Closes the supply-chain / CDN-poisoning vector and stops the SW from persisting a poisoned asset offline.

### R3 — Extract a Fretboard view module backed by the `_fretGrid` cache (+ a pc index)
- **Problem addressed:** ST3, A1, A3, and all three Phase-4 hotspots.
- **Solution:** Build a small `Fretboard` module that owns `_fretGrid` plus a precomputed `pcIndex: Map<pc, HTMLElement[]>` and cached static element refs. Replace the seven `querySelectorAll('.fret')` scans with iteration over the cache; have the pitch highlighter toggle only the cells whose pitch-class changed. Cache the five pitch-display element refs once. This naturally creates the module seam that begins paying down ST1.
- **LOE:** ~1.5–2 days.
- **Value:** Removes ~86×/sec full-DOM scans, ~3 full-DOM scans per bar click, and the per-keystroke re-scan storm; first concrete step toward de-monolithing.

---

## Phase 4 — Three slowest / most bloated data-handling routes (static analysis)

### P1 — Pitch-detection hot path: `onFrequency` + `highlightPc`
- **Location:** `index.html:6742-6791` (`onFrequency`), `6727-6735` (`highlightPc`).
- **What it does:** Runs once per detected frequency (~86 Hz) to update note/cents/meter UI and light the matching fret cells.
- **Evidence of bloat:** Each call performs **5** `document.getElementById` (6743-6747) **plus** `highlightPc`, which runs `document.querySelectorAll('.fret')` and iterates **every** fret `<g>` (~90 elements), calling `classList.add/remove` on each — even though `_fretGrid` already maps cells by position and could map by pitch-class. At ~86 calls/sec that is ~430 `getElementById` + ~7,700 class writes + 86 full-DOM `.fret` queries **per second**, every second the mic is on.

### P2 — Search/filter render path: `initSearch` input → `populateTuneDropdown` + `renderStats`
- **Location:** `index.html:4531-4553` (input handler), `4072-4081` (`populateTuneDropdown`), `4082-4093` (`renderStats`).
- **What it does:** On every keystroke in the tune search box, filters all songs, rebuilds the `<select>`, and recomputes the stats bar.
- **Evidence of bloat:** `renderStats` makes **~8 separate full passes** over `Object.values(SONGS)` (`.filter` ×6 for difficulty/form, plus `.length` and a `SCALE_LIBRARY.reduce`), then blows away the stats bar with `innerHTML`. `populateTuneDropdown` re-runs `Object.entries(SONGS).sort(localeCompare)` (O(S log S)) and rebuilds all ~66 `<option>` nodes from scratch — on **every** keystroke. No debounce.

### P3 — Per-bar-click fretboard repaint: `showFretboard` (+ its `clearFretboard`)
- **Location:** `index.html:3508-3599` (`showFretboard`), `3471-3490` (`clearFretboard`).
- **What it does:** On each bar selection, clears all fret cells then repaints chord/scale/guide-tone coloring.
- **Evidence of bloat:** `showFretboard` itself runs `document.querySelectorAll('.fret')` twice (main pass 3541, ghost pass 3586) and first calls `clearFretboard`, which runs **another** full `querySelectorAll('.fret')` scan (3475). So a single click triggers **2–3 full-DOM traversals** of all ~90 cells with per-cell attribute writes — again ignoring `_fretGrid`.

---

## Phase 5 — Why they are slow (mathematical / operational)

**Variables:** `S` = number of songs (66, growing with imports); `F` = fret cells (≈ 6 strings × 15 frets = 90); `H` = pitch-detection rate (worklet hop 512 samples / 44.1 kHz ≈ **86 Hz**); `K` = keystrokes in a search query.

### P1 — `onFrequency`/`highlightPc`
- **Time complexity:** O(F) per call → **O(H·F)** sustained ≈ 86 × 90 ≈ **7,740 class-toggle ops/sec**, plus O(H·5) `getElementById` ≈ 430 lookups/sec, plus 86 full-DOM `.fret` queries/sec.
- **Space complexity:** O(1) logically, but `getScalePcs` allocates a fresh `Set` every call (86 short-lived Sets/sec → GC churn).
- **Operational reasons:** (a) `querySelectorAll('.fret')` re-walks the document each call instead of reading the existing `_fretGrid`; (b) it touches **all** F cells to change at most a handful, instead of a pc→cells index; (c) the 5 `getElementById` targets are static and should be hoisted; (d) `classList.add/remove` interleaved with reads risks layout thrash.
- **Typical scale:** A 3-minute practice take with the mic on = ~180 s × 86 Hz ≈ **15,500 calls** → ~1.4 million class operations and ~15,500 full-DOM scans for what is visually a single moving dot. On low-end mobile this is the difference between a smooth meter and a stuttering one.

### P2 — search render path
- **Time complexity:** Per keystroke: `renderStats` = O(8S) scans + `populateTuneDropdown` = O(S log S) sort + O(S) DOM build ⇒ **O(S log S)** dominated, repeated **K** times ⇒ **O(K·S log S)**.
- **Space complexity:** O(S) new `<option>` nodes discarded and re-created every keystroke; the entire stats bar subtree is re-parsed from an `innerHTML` string each time.
- **Operational reasons:** No debounce → work fires on every character; eight independent `.filter` passes where **one** `reduce` would do; full `<select>` teardown/rebuild instead of toggling `option.hidden`; `innerHTML` re-parse instead of updating ~6 numeric `textContent`s.
- **Typical scale:** Typing "ornithology" (11 chars) ⇒ 11 × (≈8×66 filter touches + 66·log66 sort + 66 option builds) ≈ **6,000+ song-field reads and 700+ DOM node creations** for one search. Grows with every imported tune.

### P3 — `showFretboard`/`clearFretboard`
- **Time complexity:** O(3F) DOM-queried iterations per click (clear + main + ghost) ≈ 270 cell visits, **O(F)** asymptotically but with a 3× constant and 2–3 separate full-document queries.
- **Space complexity:** O(1) (two small `Set`s of target pitch classes).
- **Operational reasons:** Three independent `querySelectorAll('.fret')` document walks where a single pass over cached `_fretGrid` values would suffice; per-cell `setAttribute`/`classList` writes are interleaved with `dataset` reads (`fr.dataset.idx`, `fr.dataset[nKey]`), inviting forced reflow; `clearFretboard` resets **all** cells even when the next paint will immediately re-touch most of them.
- **Typical scale:** Stepping through a 32-bar tune during analysis = 32 clicks × ~270 cell visits ≈ **8,600 DOM-queried cell operations**; with playback auto-advancing bars, this fires on every bar boundary in time with the metronome.

---

## Phase 6 — Refactored code

> All three refactors are drop-in: they reuse existing globals (`_fretGrid`, `SONGS`, `SCALE_LIBRARY`, `NOTE_IDX`, `lastBarData`) and existing element IDs, and preserve current behavior/visuals.

### 6.1 — P1: cache element refs + build a pitch-class index; toggle only changed cells

**Original (`index.html:6727-6735` and `6742-6791`):**
```js
  function highlightPc(pc) {
    document.querySelectorAll('.fret').forEach(fr => {
      if (parseInt(fr.dataset.idx, 10) === pc) {
        fr.classList.add('pitch-live');
      } else {
        fr.classList.remove('pitch-live');
      }
    });
  }
  ...
  function onFrequency(freq) {
    const noteEl    = document.getElementById('pitchNote');
    const centsEl   = document.getElementById('pitchCents');
    const inScaleEl = document.getElementById('pitchInScale');
    const meterEl   = document.getElementById('pitchMeterBar');
    const scoreEl   = document.getElementById('pitchScore');
    ...
```

**Refactored:**
```js
  // ── Static element refs: resolved once, not 5× per detected pitch (~86 Hz). ──
  // Lazily initialised on first use so the IDs exist in the DOM by then.
  let _els = null;
  function els() {
    if (_els) return _els;
    _els = {
      note:    document.getElementById('pitchNote'),
      cents:   document.getElementById('pitchCents'),
      inScale: document.getElementById('pitchInScale'),
      meter:   document.getElementById('pitchMeterBar'),
      score:   document.getElementById('pitchScore'),
    };
    return _els;
  }

  // Track only the currently-lit cells so each frame toggles a handful of
  // elements instead of re-scanning + re-touching all ~90 fret cells.
  let _litCells = [];

  function highlightPc(pc) {
    // Clear previously-lit cells only (O(k), k = a few cells).
    for (const fr of _litCells) fr.classList.remove('pitch-live');
    _litCells = [];
    // Read the cells for this pitch-class straight from the cached grid the
    // fretboard already maintains — no document query, no full-board walk.
    const cells = (typeof _pcIndex !== 'undefined' && _pcIndex.get(pc)) || null;
    if (cells) {
      for (const fr of cells) { fr.classList.add('pitch-live'); _litCells.push(fr); }
    }
  }

  function clearHighlight() {
    for (const fr of _litCells) fr.classList.remove('pitch-live');
    _litCells = [];
  }

  function onFrequency(freq) {
    const { note: noteEl, cents: centsEl, inScale: inScaleEl,
            meter: meterEl, score: scoreEl } = els();   // 1 hoisted lookup set
    ...
```

**Supporting one-time index (add inside `buildFretboard`, right after the existing `_fretGrid.set(...)` at `index.html:3458`):**
```js
      // O(1) pitch-class index: pc → [<g.fret> cells] so the pitch detector and
      // showFretboard can light/repaint by pitch-class without scanning the DOM.
      const _pc = parseInt(g.dataset.idx, 10);
      if (!isNaN(_pc)) {
        if (!_pcIndex.has(_pc)) _pcIndex.set(_pc, []);
        _pcIndex.get(_pc).push(g);
      }
```
```js
// near the _fretGrid declaration (index.html:3295):
const _pcIndex = new Map(); // pitch-class (0-11) → array of <g.fret> elements
```
*(and add `_pcIndex.clear();` next to `_fretGrid.clear();` at line 3300.)*

**Why it's faster:** removes 86 full-DOM `querySelectorAll` calls/sec and ~7,700 class writes/sec (now ~a dozen writes/sec — only cells that change), and collapses 5 `getElementById`/call to one hoisted object.

---

### 6.2 — P2: single-pass stats + debounced, in-place dropdown update

**Original (`renderStats`, `index.html:4082-4093`):**
```js
function renderStats(entries = null) {
  const data = entries ? entries.map(([,t])=>t) : Object.values(SONGS);
  const beg = data.filter(t=>t.difficulty==='Beginner').length;
  const int = data.filter(t=>t.difficulty==='Intermediate').length;
  const adv = data.filter(t=>t.difficulty==='Advanced').length;
  document.getElementById('statsBar').innerHTML = `
    <div class="stat-pill">🎷 <strong>${data.length}</strong> Tunes</div>
    <div class="stat-pill"><strong>${data.filter(t=>t.form==='Blues').length}</strong> Blues · <strong>${data.filter(t=>t.form==='AABA').length}</strong> AABA</div>
    <div class="stat-pill"><span class="diff-b">B</span> <strong>${beg}</strong></div>
    <div class="stat-pill"><span class="diff-i">I</span> <strong>${int}</strong></div>
    <div class="stat-pill"><span class="diff-a">A</span> <strong>${adv}</strong></div>
    <div class="stat-pill">📖 <strong>${Object.values(SCALE_LIBRARY).reduce((a,c)=>a+c.length,0)}</strong> Scales</div>`;
}
```

**Refactored:**
```js
// SCALE_LIBRARY never changes after load → compute the scale total once.
const _SCALE_TOTAL = Object.values(SCALE_LIBRARY).reduce((a, c) => a + c.length, 0);

function renderStats(entries = null) {
  const data = entries ? entries : Object.entries(SONGS);
  // Single O(S) pass replaces six independent .filter() passes.
  let beg = 0, int = 0, adv = 0, blues = 0, aaba = 0;
  for (const [, t] of data) {
    if (t.difficulty === 'Beginner')        beg++;
    else if (t.difficulty === 'Intermediate') int++;
    else if (t.difficulty === 'Advanced')     adv++;
    if (t.form === 'Blues')      blues++;
    else if (t.form === 'AABA')  aaba++;
  }
  // innerHTML still used here (static template, no user data) but built from
  // pre-counted numbers, so no repeated array scans.
  document.getElementById('statsBar').innerHTML = `
    <div class="stat-pill">🎷 <strong>${data.length}</strong> Tunes</div>
    <div class="stat-pill"><strong>${blues}</strong> Blues · <strong>${aaba}</strong> AABA</div>
    <div class="stat-pill"><span class="diff-b">B</span> <strong>${beg}</strong></div>
    <div class="stat-pill"><span class="diff-i">I</span> <strong>${int}</strong></div>
    <div class="stat-pill"><span class="diff-a">A</span> <strong>${adv}</strong></div>
    <div class="stat-pill">📖 <strong>${_SCALE_TOTAL}</strong> Scales</div>`;
}
```

**And debounce the keystroke handler (`index.html:4531`):**
```js
  // Debounce: collapse a burst of keystrokes into one render (~120 ms idle).
  let _searchTimer = null;
  searchEl.addEventListener('input', function () {
    const value = this.value;
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(() => runSearch(value), 120);
  });
  function runSearch(raw) {
    const q = raw.toLowerCase().trim();
    ...                                  // body unchanged from original handler
  }
```

**Why it's faster:** stats drop from ~8 array passes to **1**; the scale total is no longer recomputed; debouncing turns *K* renders per query into ~1.

---

### 6.3 — P3: repaint the fretboard from the cached grid (no DOM queries, no separate clear scan)

**Original (`showFretboard` top + main pass, `index.html:3508-3577`, abridged to the changed lines):**
```js
function showFretboard(root, scaleName, chordSym) {
  clearFretboard();
  ...
  document.querySelectorAll('.fret').forEach(fr => {
    const idx = parseInt(fr.dataset.idx, 10);
    if (isNaN(idx) || !tgt.has(idx)) return;
    ...
  });
  ...
  if (fbMode === 'guide-tones' && prevBarData && prevBarData.root) {
    ...
    document.querySelectorAll('.fret').forEach(fr => {
      const idx = parseInt(fr.dataset.idx, 10);
      if (isNaN(idx) || fr.classList.contains('hl') || !prevGT.has(idx)) return;
      ...
    });
  }
```

**Refactored (iterate the cache once; reuse the `_pcIndex` from 6.1 for targeted clear):**
```js
function showFretboard(root, scaleName, chordSym) {
  clearFretboard();
  ...
  // Iterate the cells we already hold in _fretGrid — no document walk.
  // (_fretGrid.values() yields every <g.fret>; same set querySelectorAll
  //  returned, minus the DOM traversal cost.)
  for (const fr of _fretGrid.values()) {
    const idx = parseInt(fr.dataset.idx, 10);
    if (isNaN(idx) || !tgt.has(idx)) continue;
    ...                                   // identical body
  }
  ...
  if (fbMode === 'guide-tones' && prevBarData && prevBarData.root) {
    ...
    for (const fr of _fretGrid.values()) {
      const idx = parseInt(fr.dataset.idx, 10);
      if (isNaN(idx) || fr.classList.contains('hl') || !prevGT.has(idx)) continue;
      ...                                 // identical body
    }
  }
```

**And `clearFretboard` (`index.html:3475`) likewise iterates the cache:**
```js
function clearFretboard() {
  clearLickStepHighlights();
  resonanceLickFretEls = [];
  for (const fr of _fretGrid.values()) {   // was document.querySelectorAll('.fret')
    fr.setAttribute('class', 'fret');
    ...                                     // identical body
  }
  ...
}
```

**Why it's faster:** the three full-document `.fret` queries per click become three cheap iterations over an already-materialized `Map` (no selector matching, no live-NodeList allocation). Behavior and visuals are byte-for-byte identical because `_fretGrid.values()` is exactly the set of cells `.fret` selected.

---

## Phase 7 — Before-vs-after validation

### P1 — pitch hot path
| | Before | After |
|---|---|---|
| Time complexity | O(H·F) class ops + O(H·5) `getElementById` + 86 full-DOM queries/sec | O(H·k) where k = cells changed (~2–6) + 1 hoisted ref-set |
| Operational cost | ~7,740 class writes/sec, ~430 element lookups/sec, 86 DOM scans/sec | ~hundreds of class writes/sec, ~0 repeated lookups, **0** DOM scans/sec |
| Est. work for a 3-min take | ~15,500 full-DOM scans, ~1.4 M class ops | ~15,500 Map reads, ~tens of thousands of class ops |
| Speedup | — | **~30–90×** fewer DOM operations on the hot path |
- **Memory trade-off:** `_pcIndex` adds 12 arrays referencing the existing ~90 cells (no new DOM nodes) ≈ a few KB — negligible. `_litCells` holds ≤ a handful of refs.
- **Verification:** Open DevTools Performance, enable the mic, hold a sustained note 10 s. *Before:* a recurring ~86 Hz band of "Recalculate Style/Layout" tied to `highlightPc`. *After:* that band collapses to sparse spikes only when the detected note changes. Confirm the fret dot still tracks the played note.

### P2 — search render path
| | Before | After |
|---|---|---|
| Time complexity | O(K·S log S), `renderStats` = O(8S)/keystroke | O(S log S) once per ~120 ms idle, `renderStats` = O(S)/call |
| Operational cost (per keystroke) | ~8×66 song reads + 66·log66 sort + 66 `<option>` builds + full stats `innerHTML` re-parse | coalesced; one render per burst; 1 song-array pass for stats |
| Est. for typing "ornithology" | ~6,000+ field reads, ~700+ node creations | ~600 field reads, ~66 node builds (one render) |
| Speedup | — | **~8–11×** for a typical query, and stops growing per-character |
- **Memory trade-off:** one cached integer (`_SCALE_TOTAL`) + one timer handle — effectively zero.
- **Verification:** Type a 10-char query with Performance recording. *Before:* 10 layout/scripting bursts. *After:* ~1 burst after you stop typing. Stats counts must remain identical to the old output.

### P3 — per-bar fretboard repaint
| | Before | After |
|---|---|---|
| Time complexity | O(3F) with 3 separate full-DOM `.fret` queries/click | O(3F) iterations with **0** DOM queries/click |
| Operational cost (32-bar walk) | ~8,600 DOM-queried cell ops + 96 `querySelectorAll` calls | ~8,600 Map-iterated cell ops + **0** `querySelectorAll` calls |
| Est. per click | 3 selector matches over the document + 270 cell visits | 3 `Map.values()` iterations + 270 cell visits |
| Speedup | — | **~3× fewer** full-tree traversals/click; removes selector-matching overhead, smoother when playback auto-advances bars |
- **Memory trade-off:** none — `_fretGrid` already exists; we stop allocating throwaway NodeLists.
- **Verification:** Enable playback at 200 BPM on a 32-bar tune with Performance recording. *Before:* a layout spike per bar boundary containing `querySelectorAll`. *After:* the spike shrinks and `querySelectorAll` disappears from the `showFretboard`/`clearFretboard` stack. Visual coloring must be unchanged across all four `fbMode`s.

---

## Summary scorecard

| Area | Severity | Headline item |
|------|----------|---------------|
| Security | **HIGH** | S1 stored XSS via imported MusicXML title → unescaped `innerHTML` |
| Security | **HIGH** | S2 no SRI + `@latest` AlphaTab; poisoned file persisted by SW |
| Security | MEDIUM | S3 no CSP; S4 `document.write` print path |
| Structural | HIGH | ST1 7,135-line monolith; duplicated engines/DB/`init` |
| Structural | MEDIUM | ST3 `_fretGrid` cache bypassed by 7 full-DOM scans |
| Performance | HIGH | P1 86 Hz pitch path re-scans whole DOM |
| Performance | MEDIUM | P2 per-keystroke 8× song re-scan + full dropdown rebuild |
| Performance | MEDIUM | P3 2–3 full-DOM `.fret` scans per bar click |

**Top three to fix first:** R1 (escape imported data — closes S1/S4), R2 (pin + SRI + CSP — closes S2/S3), R3 (Fretboard module on `_fretGrid`/`_pcIndex` — closes P1/P3/ST3).
