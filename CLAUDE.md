# CLAUDE.md — Parker Songbook Tool: Complete Development Log

## Project Overview

**Application:** Charlie Parker Songbook Trainer  
**Version:** 7.0 → 7.3 (UX Refactor Edition)  
**Tech Stack:** Vanilla JavaScript SPA, pure CSS, no build system  
**Entry Point:** `index.html` (single file, ~8,000 lines)  
**Active Branch:** `claude/ux-ui-audit-analysis-57f4db` (merged to `main` as PR #148)

---

## Codebase Architecture

- Single HTML file SPA with inline CSS, HTML, and JavaScript
- 9 external JavaScript modules in `/js/` (including `pitch-processor.js`)
- Resonance Engine in `/src/features/resonance-engine/`
- Pure CSS design system with CSS custom properties
- No framework (no React/Vue/Svelte), no build tool, no runtime dependencies
- `package.json` exists only for the dev `test` script (`npm test` → `node tests/run-all.js`); there are no installable deps
- CI: `.github/workflows/ci.yml` runs `npm test` on every push and PR to `main`
- CDN dependencies (all version-pinned with SRI `integrity` + `crossorigin="anonymous"`): AlphaTab `@coderline/alphatab@1.8.3`, SVGuitar 1.7.1, JSZip 3.10.1
- Web Audio API for synthesis + AudioWorklet for real-time pitch detection
- IndexedDB for practice session storage
- Service Worker for offline/PWA support
- **66 total songs** (22 core SONGS object + 44 OMNIBOOK_ADDITIONS)

---

## Song Library (66 Total)

### Core SONGS (22)
Anthropology, Au Privave, Barbados, Billie's Bounce, Bloomdido, Blues for Alice, Cheryl, Chi Chi, Confirmation, Dewey Square, Donna Lee, Ko-Ko, Moose the Mooche, Now's the Time, Ornithology, Relaxin' at Camarillo, Scrapple from the Apple, Yardbird Suite, Parker's Mood, Embraceable You, Oh, Lady Be Good, Crazeology

### Omnibook Additions (44)
An Oscar for Treadwell, Another Hairdo, Back Home Blues, Bird Gets the Worm, Blue Bird, Buzzy, Card Board, Celerity, Chasing the Bird, Cosmic Rays, Diverse, KC Blues, Kim, Laird Baird, Marmaduke, Mohawk, My Little Suede Shoes, Passport, Perhaps, Red Cross, Relaxing With Lee, Segment, Shawnuff, Si Si, Steeplechase, The Bird, Thriving From a Riff, Visa, Warming Up a Riff, Ah-Leu-Cha, Cool Blues, Constellation, Celebrity, Drifting on a Reed, Leap Frog, Little Willie Leaps, The Hymn, Stupendous, Bongo Bop, Lover Man, Quasimodo, Salt Peanuts, Tiny's Tempo, Meandering

### Source / Deduplication
- 46 unique tunes sourced from `docs/omnibook_xml (1).zip` (AutoImprov MusicXML collection) — all are present  
- Duplicates consolidated: Au Private 1+2 → Au Privave; Kim 1+2 → Kim; Mohawk 1+2 → Mohawk; Now's The Time 1+2 → Now's the Time; Ko Ko → Ko-Ko  
- 15 additional Parker heads added manually (session 2026-05-19): Ah-Leu-Cha, Cool Blues, Constellation, Celebrity, Drifting on a Reed, Leap Frog, Little Willie Leaps, The Hymn, Stupendous, Bongo Bop, Lover Man, Quasimodo, Salt Peanuts, Tiny's Tempo, Meandering

---

## Bugs Found & Fixed

### 1. Missing CSS Variables (`--border`, `--card`)
**Location:** `index.html` (inline styles on `#sectionSelect` and `#sectionTabDisplay`)  
**Fix:** Added `--border: var(--barline)` and `--card: var(--panel)` as aliases in `:root`, plus new design tokens `--radius`, `--transition`, `--shadow-md`, `--focus-ring`.

### 2. JSZip CDN Failure — No Error Handling
**Fix:** Added `onerror` handler to JSZip `<script>` tag. `exportSectionZip` wrapped to show a toast instead of bare `alert()` when JSZip is unavailable.

### 3. Missing ARIA Live Regions
**Fix:** Added `aria-live="polite"` and `role="status"` to `#playStatus`, `#audioStatus`, `#resonanceStatus`, `#analysisChord`, `#statsBar`.

### 4. Misleading H2 Text
**Fix:** Updated from "18 Bebop Classics — PRO Edition" to "Complete Bebop Songbook".

### 5. Missing Semantic HTML Landmarks
**Fix:** Changed `<div class="card">` to `<main class="card" role="main">`. Added `<a class="skip-link" href="#sheet">`.

### 6. AlphaTab Transposition — `window.*` False Guards
**Location:** `alphaTabNotationModule` — `getSemitones()` and `getTuneOriginalKey()`  
**Issue:** Guards used `window.NOTE_IDX` and `window.SONGS` which are `const` top-level declarations and therefore NOT properties of `window`. Guards always evaluated false; transposition always returned 0; original key always returned null.  
**Fix:** Removed `window.*` guards; access `NOTE_IDX`/`SONGS` directly from enclosing scope.

### 7. GP Badge Not Appearing on Load
**Issue:** `updateGpBadge()` was never called at startup or on preference restore, so the AlphaTab notation badge only appeared after user interaction.  
**Fix:** Added `updateGpBadge()` call after `renderLeadSheet()` in both the startup sequence and `_loadAndApplyPrefs()`.

### 8. Guitar Pro Uploads Never Played the Melody
**Issue (3 compounding bugs):**
1. The `#importFileInput` `accept=".xml,.mxl,.mid,.midi,.gp,.gp3,.gp4,.gp5,.gp7,.gpx"` filter caused iOS Safari to grey out GP files (it doesn't recognise those extensions/MIME types), so only `.xml`/`.midi` could be selected — matching the report that "it only accepts XML and MIDI."
2. `handleImportFile` routed modern zip-based `.gp` (GP6/7/8 containers) into the **legacy binary** `parseGPHeader` path and only ever produced a junk placeholder progression (`CΔ7 Am7 Dm7 G7`) — the melody was never loaded.
3. The `attachImportHook` that was meant to load GP into the alphaTab Heads player was effectively dead: the importer's own `change` listener calls `fileInput.value = ''` first, clearing the `FileList` before the hook reads it.

**Fix:**
- Removed the `accept` attribute (extension is still validated in `handleImportFile`).
- Rewrote the GP branch in `handleImportFile` to cover `gp/gp3/gp4/gp5/gp6/gp7/gpx`, detect the container type via the `PK` (zip) magic bytes, extract a title (gpif `<Title>` for zip, `parseGPHeader` for binary), and load the **actual transcription** into the player via the new `window.hdLoadArrayBuffer(buf, name)` — so the melody plays accurately. No more junk placeholder progression.
- Added `window.hdLoadArrayBuffer` to `alphaTabHeadsModule` (refactored out of `attachImportHook`); `api.load()` auto-detects the format. Works for drag-drop **and** click-to-browse.
- Scoped `attachImportHook` to `xml`/`mxl` only so GP can't be double-loaded.

### 9. Confirmation Head Crashed alphaTab (`t.staves`)
**Issue:** The bundled `docs/Charlie Parker - Confirmation.gp` was a 2-track GP7 file that threw `undefined is not an object (evaluating 't.staves')` in the alphaTab renderer — the head showed chords but never the melody.  
**Fix:** Replaced it with the user-supplied single-track, alphaTab-authored GP8 transcription of the Confirmation head (clean melody track that loads and plays reliably). `OMNIBOOK_TUNES`'s `Confirmation` entry already points at this filename.

### 10. Duplicate `id="practicePanel"` — Invalid HTML, Silently Broken Dashboard Refresh
**Location:** `index.html` lines ~1062 and ~1360 (v7.2)  
**Issue:** Two different `<details>` elements shared the identifier `practicePanel` — the simplified session tracker at the top of the card and the drills/suggestions dashboard near the bottom. Because `getElementById` returns only the first match, the `toggle` listener that lazily rendered the dashboard was silently wired to the wrong panel, and the "refresh on session save" gate in `stopSession()` checked `.open` on the wrong element.  
**Fix (PR #148):** Renamed the second element to `id="practiceDrillsPanel"`. Updated both querySelector references (`index.html:5722` in `stopSession`, `index.html:5898` in the toggle listener) to point at the renamed element. HTML is now valid; the drills dashboard refresh gate now checks the correct panel.

---

## Features Added

### 1. AlphaTab Notation Integration
- AlphaTab CDN library `@coderline/alphatab@1.8.3` (pinned, SRI-protected) loaded with AudioWorklet SoundFont
- GP file loading from `/docs/` directory (13 GP/GPX files bundled)
- Notation tab inside the lead sheet panel; renders standard notation + tablature
- Transposition via `getSemitones()` + AlphaTab `settings.display.transpositionPitches`
- GP badge indicator on song name when a GP file is available
- AlphaTex export from Section Lick Generator

### 2. Progressive Web App (PWA)
- `service-worker.js`: cache-first strategy for all app shell assets and CDN resources
- `manifest.json`: standalone display, theme color, maskable SVG icon
- `icons/icon.svg`: treble clef on dark purple background
- Offline banner (`#offlineBanner`) shown when `navigator.onLine` is false
- Cache version: `cp-songbook-v3`; bump on any shell change
- CDN caching locked to an explicit pinned-URL allowlist (`CDN_ASSETS`), not a host wildcard

### 3. Practice Session Tracker
- IndexedDB database `cp_practice_db` v1, store `sessions` with `by_tune` + `by_date` indexes
- Auto-start session when tune is selected/changed; auto-stop on app close
- `#practicePanel` (`<details>`) collapsible panel: active session timer, stats (total sessions, total time, streak), last-10 sessions table
- CSV export via `pjExportBtn`
- Weighted random tune selection: capture-phase listener on `#randomTune` button uses `stopImmediatePropagation()` to intercept before original handler; skews toward under-practiced tunes
- `MutationObserver` on `#tuneSel` re-annotates dropdown options after every `populateTuneDropdown()` rebuild

### 4. Real-Time Pitch Detection
- `js/pitch-processor.js`: `AudioWorkletProcessor` implementing YIN pitch detection algorithm  
  - 2048-sample window, 512-sample hop size, 0.10 CMNDF threshold  
  - RMS silence gate (threshold 0.008)  
  - Parabolic interpolation for sub-sample accuracy  
- `pitchModule` IIFE in `index.html`: `getUserMedia` → `AudioContext` → `AudioWorkletNode`  
  - Audio processed entirely locally (worklet not connected to destination)  
  - Note name display with cents deviation  
  - In-scale scoring: compares detected note PC against current bar's chord scale PCs  
  - Fretboard highlight: adds `.pitch-live` class to matching fret cell(s)  
- `#togglePitch` button: toggles mic on/off; `#pitchDisplay` panel shows live data
- Privacy notice rendered in UI: "🔒 Audio processed locally — never leaves your device"

### 5. SVG Fretboard Redesign
- Replaced `<div class="string">` / `<div class="fret">` layout with a single SVG element
- Dark wood-grain linear gradient background (`fbWood` gradient: `#6b4423` → `#4a2e14`)
- Ivory nut rect, metal fret line rects, string lines with stroke-width increasing by gauge
- Position dot markers: single dot at frets 3/5/7/9, double dot at 12; fret numbers below
- String name labels (E B G D A E) at left edge
- `<g class="fret">` cells: each contains `<circle>` + `<text>` children
  - `g._circle` and `g._label` shortcuts for fast attribute access
  - `Object.defineProperty(g, 'textContent', ...)` routes through SVG `<text>` for compatibility with existing code (shows interval label — second line of two-line strings)
  - All cells registered in `_fretGrid = new Map()` keyed `"engineString_fretNum"` for O(1) lookup
- `findFretEl()` uses `_fretGrid.get()` instead of DOM traversal
- `clearFretboard()` resets SVG `fill`/`stroke` via `setAttribute`
- `showFretboard()` and `showLibraryScale()` use `fr._circle.setAttribute('fill', ...)` / `fr._label.setAttribute('fill', ...)`
- `buildFretMarkers()` is a no-op (markers drawn inline during `buildFretboard()`)
- SVG is responsive: `width="100%"`, `height="auto"`

### 6. Accessibility & UX (v7.1)
- Skip navigation link (`.skip-link`)
- Quick tune search: always-visible text input, live "N / 66" count
- `localStorage` preference persistence (`cp_songbook_v7_prefs`)
- Keyboard shortcuts: `Space` = play/stop, `Esc` = stop all, `R` = random, `G` = generate
- Toast notification system: non-blocking, auto-dismiss, 5-stack, slide-in animation
- Dark-theme scrollbar, smooth `.bar.playing` transition, `audioReadyPop` animation
- `@media (max-width: 480px)` breakpoint for very small screens

### 7. UX v7.3 Refactor — Workflow Modes, Global Transport, Standardized Toggles (PR #148)

Resolves the four highest-priority UX gaps identified in the ISO 9241-11 / ISO 25010 audit of v7.2 without touching audio pipelines or existing feature JS. Single commit, `+841 / −65` in `index.html`; all 5 test suites pass.

#### 7a. Workflow-Based Progressive Disclosure
- New `.mode-nav` tablist above the fold with four workflow modes:
  - **📖 Learn** — Chord grid, chord-scale analysis, fretboard, voice leading
  - **🎯 Practice** — AlphaTab Notation / Tab, Parker Heads player, fretboard
  - **🎸 Improvise** — Resonance Engine, Section Lick Generator, Scale Library, fretboard
  - **📊 Journal** — Practice session tracker, drills / suggestions, Practice Tips card
- Panels tagged with `data-modes="learn practice …"`; `body[data-active-mode="…"]` CSS uses `display: revert` so legacy inline `style.display` (used by tab-view switches) still overrides for in-mode transitions.
- Auto-stops any active transport on mode switch to prevent audible collisions.
- Last-active mode persisted to `localStorage` key `cp_active_mode_v73`.
- Practice Tips converted from a single run-on paragraph into a `.tips-card` with tagged rows (Theory / Focus / Tempo / Fretboard / Audio / Explore), a keyboard-shortcut row, and a difficulty-legend row.

#### 7b. Unified Sticky Global Transport (`.global-transport`)
- Single Play / Stop / Loop plus BPM and Speed at the bottom of the main card (sticky).
- `routePlay()` dispatches to the correct legacy button by active mode:
  - **Learn** → `#playBtn` (chord grid playback)
  - **Practice** → `#atMainPlayBtn` when Notation / Tab view is active, else `#headPlayBtn`
  - **Improvise** → `#resonancePlayBtn`
  - **Journal** → transport disabled (no playback target)
- `routeStop()` broadcasts to every legacy stop button so nothing lingers across modes.
- BPM ↔ Speed sync bidirectionally with legacy `#bpmInput`, `#hdSpeedSlider`, and `#atMainSpeedSlider` via `dispatchEvent(new Event('input'|'change'))` — legacy handlers stay untouched.
- Blocking `.audio-consent-overlay` gates transport until the user acknowledges audio; dismisses on first user gesture and the existing document-level `unlockAudio` handler still fires on the same event, so the `AudioContext.resume()` gesture is preserved.
- Space / Escape captured with `stopImmediatePropagation()` so the legacy Learn-only `kbShortcuts` handler at `index.html:5132` never double-fires in Practice / Improvise modes.

#### 7c. Standardized Toggle Pill Pattern (`aria-pressed`)
- New `.toggle-pill` CSS pattern with an immutable text label and a sliding switch driven entirely by `aria-pressed`.
- Applied to: `metroBtn`, `tempoTrainerBtn`, `toggleResonance`, `togglePitch`, `resonanceArrowsBtn`, `resonanceAutoPlayBtn`, and the new `gtLoopBtn`.
- A per-button `MutationObserver` reads the legacy `e.target.textContent` mutation and translates it into `aria-pressed="true|false"`, then restores the static label from `data-toggle-label` — legacy click handlers keep working unchanged.
- Explicit three-tier heading utility classes (`.h-mode` / `.h-panel` / `.h-sub`) applied to the mode heading and panel `<h3>`s so parent panels no longer render as visual siblings of their child components.
- Removed text-swap state encoding (`"Loop: OFF"` → `"Loop: ON"`); the visible label is always `"Loop"`, and state lives in colour + switch position.

#### 7d. Prerequisite Hints + ARIA Live Tiering
- Section Lick post-actions (`Save TAB` / `ZIP` / `Preview`) changed from `display: none` to `disabled` + `aria-disabled="true"` with a visible `.prerequisite-hint` reading "Generate a section first"; hint clears and buttons enable after Generate produces output.
- Resonance Engine panel gets a "Select a bar in Learn mode to unlock lick generation" hint that toggles from the shared `lastBarData` state on every bar click.
- Toast container downgraded from `role="alert"` / `aria-live="assertive"` → `role="status"` / `aria-live="polite"`; a wrapper around `showToast()` re-elevates the container to `assertive` only for `type === 'error'`.

---

## Files Modified / Added

| File | Description |
|------|-------------|
| `index.html` | All features above; ~8,000 lines. Single entry point. |
| `js/pitch-processor.js` | AudioWorklet YIN pitch detection processor |
| `service-worker.js` | PWA cache-first service worker |
| `manifest.json` | PWA manifest (name, icons, display mode) |
| `icons/icon.svg` | Treble clef SVG app icon |
| `CLAUDE.md` | This file |

---

## Key Implementation Notes

### `const` vs `window.*`
Top-level `const` declarations in a `<script>` tag are NOT properties of `window`. Accessing them via `window.SONGS`, `window.NOTE_IDX` etc. returns `undefined`. Always access them directly by name from code in the same script scope.

### AlphaTab Module Pattern
`alphaTabNotationModule` is an IIFE that captures `NOTE_IDX`, `SONGS`, `canonicalTuneTitle`, and `TITLE_ALIAS_MAP` from the enclosing scope. All transposition and key-lookup logic must use direct variable access, not `window.*` guards.

### Fretboard Engine String Mapping
`STRING_NOTES = ['E','B','G','D','A','E']` where index 0 = high E (display row 0, top). Engine string number = `6 - si` (display row index). So high E = engine string 6, low E = engine string 1.

### Practice Journal Weighted Random
The `#randomTune` click handler is registered with `{capture: true}` and calls `e.stopImmediatePropagation()` to fire before the original bubble-phase handler. It only acts when session data exists; otherwise it passes through. A `MutationObserver` on `#tuneSel` re-runs `annotateDropdown()` whenever `populateTuneDropdown()` rebuilds the options.

### Service Worker Cache Version
Increment `CACHE = 'cp-songbook-vN'` in `service-worker.js` whenever any app shell file changes. The activate handler deletes all caches not matching the current version string.

### v7.3 Progressive Disclosure — Why `display: revert`
The `[data-modes]` CSS system starts every tagged element at `display: none` and then, via `body[data-active-mode="learn"] [data-modes~="learn"] { display: revert; }`, restores the browser default for the active mode. `revert` is used instead of `block` because many panels (`.playback-bar`, `.global-transport`, `.fb-section`) are flex/grid containers — `display: block` would break their layout. Any legacy JS that writes an inline `style.display = 'block'|'grid'` still wins (inline > CSS), which is intentional: it lets the existing tab-view switcher swap `#sheet` and `#alphatab-container` regardless of the active workflow mode.

### v7.3 Global Transport — Router-Not-Replacer Pattern
The global transport bar never reimplements audio pipelines. `routePlay()` / `routeStop()` call `.click()` on the pre-existing legacy buttons (`#playBtn`, `#headPlayBtn`, `#atMainPlayBtn`, `#resonancePlayBtn`, etc.), which keep their original handlers intact. The legacy buttons themselves are hidden (`display:none`) so users only see the unified transport, but their handlers keep firing exactly as before. Same principle for BPM / Speed: the global inputs write into the legacy inputs and `dispatchEvent()` the corresponding `input` / `change` event so downstream code (metronome, tempo trainer, AlphaTab `api.playbackSpeed`) reacts as it always did.

### v7.3 Duplicate-ID Fix — Renamed, Not Merged
The two `<details>` panels sharing `id="practicePanel"` served different features (session tracker vs drills / suggestions). The fix renames the second to `id="practiceDrillsPanel"` rather than merging the panels, so both features stay intact and the two references in JS (`stopSession`'s refresh gate + the lazy-render `toggle` listener) point at the correct element.

---

## Current Song Count

| Source | Count |
|--------|-------|
| Core SONGS object | 22 |
| OMNIBOOK_ADDITIONS | 44 |
| **Total unique tunes** | **66** |

---

---

## Version Timeline

| Version | Date | Highlights |
|---------|------|------------|
| 7.0 | 2026-04 | Baseline PRO Edition — 22 core SONGS, chord grid, fretboard, Resonance Engine |
| 7.1 | 2026-05 | Accessibility & UX pass — skip link, ARIA live regions, toasts, keyboard shortcuts |
| 7.2 | 2026-05 | AlphaTab notation + Guitar Pro loader; Parker Heads Library grows to 66 tunes; PWA + pitch detection |
| **7.3** | **2026-07-21** | **UX refactor (PR #148)** — workflow modes, unified global transport, standardized `aria-pressed` toggles, duplicate-ID fix, prerequisite hints, toast aria-live tiering |

---

*Last updated: 2026-07-21*  
*Active branch: `claude/ux-ui-audit-analysis-57f4db` (merged as PR #148)*
